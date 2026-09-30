import { randomUUID } from 'node:crypto'
import { DBOS } from '@dbos-inc/dbos-sdk'
import pg from 'pg'
import { orderedNodes, validateDefinition, type Definition, type Input } from './workflow'
import { calculate } from './plugins.server'

const databaseUrl = process.env.DBOS_SYSTEM_DATABASE_URL ?? process.env.MATHDB_URI ?? 'postgresql://postgres:math-poc-local@127.0.0.1:55433/math_workflows'
const pool = new pg.Pool({ connectionString: databaseUrl })
let launchPromise: Promise<void> | undefined

const runMath = DBOS.registerWorkflow(async (snapshot: Definition) => {
  const definition = validateDefinition(snapshot)
  const output: Record<string, number> = {}
  for (const [index, node] of orderedNodes(definition).entries()) {
    const resolve = (input: Input) => input.kind === 'literal' ? input.value : output[input.nodeId]
    const a = resolve(node.inputs.a)
    const b = resolve(node.inputs.b)
    output[node.id] = await DBOS.runStep(
      async () => {
        if (index === 0 && process.env.POC_RECOVERY_TRACE === '1') console.log('EXECUTING_FIRST_STEP', DBOS.workflowID)
        return calculate(node.op, a, b)
      },
      { name: `math-${node.id}-${node.op}-v1` },
    )
    if (index === 0 && definition.pauseAfterFirstMs) {
      if (process.env.POC_RECOVERY_TRACE === '1') console.log('FIRST_STEP_CHECKPOINTED', DBOS.workflowID)
      await DBOS.sleep(definition.pauseAfterFirstMs)
    }
  }
  return output
}, { name: 'math-workflow-v1' })

async function ready() {
  if (!launchPromise) {
    launchPromise = (async () => {
      DBOS.setConfig({ name: 'math-workflow-studio', applicationVersion: 'math-poc-v1', systemDatabaseUrl: databaseUrl })
      await DBOS.launch()
      await pool.query(`CREATE TABLE IF NOT EXISTS math_workflow_drafts (
        id text PRIMARY KEY, definition jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
      )`)
      await pool.query(`CREATE TABLE IF NOT EXISTS math_workflow_runs (
        id text PRIMARY KEY, name text NOT NULL, definition jsonb NOT NULL, status text NOT NULL,
        result jsonb, error text, created_at timestamptz NOT NULL DEFAULT now()
      )`)
    })().catch((error) => { launchPromise = undefined; throw error })
  }
  await launchPromise
}

export async function saveDraft(value: Definition) {
  const definition = validateDefinition(value)
  await ready()
  await pool.query(`INSERT INTO math_workflow_drafts (id, definition) VALUES ('current', $1)
    ON CONFLICT (id) DO UPDATE SET definition = EXCLUDED.definition, updated_at = now()`, [definition])
  return { saved: true }
}

export async function loadDraft(): Promise<Definition | null> {
  await ready()
  const result = await pool.query<{ definition: Definition }>(`SELECT definition FROM math_workflow_drafts WHERE id = 'current'`)
  return result.rows[0]?.definition ?? null
}

export type RunRecord = { id: string; name: string; status: string; result: Record<string, number> | null; error: string | null; createdAt: string }
export async function listRuns(): Promise<RunRecord[]> {
  await ready()
  const pending = await pool.query<{ id: string }>(`SELECT id FROM math_workflow_runs WHERE status = 'RUNNING' ORDER BY created_at DESC LIMIT 30`)
  for (const row of pending.rows) {
    const status = await DBOS.getWorkflowStatus(row.id)
    if (status?.status === 'SUCCESS') {
      const result = await DBOS.retrieveWorkflow<Record<string, number>>(row.id).getResult()
      await pool.query(`UPDATE math_workflow_runs SET status = 'SUCCEEDED', result = $2 WHERE id = $1`, [row.id, result])
    } else if (status?.status === 'ERROR') {
      await pool.query(`UPDATE math_workflow_runs SET status = 'FAILED', error = 'DBOS workflow failed' WHERE id = $1`, [row.id])
    }
  }
  const result = await pool.query<{ id: string; name: string; status: string; result: Record<string, number> | null; error: string | null; created_at: Date }>(
    `SELECT id, name, status, result, error, created_at FROM math_workflow_runs ORDER BY created_at DESC LIMIT 30`)
  return result.rows.map((row) => ({ id: row.id, name: row.name, status: row.status, result: row.result, error: row.error, createdAt: row.created_at.toISOString() }))
}

export async function executeDefinition(value: Definition): Promise<RunRecord> {
  const definition = validateDefinition(value)
  await ready()
  const id = randomUUID()
  await pool.query(`INSERT INTO math_workflow_runs (id, name, definition, status) VALUES ($1, $2, $3, 'RUNNING')`, [id, definition.name, definition])
  try {
    const handle = await DBOS.startWorkflow(runMath, { workflowID: id })(definition)
    const result = await handle.getResult()
    await pool.query(`UPDATE math_workflow_runs SET status = 'SUCCEEDED', result = $2 WHERE id = $1`, [id, result])
  } catch (error) {
    await pool.query(`UPDATE math_workflow_runs SET status = 'FAILED', error = $2 WHERE id = $1`, [id, error instanceof Error ? error.message : String(error)])
  }
  const runs = await listRuns()
  return runs.find((run) => run.id === id)!
}
