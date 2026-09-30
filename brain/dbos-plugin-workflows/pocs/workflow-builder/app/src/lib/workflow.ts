import { z } from 'zod'

export const operationIds = ['add', 'subtract', 'multiply'] as const
export type Operation = typeof operationIds[number]
export type Input = { kind: 'literal'; value: number } | { kind: 'output'; nodeId: string }
export type MathNode = { id: string; op: Operation; x: number; y: number; inputs: { a: Input; b: Input } }
export type Definition = { name: string; nodes: MathNode[]; pauseAfterFirstMs?: number }

const inputSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('literal'), value: z.number().finite() }),
  z.object({ kind: z.literal('output'), nodeId: z.string().min(1) }),
])
const nodeSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
  op: z.enum(operationIds),
  x: z.number().finite(),
  y: z.number().finite(),
  inputs: z.object({ a: inputSchema, b: inputSchema }),
})
const definitionSchema = z.object({ name: z.string().min(1).max(80), nodes: z.array(nodeSchema).min(1).max(30), pauseAfterFirstMs: z.number().int().min(0).max(60000).optional() })

export const catalog: { id: Operation; label: string; symbol: string; description: string }[] = [
  { id: 'add', label: 'Add', symbol: '+', description: 'Add two numbers' },
  { id: 'subtract', label: 'Subtract', symbol: '−', description: 'Subtract the second number' },
  { id: 'multiply', label: 'Multiply', symbol: '×', description: 'Multiply two numbers' },
]

export const starter: Definition = {
  name: 'Math workflow',
  nodes: [
    { id: 'add-1', op: 'add', x: 25, y: 250, inputs: { a: { kind: 'literal', value: 8 }, b: { kind: 'literal', value: 4 } } },
    { id: 'subtract-1', op: 'subtract', x: 245, y: 250, inputs: { a: { kind: 'output', nodeId: 'add-1' }, b: { kind: 'literal', value: 2 } } },
    { id: 'multiply-1', op: 'multiply', x: 465, y: 250, inputs: { a: { kind: 'output', nodeId: 'subtract-1' }, b: { kind: 'literal', value: 3 } } },
  ],
}

export function validateDefinition(value: unknown): Definition {
  const definition = definitionSchema.parse(value)
  const ids = new Set<string>()
  for (const node of definition.nodes) {
    if (ids.has(node.id)) throw new Error(`Duplicate node ID: ${node.id}`)
    ids.add(node.id)
  }
  for (const node of definition.nodes) {
    for (const [port, input] of Object.entries(node.inputs)) {
      if (input.kind === 'output' && !ids.has(input.nodeId)) throw new Error(`${node.id}.${port} references missing node ${input.nodeId}`)
      if (input.kind === 'output' && input.nodeId === node.id) throw new Error(`${node.id} cannot reference itself`)
    }
  }
  orderedNodes(definition)
  return definition
}

export function orderedNodes(definition: Definition): MathNode[] {
  const byId = new Map(definition.nodes.map((node) => [node.id, node]))
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const result: MathNode[] = []
  const visit = (node: MathNode) => {
    if (visited.has(node.id)) return
    if (visiting.has(node.id)) throw new Error('Workflow contains a cycle')
    visiting.add(node.id)
    for (const input of Object.values(node.inputs)) {
      if (input.kind === 'output') {
        const source = byId.get(input.nodeId)
        if (!source) throw new Error(`Missing source ${input.nodeId}`)
        visit(source)
      }
    }
    visiting.delete(node.id)
    visited.add(node.id)
    result.push(node)
  }
  definition.nodes.forEach(visit)
  return result
}
