import { describe, expect, it } from 'vitest'
import {
  appendParams,
  dispatchBinary,
  dispatchCall,
  dispatchConditional,
  dispatchLambda,
  dispatchLogical,
  dispatchUnary,
  evaluateBinaryCollection,
  evaluateBinaryComparison,
  evaluateBinaryFormat,
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
  evaluateUnaryArithmetic,
  evaluateUnaryLogical,
  format,
  fragment,
  params,
  path,
  resizeImage,
  snippet,
  sourceSet,
} from '../src/parser/operators/index.js'

describe('modular operators suite', () => {
  const dummyCtx = {
    context: { blog: { locale: 'en-US', timeZone: 'UTC' } },
    evaluate: (node: any) => node.value,
    locals: {},
  }

  describe('arithmetic', () => {
    it('evaluates unary arithmetic correctly', () => {
      expect(evaluateUnaryArithmetic('-', 5)).toBe(-5)
      expect(evaluateUnaryArithmetic('+', '10')).toBe(10)
      expect(evaluateUnaryArithmetic('unknown', 10)).toBeUndefined()
    })

    it('evaluates call arithmetic correctly', () => {
      expect(evaluateCallArithmetic('+', [1, 2, 3])).toBe(6)
      expect(evaluateCallArithmetic('-', [10, 3, 2])).toBe(5)
      expect(evaluateCallArithmetic('-', [7])).toBe(-7)
      expect(evaluateCallArithmetic('*', [2, 3, 4])).toBe(24)
      expect(evaluateCallArithmetic('/', [20, 2, 2])).toBe(5)
      expect(evaluateCallArithmetic('%', [10, 3])).toBe(1)
    })
  })

  describe('comparison', () => {
    it('evaluates binary comparison correctly', () => {
      expect(evaluateBinaryComparison('==', 5, '5')).toBe(true)
      expect(evaluateBinaryComparison('!=', 5, '6')).toBe(true)
      expect(evaluateBinaryComparison('===', 5, '5')).toBe(false)
      expect(evaluateBinaryComparison('!==', 5, '5')).toBe(true)
      expect(evaluateBinaryComparison('<', 3, 5)).toBe(true)
      expect(evaluateBinaryComparison('<=', 5, 5)).toBe(true)
      expect(evaluateBinaryComparison('>', 10, 5)).toBe(true)
      expect(evaluateBinaryComparison('>=', 10, 10)).toBe(true)
    })

    it('evaluates functional call comparison', () => {
      expect(evaluateCallComparison('eq', ['a', 'a'])).toBe(true)
      expect(evaluateCallComparison('neq', ['a', 'b'])).toBe(true)
      expect(evaluateCallComparison('lt', [1, 2])).toBe(true)
      expect(evaluateCallComparison('gt', [2, 1])).toBe(true)
      expect(evaluateCallComparison('lte', [2, 2])).toBe(true)
      expect(evaluateCallComparison('gte', [3, 2])).toBe(true)
    })
  })

  describe('logical', () => {
    it('evaluates unary logical', () => {
      expect(evaluateUnaryLogical('not', false)).toBe(true)
      expect(evaluateUnaryLogical('!', true)).toBe(false)
      expect(evaluateUnaryLogical('other', true)).toBeUndefined()
    })

    it('evaluates functional call logical', () => {
      expect(evaluateCallLogical('not', [false])).toBe(true)
      expect(evaluateCallLogical('and', [true, true, true])).toBe(true)
      expect(evaluateCallLogical('and', [true, false])).toBe(false)
      expect(evaluateCallLogical('or', [false, true])).toBe(true)
      expect(evaluateCallLogical('or', [false, false])).toBe(false)
    })
  })

  describe('conditional', () => {
    it('evaluates functional call conditional', () => {
      expect(evaluateCallConditional('?', [true, 'yes', 'no'])).toBe('yes')
      expect(evaluateCallConditional('?', [false, 'yes', 'no'])).toBe('no')
      expect(evaluateCallConditional('?:', [null, undefined, 'fallback'])).toBe('fallback')
      expect(evaluateCallConditional('?:', ['first', 'second'])).toBe('first')
    })
  })

  describe('collection and membership', () => {
    it('evaluates collection operations', () => {
      expect(evaluateBinaryCollection('take', [1, 2, 3, 4], 2)).toEqual([1, 2])
      expect(evaluateBinaryCollection('skip', [1, 2, 3, 4], 2)).toEqual([3, 4])
      expect(evaluateBinaryCollection('to', 1, 4)).toEqual([1, 2, 3, 4])
      expect(evaluateBinaryCollection('to', 4, 1)).toEqual([4, 3, 2, 1])

      expect(evaluateCallCollection('take', [[1, 2, 3], 1])).toEqual([1])
      expect(evaluateCallCollection('limit', [[1, 2, 3], 2])).toEqual([1, 2])
      expect(evaluateCallCollection('skip', [[1, 2, 3], 1])).toEqual([2, 3])
      expect(evaluateCallCollection('offset', [[1, 2, 3], 2])).toEqual([3])
    })

    it('evaluates membership operations', () => {
      expect(evaluateBinaryMembership('in', 2, [1, 2, 3])).toBe(true)
      expect(evaluateBinaryMembership('not in', 4, [1, 2, 3])).toBe(true)
      expect(evaluateBinaryMembership('contains', [1, 2, 3], 2)).toBe(true)
      expect(evaluateBinaryMembership('not contains', [1, 2, 3], 4)).toBe(true)

      expect(evaluateCallMembership('in', [2, [1, 2, 3]])).toBe(true)
      expect(evaluateCallMembership('contains', [[1, 2, 3], 2])).toBe(true)
    })
  })

  describe('transforms (url, text, image, date)', () => {
    it('transforms URLs correctly', () => {
      expect(params('https://example.com', { a: '1', b: '2' })).toBe('https://example.com?a=1&b=2')
      expect(appendParams('https://example.com?a=1', { b: '2' })).toBe('https://example.com?a=1&b=2')
      expect(fragment('https://example.com', 'section')).toBe('https://example.com#section')
      expect(path('https://example.com/old', '/new')).toBe('https://example.com/new')

      expect(evaluateBinaryUrlTransform('params', 'https://example.com', { q: 'blogger' })).toBe('https://example.com?q=blogger')
      expect(evaluateCallUrlTransform('fragment', ['https://example.com', 'top'])).toBe('https://example.com#top')
    })

    it('transforms text snippets correctly', () => {
      const longText = 'A'.repeat(60)
      expect(snippet(longText, { length: 50 })).toBe(`${'A'.repeat(49)}…`)
      expect(evaluateBinarySnippet('Test paragraph', { length: 50 })).toBe('Test paragraph')
      expect(evaluateCallSnippet(['Test call', { length: 50 }])).toBe('Test call')
    })

    it('transforms images correctly', () => {
      const gUrl = 'https://blogger.googleusercontent.com/img/a/sample=s1600'
      const resized = resizeImage(gUrl, 400)
      expect(String(resized)).toContain('=w400')
      expect(resized.width).toBe(400)
      expect(resized.height).toBe(400)

      const ss = sourceSet(gUrl, [300, 600])
      expect(ss).toContain('300w')
      expect(ss).toContain('600w')

      expect(evaluateCallImageTransform('resizeImage', [gUrl, 500])).toBeDefined()
    })

    it('formats dates correctly', () => {
      const iso = '2026-11-03T12:00:00Z'
      const formatted = format(iso, 'yyyy', 'en', 'UTC')
      expect(formatted).toBe('2026')
      expect(evaluateBinaryFormat(iso, 'yyyy', dummyCtx.context)).toBe('2026')
      expect(evaluateCallFormat([iso, 'yyyy'], dummyCtx.context)).toBe('2026')
    })
  })

  describe('dispatchers', () => {
    it('dispatches unary node', () => {
      const node = { argument: { type: 'Literal', value: false }, operator: 'not', type: 'UnaryExpression' } as any
      expect(dispatchUnary(node, dummyCtx)).toBe(true)
    })

    it('dispatches logical node', () => {
      const node = {
        left: { type: 'Literal', value: true },
        operator: 'and',
        right: { type: 'Literal', value: false },
        type: 'LogicalExpression',
      } as any
      expect(dispatchLogical(node, dummyCtx)).toBe(false)
    })

    it('dispatches conditional node', () => {
      const node = {
        alternate: { type: 'Literal', value: 'no' },
        consequent: { type: 'Literal', value: 'yes' },
        isElvis: false,
        test: { type: 'Literal', value: true },
        type: 'ConditionalExpression',
      } as any
      expect(dispatchConditional(node, dummyCtx)).toBe('yes')
    })

    it('dispatches lambda node', () => {
      const node = {
        body: { type: 'Literal', value: true },
        callee: { type: 'Literal', value: [1, 2, 3] },
        operator: 'count',
        parameter: 'item',
        type: 'LambdaExpression',
      } as any
      expect(dispatchLambda(node, dummyCtx)).toBe(3)
    })

    it('dispatches binary node', () => {
      const node = {
        left: { type: 'Literal', value: 10 },
        operator: '==',
        right: { type: 'Literal', value: 10 },
        type: 'BinaryExpression',
      } as any
      expect(dispatchBinary(node, dummyCtx)).toBe(true)
    })

    it('dispatches call node', () => {
      const node = {
        arguments: [{ type: 'Literal', value: 5 }, { type: 'Literal', value: 5 }],
        callee: 'eq',
        type: 'CallExpression',
      } as any
      expect(dispatchCall(node, dummyCtx)).toBe(true)
    })
  })
})
