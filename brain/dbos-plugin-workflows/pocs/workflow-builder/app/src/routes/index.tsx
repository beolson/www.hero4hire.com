import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ReactFlow, Background, ConnectionMode, Controls, Handle, MiniMap, Position, useNodesState, type Connection, type Edge, type Node, type NodeProps } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { catalog, starter, type Definition, type Input, type MathNode, type Operation } from '../lib/workflow'
import { getCatalog, getWorkspace, runWorkflow, saveWorkflow, validateWorkflow } from '../lib/functions'
import type { RunRecord } from '../lib/runtime.server'

export const Route = createFileRoute('/')({ component: Studio })

function MathCard({ data, selected }: NodeProps<Node<{ node: MathNode; value?: number }>>) {
  const item = catalog.find((plugin) => plugin.id === data.node.op)!
  return <div className={`math-card ${selected ? 'selected' : ''}`}>
    <Handle type="target" position={Position.Left} id="a" style={{ top: 57 }} />
    <Handle type="target" position={Position.Left} id="b" style={{ top: 91 }} />
    <div className="math-card-head"><span className={`op-icon ${item.id}`}>{item.symbol}</span><div><strong>{item.label}</strong><small>{item.description}</small></div></div>
    <div className="math-card-input">a <span>{inputText(data.node.inputs.a)}</span></div>
    <div className="math-card-input">b <span>{inputText(data.node.inputs.b)}</span></div>
    {data.value !== undefined && <div className="math-card-result">Output <strong>{data.value}</strong></div>}
    <Handle type="source" position={Position.Right} id="output" />
  </div>
}
function DecisionCard({ data }: NodeProps<Node<{ positive?: boolean }>>) {
  return <div className="decision"><Handle type="target" position={Position.Left} id="input" /><span>Result &gt; 0?</span><Handle type="source" position={Position.Right} id="yes" style={{ top: 18 }} /><Handle type="source" position={Position.Right} id="no" style={{ top: 62 }} /></div>
}
function OutcomeCard({ data }: NodeProps<Node<{ label: string; active?: boolean; positive: boolean }>>) {
  return <div className={`outcome ${data.positive ? 'positive' : 'negative'} ${data.active ? 'active' : ''}`}><Handle type="target" position={Position.Left} id="input" /><span>{data.positive ? '✓' : '−'}</span><div><strong>{data.label}</strong><small>{data.active ? 'Selected by the latest run' : 'Branch outcome'}</small></div></div>
}
const nodeTypes = { math: MathCard, decision: DecisionCard, outcome: OutcomeCard }
function inputText(input: Input) { return input.kind === 'literal' ? String(input.value) : `← ${input.nodeId}` }
function message(error: unknown) { return error instanceof Error ? error.message : String(error) }

