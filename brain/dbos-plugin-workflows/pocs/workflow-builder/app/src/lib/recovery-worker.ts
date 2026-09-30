import { executeDefinition, listRuns } from './runtime.server'
import { starter } from './workflow'

if (process.argv[2] === 'start') {
  await executeDefinition({ ...starter, name: 'Recovery check', pauseAfterFirstMs: 12000 })
} else if (process.argv[2] === 'recover') {
  const id = process.argv[3]
  for (let attempt = 0; attempt < 30; attempt++) {
    const run = (await listRuns()).find((item) => item.id === id)
    if (run?.status === 'SUCCEEDED') {
      if (run.result?.['multiply-1'] !== 30) throw new Error(`Unexpected recovery output: ${JSON.stringify(run)}`)
      console.log('RECOVERED', id, JSON.stringify(run.result))
      process.exit(0)
    }
    if (run?.status === 'FAILED') throw new Error(run.error ?? 'Recovery failed')
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error(`Recovery timed out for ${id}`)
} else {
  throw new Error('Expected start or recover')
}
