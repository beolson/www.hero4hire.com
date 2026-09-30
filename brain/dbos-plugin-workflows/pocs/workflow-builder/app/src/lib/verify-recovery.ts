import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const command = process.execPath
const args = ['--import', 'tsx', 'src/lib/recovery-worker.ts']
const env = { ...process.env, POC_RECOVERY_TRACE: '1' }
const first = spawn(command, [...args, 'start'], { env, stdio: ['ignore', 'pipe', 'pipe'] })
let firstOutput = ''
let id: string | undefined
first.stdout.on('data', (chunk) => {
  firstOutput += chunk.toString()
  const match = firstOutput.match(/FIRST_STEP_CHECKPOINTED\s+([0-9a-f-]{36})/)
  if (match && !id) {
    id = match[1]
    first.kill('SIGKILL')
  }
})
first.stderr.on('data', (chunk) => { firstOutput += chunk.toString() })
await new Promise<void>((resolve, reject) => {
  first.on('exit', () => id ? resolve() : reject(new Error(`Worker ended before checkpoint: ${firstOutput}`)))
  first.on('error', reject)
})
console.log('KILLED_AFTER_CHECKPOINT', id)
const second = spawn(command, [...args, 'recover', id!], { env, stdio: ['ignore', 'pipe', 'pipe'] })
let secondOutput = ''
second.stdout.on('data', (chunk) => { secondOutput += chunk.toString() })
second.stderr.on('data', (chunk) => { secondOutput += chunk.toString() })
const exit = await Promise.race([
  new Promise<number | null>((resolve, reject) => { second.on('exit', resolve); second.on('error', reject) }),
  delay(45000).then(() => { second.kill('SIGKILL'); return -1 }),
])
if (exit !== 0) throw new Error(`Recovery worker failed: ${secondOutput}`)
if (!secondOutput.includes(`RECOVERED ${id}`)) throw new Error(`No recovered result: ${secondOutput}`)
if (secondOutput.includes('EXECUTING_FIRST_STEP')) throw new Error('Completed first step was invoked again')
console.log('RECOVERY_VERIFIED', id)
