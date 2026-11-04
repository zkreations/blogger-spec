import type { BloggerLambdaExpressionNode } from '../../ast.js'
import type { OperatorContext } from './types.js'
import { isTruthy } from '../../type-system.js'

export function evaluateLambda(
  node: BloggerLambdaExpressionNode,
  ctx: OperatorContext,
): any {
  const collection = ctx.evaluate(node.callee, ctx.locals)
  const items = Array.isArray(collection) ? collection : []
  const param = node.parameter

  switch (node.operator) {
    case 'filter':
    case 'where':
      return items.filter(item => isTruthy(ctx.evaluate(node.body, { ...ctx.locals, [param]: item })))

    case 'map':
    case 'select':
      return items.map(item => ctx.evaluate(node.body, { ...ctx.locals, [param]: item }))

    case 'count':
      return items.filter(item => isTruthy(ctx.evaluate(node.body, { ...ctx.locals, [param]: item }))).length

    case 'any':
      return items.some(item => isTruthy(ctx.evaluate(node.body, { ...ctx.locals, [param]: item })))

    case 'all':
      return items.every(item => isTruthy(ctx.evaluate(node.body, { ...ctx.locals, [param]: item })))

    case 'none':
      return items.every(item => !isTruthy(ctx.evaluate(node.body, { ...ctx.locals, [param]: item })))

    case 'first':
      return items.find(item => isTruthy(ctx.evaluate(node.body, { ...ctx.locals, [param]: item })))

    default:
      return undefined
  }
}
