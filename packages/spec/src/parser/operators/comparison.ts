import { compareRelational, isEqual } from './helpers.js'

export function evaluateBinaryComparison(
  op: string,
  leftVal: any,
  rightVal: any,
): boolean | undefined {
  if (op === '==' || op === '!=' || op === 'eq' || op === 'neq') {
    const eq = isEqual(leftVal, rightVal)
    return (op === '==' || op === 'eq') ? eq : !eq
  }

  if (op === '===' || op === '!==') {
    return op === '===' ? leftVal === rightVal : leftVal !== rightVal
  }

  if (op === '<' || op === 'lt' || op === '>' || op === 'gt' || op === '<=' || op === 'lte' || op === '>=' || op === 'gte') {
    const { l, r } = compareRelational(leftVal, rightVal)
    if (op === '<' || op === 'lt')
      return l < r
    if (op === '>' || op === 'gt')
      return l > r
    if (op === '<=' || op === 'lte')
      return l <= r
    if (op === '>=' || op === 'gte')
      return l >= r
  }

  return undefined
}

export function evaluateCallComparison(
  fn: string,
  args: readonly any[],
): boolean | undefined {
  if (fn === 'eq') {
    return isEqual(args[0], args[1])
  }

  if (fn === 'neq') {
    return !isEqual(args[0], args[1])
  }

  if (fn === 'lt') {
    const { l, r } = compareRelational(args[0], args[1])
    return l < r
  }

  if (fn === 'gt') {
    const { l, r } = compareRelational(args[0], args[1])
    return l > r
  }

  if (fn === 'lte') {
    const { l, r } = compareRelational(args[0], args[1])
    return l <= r
  }

  if (fn === 'gte') {
    const { l, r } = compareRelational(args[0], args[1])
    return l >= r
  }

  return undefined
}
