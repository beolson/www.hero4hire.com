import { test } from 'node:test'
import assert from 'node:assert/strict'
import { starter, validateDefinition } from './workflow.ts'
import { evaluate } from './plugins.server.ts'

test('connected math example evaluates all three plugins', () => {
  assert.deepEqual(evaluate(starter), { 'add-1': 12, 'subtract-1': 10, 'multiply-1': 30 })
})
test('a changed hardcoded value changes the graph result', () => {
  const changed = structuredClone(starter)
  changed.nodes[0].inputs.a = { kind: 'literal', value: 5 }
  assert.equal(evaluate(changed)['multiply-1'], 21)
})
test('cycle and unknown plugin are rejected', () => {
  const cycle = structuredClone(starter)
  cycle.nodes[0].inputs.a = { kind: 'output', nodeId: 'multiply-1' }
  assert.throws(() => validateDefinition(cycle), /cycle/i)
  assert.throws(() => validateDefinition({ ...starter, nodes: [{ ...starter.nodes[0], op: 'divide' }] }))
})
