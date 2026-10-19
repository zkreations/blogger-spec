import type {
  BloggerBinaryExpressionNode,
  BloggerCallExpressionNode,
  BloggerConditionalExpressionNode,
  BloggerLambdaExpressionNode,
  BloggerMemberExpressionNode,
  BloggerUnaryExpressionNode,
} from '../src/ast.js'
import { describe, expect, it } from 'vitest'
import { getSpecCatalog } from '../src/catalogs/index.js'
import * as RootExports from '../src/index.js'
import {
  analyzeExpressionBudget,
  COMPILER_NESTING_LIMIT,
  COMPILER_QUOTA_LIMIT,
  COMPILER_QUOTA_WARNING,
  countExpressionTokens,
  evaluateExpressionBudget,
  flattenMultilineExpression,
  tokenizeExpression,
  unescapeXmlEntities,
} from '../src/quota.js'
import * as QuotaExports from '../src/quota.js'

describe('compiler token quota suite (BX1021)', () => {
  it('exposes quota constants and helpers from root and submodules', () => {
    expect(COMPILER_QUOTA_LIMIT).toBe(40)
    expect(COMPILER_QUOTA_WARNING).toBe(34)
    expect(COMPILER_NESTING_LIMIT).toBe(50)

    expect(RootExports.countExpressionTokens).toBe(countExpressionTokens)
    expect(RootExports.evaluateExpressionBudget).toBe(evaluateExpressionBudget)
    expect(QuotaExports.countExpressionTokens).toBe(countExpressionTokens)
    expect(QuotaExports.tokenizeExpression).toBe(tokenizeExpression)
  })

  it('counts literals and grouping parentheses correctly', () => {
    expect(countExpressionTokens('1')).toBe(1)
    expect(countExpressionTokens('(1)')).toBe(2)
    expect(countExpressionTokens('((1))')).toBe(3)
    expect(countExpressionTokens('(((1)))')).toBe(4)
  })

  it('counts arithmetic operations with nested parens', () => {
    expect(countExpressionTokens('1 + 2')).toBe(3)
    expect(countExpressionTokens('(1 + 2)')).toBe(4)
    expect(countExpressionTokens('((1 + 2))')).toBe(5)
  })

  it('counts functional prefix operations with zero-cost parens across simple and nested contexts', () => {
    expect(countExpressionTokens('+(1)')).toBe(2)
    expect(countExpressionTokens('+(-1)')).toBe(2)
    expect(countExpressionTokens('-(-1)')).toBe(2)
    expect(countExpressionTokens('+(20, 25)')).toBe(3)
    expect(countExpressionTokens('*(20, 25)')).toBe(3)
    expect(countExpressionTokens('eq(20, 25)')).toBe(3)

    // Nested prefix functional operations have 0-cost parens
    expect(countExpressionTokens('10 + *(20, 25)')).toBe(5)
    expect(countExpressionTokens('data:a and eq(data:b, 10)')).toBe(5)

    // Contrast with infix operations followed by grouping parens (which cost 1)
    expect(countExpressionTokens('10 + (20 * 25)')).toBe(6)
    expect(countExpressionTokens('x eq (y)')).toBe(4)
  })

  it('charges grouping parenthesis when negating expressions with ! or not (non-functional)', () => {
    expect(countExpressionTokens('!true')).toBe(2)
    expect(countExpressionTokens('not true')).toBe(2)
    expect(countExpressionTokens('!(true)')).toBe(3)
    expect(countExpressionTokens('not(true)')).toBe(3)
    expect(countExpressionTokens('not (true)')).toBe(3)
    expect(countExpressionTokens('1 and !(false)')).toBe(5)
  })

  it('counts array and object composite structures correctly', () => {
    expect(countExpressionTokens('[1]')).toBe(2)
    expect(countExpressionTokens('[1, 2]')).toBe(3)
    expect(countExpressionTokens('[[1, 2]]')).toBe(4)
    expect(countExpressionTokens('{a: 1}')).toBe(2)
    expect(countExpressionTokens('{a: 1, b: 2}')).toBe(3)
  })

  it('counts data paths as single tokens regardless of indexing and dynamic brackets', () => {
    expect(countExpressionTokens('data:arr[0]')).toBe(1)
    expect(countExpressionTokens('data:test[data:index].a')).toBe(1)
    expect(countExpressionTokens('data:test[(data:index + 1 - 1)].a')).toBe(1)
  })

  it('counts lambda and collection transformations correctly', () => {
    expect(countExpressionTokens('[1] map (x => x + 1)')).toBe(8)
    expect(countExpressionTokens('[1] map (x => x + 1 + 5)')).toBe(10)
  })

  it('counts native function calls and object options correctly', () => {
    const expr = 'snippet(data:view.description, { length: 50, links: false, linebreaks: false, ellipsis: false })'
    expect(countExpressionTokens(expr)).toBe(7)
    const budget = evaluateExpressionBudget(expr)
    expect(budget.totalTokens).toBe(7)
    expect(budget.isValid).toBe(true)
    expect(budget.status).toBe('SAFE')
  })

  it('flattens multiline expressions canonically without changing token cost', () => {
    const multiline = `snippet(data:view.description, {\n length: 50,\n links: false,\n linebreaks: false,\n ellipsis: false\n})`
    expect(flattenMultilineExpression(multiline)).toBe('snippet(data:view.description, { length: 50, links: false, linebreaks: false, ellipsis: false })')
    expect(countExpressionTokens(multiline)).toBe(7)
  })

  it('decodes XML entities before tokenization', () => {
    expect(unescapeXmlEntities('&quot;hello&quot;')).toBe('"hello"')
    expect(countExpressionTokens('&quot;hello&quot;')).toBe(1)
    expect(countExpressionTokens('data:a &amp;&amp; data:b')).toBe(3)
    expect(countExpressionTokens('[1] map (x =&gt; x + 1)')).toBe(8)
  })

  it('validates exact 40-token limit boundaries (BX1021)', () => {
    const validParens = '(((1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10 + 11 + 12 + 13 + 14 + 15 + 16 + 17 + 18 + 19)))'
    expect(countExpressionTokens(validParens)).toBe(40)
    const validParensResult = evaluateExpressionBudget(validParens)
    expect(validParensResult.isValid).toBe(true)
    expect(validParensResult.status).toBe('WARNING')

    const validArray = `[${Array.from({ length: 39 }, (_, i) => i + 1).join(', ')}]`
    expect(countExpressionTokens(validArray)).toBe(40)
    expect(evaluateExpressionBudget(validArray).isValid).toBe(true)

    const invalidArray = `[${Array.from({ length: 40 }, (_, i) => i + 1).join(', ')}]`
    expect(countExpressionTokens(invalidArray)).toBe(41)
    const invalidArrayResult = evaluateExpressionBudget(invalidArray)
    expect(invalidArrayResult.isValid).toBe(false)
    expect(invalidArrayResult.status).toBe('EXCEEDED')

    const safeExpr = 'data:view.isPost ? data:post.title : data:blog.title'
    const safeResult = analyzeExpressionBudget(safeExpr)
    expect(safeResult.status).toBe('SAFE')
    expect(safeResult.isValid).toBe(true)
  })

  it('calculates token counts directly from AST nodes', () => {
    const binaryNode: BloggerBinaryExpressionNode = {
      type: 'BinaryExpression',
      operator: '+',
      left: { type: 'Literal', value: 1 },
      right: { type: 'Literal', value: 2 },
      precedence: 10,
    }
    expect(countExpressionTokens(binaryNode)).toBe(3)

    const callNode: BloggerCallExpressionNode = {
      type: 'CallExpression',
      callee: 'snippet',
      arguments: [
        { type: 'DataPath', raw: 'data:post.body', root: 'data', members: [{ property: 'post', computed: false }, { property: 'body', computed: false }] },
        {
          type: 'ObjectExpression',
          properties: [
            { type: 'Property', key: 'length', value: { type: 'Literal', value: 50 } },
          ],
        },
      ],
    }
    // snippet (1) + data:post.body (1) + ObjectExpression ({ (1) + length value 50 (1)) = 4
    expect(countExpressionTokens(callNode)).toBe(4)

    const lambdaNode: BloggerLambdaExpressionNode = {
      type: 'LambdaExpression',
      callee: {
        type: 'ArrayExpression',
        elements: [{ type: 'Literal', value: 1 }],
      },
      operator: 'map',
      parameter: 'x',
      body: {
        type: 'BinaryExpression',
        operator: '+',
        left: { type: 'Identifier', name: 'x' },
        right: { type: 'Literal', value: 1 },
        precedence: 10,
      },
    }
    // Array [1] (2) + lambda op 'map' (1) + param 'x' (1) + '=>' (1) + body 'x + 1' (3) = 8
    expect(countExpressionTokens(lambdaNode)).toBe(8)

    const elvisNode: BloggerConditionalExpressionNode = {
      type: 'ConditionalExpression',
      test: { type: 'DataPath', raw: 'data:title', root: 'data', members: [{ property: 'title', computed: false }] },
      consequent: { type: 'Literal', value: 'Default' },
      isElvis: true,
    }
    // test (1) + consequent (1) + elvis op (1) = 3
    expect(countExpressionTokens(elvisNode)).toBe(3)

    const ternaryNode: BloggerConditionalExpressionNode = {
      type: 'ConditionalExpression',
      test: { type: 'DataPath', raw: 'data:view.isPost', root: 'data', members: [{ property: 'view', computed: false }, { property: 'isPost', computed: false }] },
      consequent: { type: 'Literal', value: 'Post' },
      alternate: { type: 'Literal', value: 'Page' },
      isElvis: false,
    }
    // test (1) + consequent (1) + alternate (1) + ternary ops '?' and ':' (2) = 5
    expect(countExpressionTokens(ternaryNode)).toBe(5)

    const memberNode: BloggerMemberExpressionNode = {
      type: 'MemberExpression',
      object: { type: 'DataPath', raw: 'data:title', root: 'data', members: [{ property: 'title', computed: false }] },
      property: { type: 'Identifier', name: 'length' },
      computed: false,
    }
    // object (1) + member (1) = 2
    expect(countExpressionTokens(memberNode)).toBe(2)

    const unaryNode: BloggerUnaryExpressionNode = {
      type: 'UnaryExpression',
      operator: '!',
      argument: { type: 'Literal', value: true },
      prefix: true,
    }
    // op (1) + argument (1) = 2
    expect(countExpressionTokens(unaryNode)).toBe(2)
  })

  it('counts native transformation functional invocations with zero-cost parens (path, params, etc.)', () => {
    expect(countExpressionTokens('format(data:blog.date, \'YYYY\')')).toBe(3)
    expect(countExpressionTokens('path(data:blog.url, \'/search\')')).toBe(3)
    expect(countExpressionTokens('params(data:blog.url, { a: 1 })')).toBe(4)
    expect(countExpressionTokens('appendParams(data:blog.url, { q: \'blogger\' })')).toBe(4)
    expect(countExpressionTokens('fragment(data:blog.url, \'top\')')).toBe(3)
  })

  it('handles empty or blank expressions safely', () => {
    expect(countExpressionTokens('')).toBe(0)
    expect(countExpressionTokens('   ')).toBe(0)
    expect(tokenizeExpression('').length).toBe(0)
  })

  it('respects injected custom SpecCatalog instance in evaluateExpressionBudget', () => {
    const customCatalog = getSpecCatalog()
    const result = evaluateExpressionBudget('1 + 2', customCatalog)
    expect(result.isValid).toBe(true)
    expect(result.status).toBe('SAFE')
  })

  it('guarantees exact numerical parity between countExpressionTokens and tokenizeExpression tokensConsumed', () => {
    const expressions = [
      '1 + 2 * 3',
      'data:posts filter (p => p.id == 123)',
      'data:view.isPost ? "Post" : "Other"',
      'data:post.title ?: "Default Title"',
      '{ a: 1, b: [10, 20, 30] }',
      '-(10 + 20)',
      '!data:blog.isMobile and data:view.isMultipleItems',
      'format(data:blog.date, "YYYY-MM-DD")',
    ]

    for (const expr of expressions) {
      const tokens = tokenizeExpression(expr)
      const expectedSum = tokens.reduce((acc, t) => acc + t.tokensConsumed, 0)
      expect(countExpressionTokens(expr)).toBe(expectedSum)
    }
  })
})
