import type { BloggerConditionalExpressionNode } from '../../ast.js'
import type { OperatorContext } from './types.js'
import { isTruthy } from '../../type-system.js'

export function evaluateConditionalExpression(
  node: BloggerConditionalExpressionNode,
  ctx: OperatorContext,
): any {
  const testVal = ctx.evaluate(node.test, ctx.locals)
  if (node.isElvis) {
    return testVal ?? ctx.evaluate(node.consequent, ctx.locals)
  }
  if (isTruthy(testVal)) {
    return ctx.evaluate(node.consequent, ctx.locals)
  }
  return node.alternate ? ctx.evaluate(node.alternate, ctx.locals) : undefined
}

export function evaluateCallConditional(fn: string, args: any[]): any {
  if (fn === '?') {
    return isTruthy(args[0]) ? args[1] : args[2]
  }
  if (fn === '?:') {
    return args.find(a => a !== null && a !== undefined) ?? args[args.length - 1]
  }
  return undefined
}
