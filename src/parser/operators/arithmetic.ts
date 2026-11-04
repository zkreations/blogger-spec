import type { BloggerBinaryExpressionNode, BloggerLiteralNode } from '../../ast.js'
import type { OperatorContext } from './types.js'
import { BloggerDivisionByZeroError, isStringLike } from './helpers.js'

export function evaluateUnaryArithmetic(op: string, arg: any): number | undefined {
  if (op === '-')
    return -Number(arg)
  if (op === '+')
    return +Number(arg)
  return undefined
}

export function evaluateBinaryArithmetic(
  node: BloggerBinaryExpressionNode,
  ctx: OperatorContext,
): any {
  const op = node.operator

  if (op === '+') {
    const isLeftLiteralString = node.left.type === 'Literal' && typeof (node.left as BloggerLiteralNode).value === 'string'
    const isRightLiteralString = node.right.type === 'Literal' && typeof (node.right as BloggerLiteralNode).value === 'string'

    const leftVal = ctx.evaluate(node.left)
    const rightVal = ctx.evaluate(node.right)

    // Literal string forces concatenation
    if (isLeftLiteralString || isRightLiteralString) {
      return String(leftVal ?? '') + String(rightVal ?? '')
    }

    // Check if both are numeric (either numbers or numeric strings from variables)
    const leftNum = leftVal !== null && leftVal !== '' && !Number.isNaN(Number(leftVal)) ? Number(leftVal) : null
    const rightNum = rightVal !== null && rightVal !== '' && !Number.isNaN(Number(rightVal)) ? Number(rightVal) : null

    if (leftNum !== null && rightNum !== null && typeof leftVal !== 'boolean' && typeof rightVal !== 'boolean') {
      return leftNum + rightNum
    }

    return String(leftVal ?? '') + String(rightVal ?? '')
  }

  if (op === '-' || op === '*' || op === '/' || op === '%') {
    const leftVal = Number(ctx.evaluate(node.left))
    const rightVal = Number(ctx.evaluate(node.right))

    if (op === '-')
      return leftVal - rightVal
    if (op === '*')
      return leftVal * rightVal
    if (op === '/') {
      if (rightVal === 0) {
        throw new BloggerDivisionByZeroError('Division by zero in expression evaluation')
      }
      return leftVal / rightVal
    }
    if (op === '%') {
      if (rightVal === 0) {
        throw new BloggerDivisionByZeroError('Modulo by zero in expression evaluation')
      }
      return leftVal % rightVal
    }
  }

  return undefined
}

export function evaluateCallArithmetic(
  fn: string,
  args: readonly any[],
): any {
  if (fn === '+') {
    if (args.length === 0)
      return 0
    const hasString = args.some(a => isStringLike(a))
    if (hasString) {
      return args.map(a => String(a ?? '')).join('')
    }
    return args.reduce((acc, curr) => acc + Number(curr), 0)
  }

  if (fn === '-') {
    if (args.length === 1)
      return -Number(args[0])
    return args.slice(1).reduce((acc, curr) => acc - Number(curr), Number(args[0]))
  }

  if (fn === '*') {
    return args.reduce((acc, curr) => acc * Number(curr), 1)
  }

  if (fn === '/') {
    return args.slice(1).reduce((acc, curr) => {
      const d = Number(curr)
      if (d === 0) {
        throw new BloggerDivisionByZeroError('Division by zero in functional operator /')
      }
      return acc / d
    }, Number(args[0]))
  }

  if (fn === '%') {
    const d = Number(args[1])
    if (d === 0) {
      throw new BloggerDivisionByZeroError('Division by zero in functional operator %')
    }
    return Number(args[0]) % d
  }

  return undefined
}