function Studio() {
  const [availableCatalog, setAvailableCatalog] = useState(catalog)
  const [definition, setDefinition] = useState<Definition>(starter)
  const [selectedId, setSelectedId] = useState<string>('add-1')
  const [runs, setRuns] = useState<RunRecord[]>([])
  const [activeRun, setActiveRun] = useState<RunRecord | null>(null)
  const [notice, setNotice] = useState('Ready to edit')
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [runSearch, setRunSearch] = useState('')
  const [tab, setTab] = useState<'parameters' | 'details'>('parameters')
  const [showMarkup, setShowMarkup] = useState(false)
  const [markup, setMarkup] = useState('')
  const [flow, setFlow] = useState<any>(null)
  const selected = definition.nodes.find((node) => node.id === selectedId)
  const last = definition.nodes.at(-1)
  const lastValue = last && activeRun?.result?.[last.id]
  const positive = lastValue === undefined ? undefined : lastValue > 0

  useEffect(() => {
    getCatalog().then(setAvailableCatalog).catch((error) => setNotice(`Catalog unavailable: ${message(error)}`))
    getWorkspace().then(({ draft, runs }) => { if (draft) setDefinition(draft); setRuns(runs); setActiveRun(runs[0] ?? null) }).catch((error) => setNotice(`Database unavailable: ${message(error)}`))
  }, [])

  const flowNodes = useMemo<Node[]>(() => {
    const mathNodes = definition.nodes.map((node) => ({ id: node.id, type: 'math', selected: node.id === selectedId, position: { x: node.x, y: node.y }, data: { node, value: activeRun?.result?.[node.id] } }))
    const x = Math.max(...definition.nodes.map((node) => node.x), 0) + 230
    return [...mathNodes,
      { id: 'decision', type: 'decision', position: { x, y: 260 }, data: { positive }, draggable: false, selectable: false },
      { id: 'yes', type: 'outcome', position: { x: x + 170, y: 170 }, data: { label: 'Positive result', positive: true, active: positive === true }, draggable: false, selectable: false },
      { id: 'no', type: 'outcome', position: { x: x + 170, y: 335 }, data: { label: 'Zero or negative', positive: false, active: positive === false }, draggable: false, selectable: false },
    ]
  }, [definition, activeRun, positive, selectedId])
  const flowEdges = useMemo<Edge[]>(() => {
    const connected: Edge[] = definition.nodes.flatMap((node) => (['a', 'b'] as const).flatMap((port) => {
      const input = node.inputs[port]
      return input.kind === 'output' ? [{ id: `${input.nodeId}-${node.id}-${port}`, source: input.nodeId, sourceHandle: 'output', target: node.id, targetHandle: port, type: 'smoothstep', animated: false }] : []
    }))
    if (last) connected.push({ id: 'to-decision', source: last.id, sourceHandle: 'output', target: 'decision', targetHandle: 'input', type: 'smoothstep' })
    connected.push({ id: 'yes-edge', source: 'decision', sourceHandle: 'yes', target: 'yes', targetHandle: 'input', type: 'smoothstep', label: 'Yes' })
    connected.push({ id: 'no-edge', source: 'decision', sourceHandle: 'no', target: 'no', targetHandle: 'input', type: 'smoothstep', label: 'No' })
    return connected
  }, [definition, last])
  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes)
  useEffect(() => setNodes(flowNodes), [flowNodes, setNodes])

  const connect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || !['a', 'b'].includes(connection.targetHandle ?? '')) return
    if (!definition.nodes.some((node) => node.id === connection.source)) return
    const port = connection.targetHandle as 'a' | 'b'
    const changed: Definition = { ...definition, nodes: definition.nodes.map((node) => node.id === connection.target ? { ...node, inputs: { ...node.inputs, [port]: { kind: 'output', nodeId: connection.source! } } } : node) }
    setDefinition(changed)
    setActiveRun(null)
    setNotice(`${connection.source} connected to ${connection.target}.${port}`)
  }, [definition])

  function updateNode(id: string, update: (node: MathNode) => MathNode) {
    setDefinition((current) => ({ ...current, nodes: current.nodes.map((node) => node.id === id ? update(node) : node) }))
    setActiveRun(null)
  }
  function addNode(op: Operation, position?: { x: number; y: number }) {
    const id = `${op}-${Math.random().toString(36).slice(2, 8)}`
    setDefinition((current) => ({ ...current, nodes: [...current.nodes, { id, op, x: position?.x ?? Math.max(...current.nodes.map((node) => node.x)) + 220, y: position?.y ?? 250, inputs: { a: { kind: 'literal', value: 0 }, b: { kind: 'literal', value: 0 } } }] }))
    setSelectedId(id)
    setActiveRun(null)
  }
  async function perform(action: 'validate' | 'save' | 'run') {
    setBusy(true)
    try {
      if (action === 'validate') { await validateWorkflow({ data: definition }); setNotice('All connections and values are valid') }
      if (action === 'save') { await saveWorkflow({ data: definition }); setNotice('Workflow saved') }
      if (action === 'run') {
        const run = await runWorkflow({ data: definition })
        setRuns((current) => [run, ...current])
        setActiveRun(run)
        setNotice(run.status === 'SUCCEEDED' ? `Run completed: ${run.result?.[definition.nodes.at(-1)?.id ?? '']}` : `Run failed: ${run.error}`)
      }
    } catch (error) { setNotice(message(error)) }
    finally { setBusy(false) }
  }
  function exportDefinition() {
    const blob = new Blob([JSON.stringify(definition, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = 'math-workflow.json'; anchor.click(); URL.revokeObjectURL(url)
  }
  async function importDefinition(file: File | undefined) {
    if (!file) return
    try { const value = JSON.parse(await file.text()); await validateWorkflow({ data: value }); setDefinition(value); setSelectedId(value.nodes[0].id); setActiveRun(null); setNotice('Workflow imported') }
    catch (error) { setNotice(`Import rejected: ${message(error)}`) }
  }
  const filteredRuns = runs.filter((run) => `${run.name} ${run.id} ${run.status}`.toLowerCase().includes(runSearch.toLowerCase()))
  const filteredCatalog = availableCatalog.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(search.toLowerCase()))

  return <div className="studio">
    <header className="topbar"><div className="brand">Math Workflow Studio</div><div className="breadcrumb">Workflows <span>›</span> {definition.name}</div><div className="top-tabs"><button className={!showMarkup ? 'active' : ''} onClick={() => setShowMarkup(false)}>Canvas</button><button className={showMarkup ? 'active' : ''} onClick={() => { setMarkup(JSON.stringify(definition, null, 2)); setShowMarkup(true) }}>Markup</button></div><div className="top-actions"><button onClick={() => perform('save')} disabled={busy}>▣ &nbsp;Save</button><button className="primary" onClick={() => perform('run')} disabled={busy}>▷ &nbsp;{busy ? 'Working…' : 'Run'}</button><button onClick={exportDefinition} title="Export JSON">⋯</button></div></header>
    <aside className="runs-panel"><h2>Past runs</h2><div className="search"><span>⌕</span><input aria-label="Search runs" placeholder="Search runs..." value={runSearch} onChange={(event) => setRunSearch(event.target.value)} /></div><div className="runs-list">{filteredRuns.length ? filteredRuns.map((run) => <button className={`run-item ${activeRun?.id === run.id ? 'chosen' : ''}`} key={run.id} onClick={() => setActiveRun(run)}><span className={`run-icon ${run.status.toLowerCase()}`}>{run.status === 'SUCCEEDED' ? '✓' : run.status === 'RUNNING' ? '◌' : '×'}</span><span className="run-summary"><strong>{new Date(run.createdAt).toLocaleString()}</strong><small>Run #{run.id.slice(0, 8)} · {run.name}</small></span><span className={`badge ${run.status.toLowerCase()}`}>{run.status}</span></button>) : <p className="empty-runs">No runs yet. Select Run to execute the math workflow.</p>}</div></aside>
    <main className="canvas-panel">{showMarkup ? <div className="markup-panel"><div className="markup-head"><h2>Workflow markup</h2><p>Edit JSON and apply it to the canvas.</p></div><textarea aria-label="Workflow markup" value={markup} onChange={(event) => setMarkup(event.target.value)} /><button className="primary" onClick={async () => { try { const value = JSON.parse(markup); await validateWorkflow({ data: value }); setDefinition(value); setShowMarkup(false); setNotice('Markup applied') } catch (error) { setNotice(`Markup rejected: ${message(error)}`) } }}>Apply markup</button></div> : <ReactFlow nodes={nodes} edges={flowEdges} nodeTypes={nodeTypes} onInit={setFlow} onNodesChange={onNodesChange} onNodeClick={(_, node) => { if (definition.nodes.some((item) => item.id === node.id)) setSelectedId(node.id) }} onNodeDragStop={(_, node) => updateNode(node.id, (item) => ({ ...item, x: node.position.x, y: node.position.y }))} onConnect={connect} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }} onDrop={(event) => { event.preventDefault(); const op = event.dataTransfer.getData('application/math-operation') as Operation; if (catalog.some((item) => item.id === op)) addNode(op, flow?.screenToFlowPosition({ x: event.clientX, y: event.clientY })) }} fitView fitViewOptions={{ padding: 0.12 }} minZoom={0.35} maxZoom={1.5} connectionMode={ConnectionMode.Loose}><Background color="#d6e3f5" gap={24} size={1} /><Controls showInteractive={false} /><MiniMap nodeColor={(node) => node.type === 'math' ? '#1f55f5' : '#94a3b8'} pannable zoomable /></ReactFlow>}<div className="canvas-notice" role="status">{notice}</div></main>
    <aside className="right-panel"><div className="palette"><h2>Nodes</h2><div className="search"><span>⌕</span><input aria-label="Search nodes" placeholder="Search nodes..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="section-title">◇ &nbsp; Math operations <span>⌃</span></div>{filteredCatalog.map((item) => <button className="palette-item" key={item.id} draggable onDragStart={(event) => event.dataTransfer.setData('application/math-operation', item.id)} onClick={() => addNode(item.id)}><span className={`op-icon ${item.id}`}>{item.symbol}</span><span><strong>{item.label}</strong><small>{item.description}</small></span></button>)}</div><div className="inspector"><div className="inspector-head"><span className={`op-icon ${selected?.op ?? 'add'}`}>{catalog.find((item) => item.id === selected?.op)?.symbol ?? '+'}</span><div><h2>{catalog.find((item) => item.id === selected?.op)?.label ?? 'Select a node'}</h2><small>{selected?.id ?? 'Choose a math node on the canvas'}</small></div></div><div className="inspector-tabs"><button className={tab === 'parameters' ? 'active' : ''} onClick={() => setTab('parameters')}>Parameters</button><button className={tab === 'details' ? 'active' : ''} onClick={() => setTab('details')}>Details</button></div>{selected && (tab === 'parameters' ? <div className="fields">{(['a', 'b'] as const).map((port) => <div className="field" key={port}><label>Input {port.toUpperCase()} <em>*</em></label><select value={selected.inputs[port].kind} onChange={(event) => updateNode(selected.id, (node) => ({ ...node, inputs: { ...node.inputs, [port]: event.target.value === 'literal' ? { kind: 'literal', value: 0 } : { kind: 'output', nodeId: definition.nodes.find((item) => item.id !== node.id)?.id ?? node.id } } }))}><option value="literal">Hardcoded number</option><option value="output">Node output</option></select>{selected.inputs[port].kind === 'literal' ? <input type="number" aria-label={`Input ${port.toUpperCase()} value`} value={selected.inputs[port].value} onChange={(event) => updateNode(selected.id, (node) => ({ ...node, inputs: { ...node.inputs, [port]: { kind: 'literal', value: Number(event.target.value) } } }))} /> : <select aria-label={`Input ${port.toUpperCase()} source`} value={selected.inputs[port].nodeId} onChange={(event) => updateNode(selected.id, (node) => ({ ...node, inputs: { ...node.inputs, [port]: { kind: 'output', nodeId: event.target.value } } }))}>{definition.nodes.filter((item) => item.id !== selected.id).map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}</select>}</div>)}<div className="field"><label>Latest output</label><div className="output-value">{activeRun?.result?.[selected.id] ?? '—'}</div></div><div className="inspector-actions"><button onClick={() => perform('validate')} disabled={busy}>✓ Validate</button><button onClick={() => { setDefinition((current) => ({ ...current, nodes: current.nodes.filter((item) => item.id !== selected.id) })); setSelectedId(definition.nodes.find((item) => item.id !== selected.id)?.id ?? '') }} disabled={definition.nodes.length === 1}>Remove node</button></div></div> : <div className="fields"><div className="field"><label>Node ID</label><div className="output-value">{selected.id}</div></div><div className="field"><label>Plugin version</label><div className="output-value">{selected.op}@1</div></div><p className="hint">Connect outputs to A or B on another node, or enter a number directly.</p></div>)}<div className="inspector-footer"><label className="import-button">Import JSON<input type="file" accept="application/json,.json" onChange={(event) => importDefinition(event.target.files?.[0])} hidden /></label><span>● {notice.startsWith('All') || notice === 'Ready to edit' ? 'All changes look valid' : notice}</span></div></div></aside>
  </div>
}
