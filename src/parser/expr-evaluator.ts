import type {
  BloggerDataPathNode,
  BloggerExpressionNode,
  BloggerIdentifierNode,
} from '../ast.js'
import { parseExpression } from './expr-parser.js'
import {
  applyModifier,
  dispatchBinary,
  dispatchCall,
  dispatchConditional,
  dispatchLambda,
  dispatchLogical,
  dispatchUnary,
  hasDataProperty,
} from './operators/index.js'

export {
  appendParams,
  applyModifier,
  BloggerDivisionByZeroError,
  compareRelational,
  dispatchBinary,
  dispatchCall,
  dispatchConditional,
  dispatchLambda,
  dispatchLogical,
  dispatchUnary,
  evaluateBinaryArithmetic,
  evaluateBinaryCollection,
  evaluateBinaryComparison,
  evaluateBinaryFormat,
  evaluateBinaryImageTransform,
  evaluateBinaryMembership,
  evaluateBinarySnippet,
  evaluateBinaryUrlTransform,
  evaluateCallArithmetic,
  evaluateCallCollection,
  evaluateCallComparison,
  evaluateCallConditional,
  evaluateCallFormat,
  evaluateCallImageTransform,
  evaluateCallLogical,
  evaluateCallMembership,
  evaluateCallSnippet,
  evaluateCallUrlTransform,
  evaluateConditionalExpression,
  evaluateLambda,
  evaluateLogicalExpression,
  evaluateUnaryArithmetic,
  evaluateUnaryLogical,
  extractYouTubeVideoId,
  format,
  fragment,
  hasDataProperty,
  isEqual,
  isMemberOf,
  isStringLike,
  type OperatorContext,
  params,
  path,
  resizeImage,
  snippet,
  sourceSet,
  unboxScalar,
} from './operators/index.js'

export class ExpressionEvaluator {
  evaluate(
    node: BloggerExpressionNode,
    context: Record<string, any> = {},
    locals: Record<string, any> = {},
  ): any {
    switch (node.type) {
      case 'Literal':
        return node.value

      case 'Identifier': {
        const name = node.name
        if (name === 'true')
          return true
        if (name === 'false')
          return false
        if (name === 'null')
          return null
        if (name in locals)
          return locals[name]
        if (name in context)
          return context[name]
        return undefined
      }

      case 'DataPath': {
        return this.evaluateDataPath(node, context, locals)
      }

      case 'MemberExpression': {
        const obj = this.evaluate(node.object, context, locals)
        if (obj === null || obj === undefined)
          return undefined

        let propName: any
        if (node.computed) {
          propName = this.evaluate(node.property as BloggerExpressionNode, context, locals)
        }
        else {
          propName = (node.property as BloggerIdentifierNode).name
        }

        if (typeof obj === 'object' && hasDataProperty(obj, propName)) {
          return obj[propName]
        }
        if (Array.isArray(obj) && typeof propName === 'string') {
          const found = obj.find((el: any) => el && typeof el === 'object' && el.name === propName)
          if (found !== undefined) {
            return found
          }
        }
        return applyModifier(obj, String(propName))
      }

      case 'UnaryExpression': {
        return dispatchUnary(node, {
          context,
          evaluate: (n, l) => this.evaluate(n, context, l ?? locals),
          locals,
        })
      }

      case 'BinaryExpression': {
        return dispatchBinary(node, {
          context,
          evaluate: (n, l) => this.evaluate(n, context, l ?? locals),
          locals,
        })
      }

      case 'LogicalExpression': {
        return dispatchLogical(node, {
          context,
          evaluate: (n, l) => this.evaluate(n, context, l ?? locals),
          locals,
        })
      }

      case 'ConditionalExpression': {
        return dispatchConditional(node, {
          context,
          evaluate: (n, l) => this.evaluate(n, context, l ?? locals),
          locals,
        })
      }

      case 'LambdaExpression': {
        return dispatchLambda(node, {
          context,
          evaluate: (n, l) => this.evaluate(n, context, l ?? locals),
          locals,
        })
      }

      case 'CallExpression': {
        return dispatchCall(node, {
          context,
          evaluate: (n, l) => this.evaluate(n, context, l ?? locals),
          locals,
        })
      }

      case 'ArrayExpression':
        return node.elements.map(el => this.evaluate(el, context, locals))

      case 'ObjectExpression': {
        const obj: Record<string, any> = {}
        for (const prop of node.properties) {
          obj[prop.key] = this.evaluate(prop.value, context, locals)
        }
        return obj
      }

      default:
        return undefined
    }
  }

  private evaluateDataPath(
    node: BloggerDataPathNode,
    context: Record<string, any>,
    locals: Record<string, any>,
  ): any {
    const raw = node.raw || ''
    const cleanPath = raw.startsWith('data:') ? raw.slice(5) : raw
    const members = node.members || []

    let current: any
    let startIndex = 0

    if (members.length > 0) {
      const firstProp = members[0].property
      if (firstProp in locals) {
        current = locals[firstProp]
        startIndex = 1
      }
      else if (context.data && typeof context.data === 'object' && firstProp in context.data) {
        current = context.data[firstProp]
        startIndex = 1
      }
      else if (context.this && typeof context.this === 'object' && firstProp in context.this) {
        current = context.this[firstProp]
        startIndex = 1
      }
      else if (firstProp in context) {
        current = context[firstProp]
        startIndex = 1
      }
      else if (`data:${firstProp}` in context) {
        current = context[`data:${firstProp}`]
        startIndex = 1
      }
      else if (cleanPath in context) {
        return context[cleanPath]
      }
      else if (raw in context) {
        return context[raw]
      }
      else {
        return undefined
      }
    }
    else {
      if ('data' in locals) {
        return locals.data
      }
      if ('data' in context) {
        return context.data
      }
      if ('data:' in context) {
        return context['data:']
      }
      if (cleanPath && cleanPath in context) {
        return context[cleanPath]
      }
      if (raw in context) {
        return context[raw]
      }
      return undefined
    }

    let parent: any = null
    for (let i = startIndex; i < members.length; i++) {
      if (current === null || current === undefined)
        return undefined

      const m = members[i]
      const propKey = m.computed
        ? this.evaluate(m.expression as BloggerExpressionNode, context, locals)
        : m.property

      let next: any
      if (typeof current === 'object' && hasDataProperty(current, propKey)) {
        next = current[propKey]
      }
      else if (Array.isArray(current) && typeof propKey === 'string') {
        const found = current.find((el: any) => el && typeof el === 'object' && el.name === propKey)
        if (found !== undefined) {
          next = found
        }
        else {
          next = applyModifier(current, String(propKey))
        }
      }
      else if (propKey === 'iso8601' && parent && typeof parent === 'object' && parent.publishedIso) {
        next = String(parent.publishedIso).replace(/\.\d{3}/, '')
      }
      else {
        next = applyModifier(current, String(propKey))
      }
      parent = current
      current = next
    }

    return current
  }
}

export function evaluateExpression(
  exprOrNode: string | BloggerExpressionNode,
  context?: Record<string, any>,
): any {
  const evaluator = new ExpressionEvaluator()
  if (typeof exprOrNode === 'string') {
    const ast = parseExpression(exprOrNode)
    return evaluator.evaluate(ast, context || {})
  }
  return evaluator.evaluate(exprOrNode, context || {})
}
