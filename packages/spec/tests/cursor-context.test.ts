import { describe, expect, it } from 'vitest'
import { getExpressionCursorContext } from '../src/parser/cursor-context.js'

describe('expression Cursor Context Analyzer', () => {
  it('identifies member navigation after dot', () => {
    const expr = 'data:posts filter (p => p.'
    const ctx = getExpressionCursorContext(expr, 26)

    expect(ctx.leftOperand).toBe('p')
    expect(ctx.expectedKind).toBe('member')
    expect(ctx.partialMember).toBe('')
    expect(ctx.enclosingLambda?.paramName).toBe('p')
  })

  it('identifies partial member prefix after dot', () => {
    const expr = 'data:posts filter (p => p.au'
    const ctx = getExpressionCursorContext(expr, 28)

    expect(ctx.leftOperand).toBe('p')
    expect(ctx.expectedKind).toBe('member')
    expect(ctx.partialMember).toBe('au')
  })

  it('identifies deep member chaining', () => {
    const expr = 'data:posts filter (p => p.author.'
    const ctx = getExpressionCursorContext(expr, expr.length)

    expect(ctx.leftOperand).toBe('p.author')
    expect(ctx.expectedKind).toBe('member')
    expect(ctx.memberChain).toEqual(['author'])
  })

  it('supports nested lambdas and parent scope tracking', () => {
    const expr = 'data:posts filter (p => p.labels any (l => l.'
    const ctx = getExpressionCursorContext(expr, expr.length)

    expect(ctx.leftOperand).toBe('l')
    expect(ctx.expectedKind).toBe('member')
    expect(ctx.enclosingLambda?.paramName).toBe('l')

    const exprOuter = 'data:posts filter (p => p.labels any (l => p.'
    const ctxOuter = getExpressionCursorContext(exprOuter, exprOuter.length)
    expect(ctxOuter.leftOperand).toBe('p')
  })

  it('detects lambda waiting for parameter name before arrow', () => {
    const exprOpen = 'data:posts first ('
    const ctx = getExpressionCursorContext(exprOpen, exprOpen.length)

    expect(ctx.expectedKind).toBe('lambda_param')
    expect(ctx.enclosingLambda?.isWaitingParam).toBe(true)
    expect(ctx.enclosingLambda?.collectionOperand).toBe('data:posts')
  })

  it('detects parameter typed waiting for arrow =>', () => {
    const exprParam = 'data:posts first (p '
    const ctx = getExpressionCursorContext(exprParam, exprParam.length)

    expect(ctx.expectedKind).toBe('lambda_arrow')
    expect(ctx.enclosingLambda?.paramName).toBe('p')
    expect(ctx.enclosingLambda?.isWaitingForArrow).toBe(true)
  })

  it('identifies partial operator typing', () => {
    const expr = 'data:posts filt'
    const ctx = getExpressionCursorContext(expr, expr.length)

    expect(ctx.expectedKind).toBe('operator')
    expect(ctx.leftOperand).toBe('data:posts')
    expect(ctx.partialOperator).toBe('filt')
  })

  it('identifies elvis operator expecting right expression', () => {
    const expr = 'data:view.description ?: '
    const ctx = getExpressionCursorContext(expr, expr.length)

    expect(ctx.expectedKind).toBe('expression')
    expect(ctx.leftOperand).toBe('data:view.description')
    expect(ctx.partialOperator).toBe('?:')
  })

  it('identifies ternary operator expecting expression', () => {
    const expr = 'data:post.hasOlderPage ? "Yes" : '
    const ctx = getExpressionCursorContext(expr, expr.length)

    expect(ctx.expectedKind).toBe('expression')
  })

  it('extracts parenthesized complex expression as left operand', () => {
    const exprParen = '(data:posts.first).tit'
    const ctx = getExpressionCursorContext(exprParen, exprParen.length)

    expect(ctx.leftOperand).toBe('(data:posts.first)')
    expect(ctx.partialMember).toBe('tit')
    expect(ctx.expectedKind).toBe('member')

    const exprDeep = '((data:posts.first).author).name'
    const ctxDeep = getExpressionCursorContext(exprDeep, exprDeep.length)
    expect(ctxDeep.leftOperand).toBe('((data:posts.first).author)')
    expect(ctxDeep.partialMember).toBe('name')
  })
})
