import type { BloggerExpressionNode } from '../../ast.js'
import type { OperatorContext } from './types.js'
import { isTruthy } from '../../type-system.js'

export function evaluateUnaryLogical(
  op: string,
  arg: any,
): boolean | undefined {
  if (op === 'not' || op === '!') {
    return !isTruthy(arg)
  }
  return undefined
}

export function evaluateLogicalExpression(
  op: string,
  leftNode: BloggerExpressionNode,
  rightNode: BloggerExpressionNode,
  ctx: OperatorContext,
): any {
  const left = ctx.evaluate(leftNode)
  if (op === '&&' || op === 'and') {
    return isTruthy(left) ? ctx.evaluate(rightNode) : left
  }
  if (op === '||' || op === 'or') {
    return isTruthy(left) ? left : ctx.evaluate(rightNode)
  }
  return undefined
}

export function evaluateCallLogical(
  fn: string,
  args: readonly any[],
): boolean | undefined {
  if (fn === 'not') {
    return !isTruthy(args[0])
  }

  if (fn === 'and') {
    return args.every(a => isTruthy(a))
  }

  if (fn === 'or') {
    return args.some(a => isTruthy(a))
  }

  return undefined
}
