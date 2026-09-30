import { orderedNodes, validateDefinition, type Definition, type Input, type Operation } from './workflow'

// Trusted plugins are installed with the server; user definitions contain only IDs and numbers.
const implementations: Record<Operation, (a: number, b: number) => number> = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
  multiply: (a, b) => a * b,
}

export function calculate(op: Operation, a: number, b: number): number {
  const result = implementations[op](a, b)
  if (!Number.isFinite(result)) throw new Error('Operation returned a non-finite number')
  return result
}

export function evaluate(definition: Definition): Record<string, number> {
  const output: Record<string, number> = {}
  for (const node of orderedNodes(validateDefinition(definition))) {
    const resolve = (input: Input) => input.kind === 'literal' ? input.value : output[input.nodeId]
    output[node.id] = calculate(node.op, resolve(node.inputs.a), resolve(node.inputs.b))
  }
  return output
}
