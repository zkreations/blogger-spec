import { isMemberOf } from './helpers.js'

export function evaluateBinaryMembership(op: string, leftVal: any, rightVal: any): boolean | undefined {
  if (op === 'in' || op === 'not in') {
    const inside = isMemberOf(leftVal, rightVal)
    return op === 'in' ? inside : !inside
  }

  if (op === 'contains' || op === 'not contains') {
    const inside = isMemberOf(rightVal, leftVal)
    return op === 'contains' ? inside : !inside
  }

  return undefined
}

export function evaluateCallMembership(fn: string, args: any[]): boolean | undefined {
  if (fn === 'in') {
    return isMemberOf(args[0], args[1])
  }

  if (fn === 'contains') {
    return isMemberOf(args[1], args[0])
  }

  return undefined
}
