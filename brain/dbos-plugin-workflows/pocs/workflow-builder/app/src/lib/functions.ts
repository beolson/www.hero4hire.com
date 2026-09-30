import { createServerFn } from '@tanstack/react-start'
import { catalog, validateDefinition, type Definition } from './workflow'
import { executeDefinition, listRuns, loadDraft, saveDraft } from './runtime.server'

export const getCatalog = createServerFn({ method: 'GET' }).handler(() => catalog)
export const getWorkspace = createServerFn({ method: 'GET' }).handler(async () => ({ draft: await loadDraft(), runs: await listRuns() }))
export const validateWorkflow = createServerFn({ method: 'POST' })
  .validator((data: Definition) => data)
  .handler(({ data }) => { validateDefinition(data); return { valid: true } })
export const saveWorkflow = createServerFn({ method: 'POST' })
  .validator((data: Definition) => data)
  .handler(({ data }) => saveDraft(data))
export const runWorkflow = createServerFn({ method: 'POST' })
  .validator((data: Definition) => data)
  .handler(({ data }) => executeDefinition(data))
