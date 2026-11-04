import type {
  BloggerBinaryExpressionNode,
  BloggerCallExpressionNode,
  BloggerConditionalExpressionNode,
  BloggerExpressionNode,
  BloggerLambdaExpressionNode,
  BloggerLogicalExpressionNode,
  BloggerUnaryExpressionNode,
} from '../../ast.js'
import type { OperatorContext } from './types.js'
import { evaluateBinaryArithmetic, evaluateCallArithmetic, evaluateUnaryArithmetic } from './arithmetic.js'
import { evaluateBinaryCollection, evaluateCallCollection } from './collection.js'
import { evaluateBinaryComparison, evaluateCallComparison } from './comparison.js'
import { evaluateCallConditional, evaluateConditionalExpression } from './conditional.js'
import { evaluateBinaryFormat, evaluateCallFormat } from './date-transforms.js'
import { evaluateBinaryImageTransform, evaluateCallImageTransform } from './image-transforms.js'
import { evaluateLambda } from './lambda.js'
import { evaluateCallLogical, evaluateLogicalExpression, evaluateUnaryLogical } from './logical.js'
import { evaluateBinaryMembership, evaluateCallMembership } from './membership.js'
import { evaluateBinarySnippet, evaluateCallSnippet } from './text-transforms.js'
import { evaluateBinaryUrlTransform, evaluateCallUrlTransform } from './url-transforms.js'

export function dispatchUnary(node: BloggerUnaryExpressionNode, ctx: OperatorContext): any {
  const arg = ctx.evaluate(node.argument, ctx.locals)
  const logical = evaluateUnaryLogical(node.operator, arg)
  if (logical !== undefined) {
    return logical
  }
  return evaluateUnaryArithmetic(node.operator, arg)
}

export function dispatchLogical(node: BloggerLogicalExpressionNode, ctx: OperatorContext): any {
  return evaluateLogicalExpression(node.operator, node.left, node.right, ctx)
}

export function dispatchConditional(node: BloggerConditionalExpressionNode, ctx: OperatorContext): any {
  return evaluateConditionalExpression(node, ctx)
}

export function dispatchLambda(node: BloggerLambdaExpressionNode, ctx: OperatorContext): any {
  return evaluateLambda(node, ctx)
}

export function dispatchBinary(node: BloggerBinaryExpressionNode, ctx: OperatorContext): any {
  const op = node.operator

  if (op === '+' || op === '-' || op === '*' || op === '/' || op === '%') {
    return evaluateBinaryArithmetic(node, ctx)
  }

  if (
    op === '==' || op === '!=' || op === 'eq' || op === 'neq'
    || op === '===' || op === '!=='
    || op === '<' || op === 'lt' || op === '>' || op === 'gt'
    || op === '<=' || op === 'lte' || op === '>=' || op === 'gte'
  ) {
    const leftVal = ctx.evaluate(node.left, ctx.locals)
    const rightVal = ctx.evaluate(node.right, ctx.locals)
    return evaluateBinaryComparison(op, leftVal, rightVal)
  }

  if (op === 'in' || op === 'not in' || op === 'contains' || op === 'not contains') {
    const leftVal = ctx.evaluate(node.left, ctx.locals)
    const rightVal = ctx.evaluate(node.right, ctx.locals)
    return evaluateBinaryMembership(op, leftVal, rightVal)
  }

  if (op === 'take' || op === 'skip' || op === 'to') {
    const leftVal = ctx.evaluate(node.left, ctx.locals)
    const rightVal = ctx.evaluate(node.right, ctx.locals)
    return evaluateBinaryCollection(op, leftVal, rightVal)
  }

  if (op === 'params' || op === 'appendParams' || op === 'fragment' || op === 'path') {
    const leftVal = ctx.evaluate(node.left, ctx.locals)
    const rightVal = ctx.evaluate(node.right, ctx.locals)
    return evaluateBinaryUrlTransform(op, leftVal, rightVal)
  }

  if (op === 'resizeImage' || op === 'sourceSet') {
    return evaluateBinaryImageTransform(node, ctx)
  }

  if (op === 'format') {
    const leftVal = ctx.evaluate(node.left, ctx.locals)
    const rightVal = ctx.evaluate(node.right, ctx.locals)
    return evaluateBinaryFormat(leftVal, rightVal, ctx.context)
  }

  if (op === 'snippet') {
    const leftVal = ctx.evaluate(node.left, ctx.locals)
    const rightVal = ctx.evaluate(node.right, ctx.locals)
    return evaluateBinarySnippet(leftVal, rightVal)
  }

  return undefined
}

export function dispatchCall(node: BloggerCallExpressionNode, ctx: OperatorContext): any {
  const fn = node.callee
  const args = node.arguments.map((arg: BloggerExpressionNode) => ctx.evaluate(arg, ctx.locals))

  if (fn === '$') {
    return args[0]
  }

  if (fn === 'not' || fn === 'and' || fn === 'or') {
    return evaluateCallLogical(fn, args)
  }

  if (fn === 'eq' || fn === 'neq' || fn === 'lt' || fn === 'gt' || fn === 'lte' || fn === 'gte') {
    return evaluateCallComparison(fn, args)
  }

  if (fn === 'in' || fn === 'contains') {
    return evaluateCallMembership(fn, args)
  }

  if (fn === '?' || fn === '?:') {
    return evaluateCallConditional(fn, args)
  }

  if (fn === 'take' || fn === 'limit' || fn === 'skip' || fn === 'offset') {
    return evaluateCallCollection(fn, args)
  }

  if (fn === '%' || fn === '-' || fn === '+' || fn === '*' || fn === '/') {
    return evaluateCallArithmetic(fn, args)
  }

  if (fn === 'resizeImage' || fn === 'sourceSet') {
    return evaluateCallImageTransform(fn, args)
  }

  if (fn === 'params' || fn === 'appendParams' || fn === 'fragment' || fn === 'path') {
    return evaluateCallUrlTransform(fn, args)
  }

  if (fn === 'format') {
    return evaluateCallFormat(args, ctx.context)
  }

  if (fn === 'snippet') {
    return evaluateCallSnippet(args)
  }

  return undefined
}
