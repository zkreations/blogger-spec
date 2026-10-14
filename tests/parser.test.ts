import type {
  BloggerBinaryExpressionNode,
  BloggerCallExpressionNode,
  BloggerConditionalExpressionNode,
  BloggerDataPathNode,
  BloggerLambdaExpressionNode,
  BloggerLiteralNode,
  BloggerLogicalExpressionNode,
  BloggerMemberExpressionNode,
  BloggerUnaryExpressionNode,
} from '../src/ast.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ExpressionParser, parseExpression, tokenize } from '../src/ast.js'
import * as HelpersExports from '../src/helpers.js'
import * as RootExports from '../src/index.js'

describe('canonical pratt expression parser (blogger-spec/ast)', () => {
  it('exposes parseExpression, tokenize and classes from ast, helpers and root', () => {
    expect(parseExpression).toBeDefined()
    expect(tokenize).toBeDefined()
    expect(ExpressionParser).toBeDefined()

    expect(HelpersExports.parseExpression).toBeDefined()
    expect(HelpersExports.tokenize).toBeDefined()

    expect(RootExports.parseExpression).toBeDefined()
    expect(RootExports.tokenize).toBeDefined()
  })

  describe('literals & primitives', () => {
    it('parses numeric integer and decimal literals', () => {
      const intNode = parseExpression('42') as BloggerLiteralNode
      expect(intNode.type).toBe('Literal')
      expect(intNode.value).toBe(42)
      expect(intNode.raw).toBe('42')

      const floatNode = parseExpression('3.1415') as BloggerLiteralNode
      expect(floatNode.type).toBe('Literal')
      expect(floatNode.value).toBe(3.1415)
      expect(floatNode.raw).toBe('3.1415')
    })

    it('parses literal negative numbers', () => {
      const negNode = parseExpression('-10') as BloggerLiteralNode
      expect(negNode.type).toBe('Literal')
      expect(negNode.value).toBe(-10)
      expect(negNode.raw).toBe('-10')
    })

    it('parses string literals with single and double quotes and escapes', () => {
      const strDouble = parseExpression('"hello world"') as BloggerLiteralNode
      expect(strDouble.type).toBe('Literal')
      expect(strDouble.value).toBe('hello world')

      const strSingle = parseExpression('\'blogger\'') as BloggerLiteralNode
      expect(strSingle.type).toBe('Literal')
      expect(strSingle.value).toBe('blogger')

      const strEscaped = parseExpression('"hello \\"escaped\\""') as BloggerLiteralNode
      expect(strEscaped.type).toBe('Literal')
      expect(strEscaped.value).toBe('hello "escaped"')
    })

    it('parses boolean and null literals', () => {
      const trueNode = parseExpression('true') as BloggerLiteralNode
      expect(trueNode.type).toBe('Literal')
      expect(trueNode.value).toBe(true)

      const falseNode = parseExpression('false') as BloggerLiteralNode
      expect(falseNode.type).toBe('Literal')
      expect(falseNode.value).toBe(false)

      const nullNode = parseExpression('null') as BloggerLiteralNode
      expect(nullNode.type).toBe('Literal')
      expect(nullNode.value).toBeNull()
    })
  })

  describe('data paths (data:...)', () => {
    it('parses simple data paths', () => {
      const node = parseExpression('data:blog') as BloggerDataPathNode
      expect(node.type).toBe('DataPath')
      expect(node.root).toBe('data')
      expect(node.raw).toBe('data:blog')
      expect(node.members).toEqual([{ property: 'blog', computed: false }])
    })

    it('parses nested dot member data paths', () => {
      const node = parseExpression('data:post.author.name') as BloggerDataPathNode
      expect(node.type).toBe('DataPath')
      expect(node.root).toBe('data')
      expect(node.raw).toBe('data:post.author.name')
      expect(node.members).toEqual([
        { property: 'post', computed: false },
        { property: 'author', computed: false },
        { property: 'name', computed: false },
      ])
    })

    it('parses bracket indexed data paths', () => {
      const node = parseExpression('data:posts[0].title') as BloggerDataPathNode
      expect(node.type).toBe('DataPath')
      expect(node.root).toBe('data')
      expect(node.raw).toBe('data:posts[0].title')
      expect(node.members[0]).toEqual({ property: 'posts', computed: false })
      expect(node.members[1]?.computed).toBe(true)
      expect(node.members[1]?.property).toBe('0')
      expect(node.members[2]).toEqual({ property: 'title', computed: false })
    })

    it('parses dynamic bracket expression indexing in data paths', () => {
      const node = parseExpression('data:posts[data:i + 1].title') as BloggerDataPathNode
      expect(node.type).toBe('DataPath')
      expect(node.members[1]?.computed).toBe(true)
      expect(node.members[1]?.expression?.type).toBe('BinaryExpression')
    })

    it('parses hyphenated property names in skin and theme paths', () => {
      const node = parseExpression('data:skin.vars.body-font') as BloggerDataPathNode
      expect(node.type).toBe('DataPath')
      expect(node.members[2]?.property).toBe('body-font')
    })
  })

  describe('arithmetic & precedence hierarchy', () => {
    it('respects multiplicative over additive precedence (2 + 3 * 4)', () => {
      const node = parseExpression('2 + 3 * 4') as BloggerBinaryExpressionNode
      expect(node.type).toBe('BinaryExpression')
      expect(node.operator).toBe('+')
      expect(node.precedence).toBe(3)
      expect((node.left as BloggerLiteralNode).value).toBe(2)

      const right = node.right as BloggerBinaryExpressionNode
      expect(right.type).toBe('BinaryExpression')
      expect(right.operator).toBe('*')
      expect(right.precedence).toBe(2)
      expect((right.left as BloggerLiteralNode).value).toBe(3)
      expect((right.right as BloggerLiteralNode).value).toBe(4)
    })

    it('respects grouping parentheses over operator precedence ((2 + 3) * 4)', () => {
      const node = parseExpression('(2 + 3) * 4') as BloggerBinaryExpressionNode
      expect(node.type).toBe('BinaryExpression')
      expect(node.operator).toBe('*')
      expect(node.precedence).toBe(2)

      const left = node.left as BloggerBinaryExpressionNode
      expect(left.type).toBe('BinaryExpression')
      expect(left.operator).toBe('+')
      expect((left.left as BloggerLiteralNode).value).toBe(2)
      expect((left.right as BloggerLiteralNode).value).toBe(3)
      expect((node.right as BloggerLiteralNode).value).toBe(4)
    })

    it('maintains left-associativity for subtraction and division (10 - 5 - 2)', () => {
      const node = parseExpression('10 - 5 - 2') as BloggerBinaryExpressionNode
      expect(node.type).toBe('BinaryExpression')
      expect(node.operator).toBe('-')

      const left = node.left as BloggerBinaryExpressionNode
      expect(left.type).toBe('BinaryExpression')
      expect(left.operator).toBe('-')
      expect((left.left as BloggerLiteralNode).value).toBe(10)
      expect((left.right as BloggerLiteralNode).value).toBe(5)
      expect((node.right as BloggerLiteralNode).value).toBe(2)
    })
  })

  describe('relational, slices & comparisons', () => {
    it('parses symbolic comparison operators (==, !=, <, >, <=, >=)', () => {
      const eq = parseExpression('5 == 5') as BloggerBinaryExpressionNode
      expect(eq.type).toBe('BinaryExpression')
      expect(eq.operator).toBe('==')
      expect(eq.precedence).toBe(4)

      const gt = parseExpression('10 > 5') as BloggerBinaryExpressionNode
      expect(gt.type).toBe('BinaryExpression')
      expect(gt.operator).toBe('>')
    })

    it('parses textual relational operators (eq, neq, lt, gt, lte, gte)', () => {
      const eqText = parseExpression('data:view.type eq "item"') as BloggerBinaryExpressionNode
      expect(eqText.type).toBe('BinaryExpression')
      expect(eqText.operator).toBe('eq')
      expect(eqText.precedence).toBe(4)

      const ltText = parseExpression('data:count lt 10') as BloggerBinaryExpressionNode
      expect(ltText.type).toBe('BinaryExpression')
      expect(ltText.operator).toBe('lt')
    })

    it('parses collection slices and range operators (take, skip, to)', () => {
      const takeNode = parseExpression('data:posts take 5') as BloggerBinaryExpressionNode
      expect(takeNode.type).toBe('BinaryExpression')
      expect(takeNode.operator).toBe('take')
      expect(takeNode.precedence).toBe(4)

      const skipNode = parseExpression('data:numbers skip 2') as BloggerBinaryExpressionNode
      expect(skipNode.type).toBe('BinaryExpression')
      expect(skipNode.operator).toBe('skip')

      const toNode = parseExpression('1 to 10') as BloggerBinaryExpressionNode
      expect(toNode.type).toBe('BinaryExpression')
      expect(toNode.operator).toBe('to')
      expect((toNode.left as BloggerLiteralNode).value).toBe(1)
      expect((toNode.right as BloggerLiteralNode).value).toBe(10)
    })

    it('parses transform operators (params, fragment, format)', () => {
      const fragNode = parseExpression('data:post.url fragment "comments"') as BloggerBinaryExpressionNode
      expect(fragNode.type).toBe('BinaryExpression')
      expect(fragNode.operator).toBe('fragment')
      expect(fragNode.precedence).toBe(3)

      const formatNode = parseExpression('data:post.date format "YYYY"') as BloggerBinaryExpressionNode
      expect(formatNode.type).toBe('BinaryExpression')
      expect(formatNode.operator).toBe('format')
    })
  })

  describe('logical expressions & unary operations', () => {
    it('parses binary logical operators (&&, ||, and, or)', () => {
      const andNode = parseExpression('true and false') as BloggerLogicalExpressionNode
      expect(andNode.type).toBe('LogicalExpression')
      expect(andNode.operator).toBe('and')

      const orNode = parseExpression('data:isPost || data:isPage') as BloggerLogicalExpressionNode
      expect(orNode.type).toBe('LogicalExpression')
      expect(orNode.operator).toBe('||')
    })

    it('parses prefix unary operators (! and not)', () => {
      const bangNode = parseExpression('!data:view.isPost') as BloggerUnaryExpressionNode
      expect(bangNode.type).toBe('UnaryExpression')
      expect(bangNode.operator).toBe('!')
      expect(bangNode.prefix).toBe(true)
      expect(bangNode.argument.type).toBe('DataPath')

      const notNode = parseExpression('not true') as BloggerUnaryExpressionNode
      expect(notNode.type).toBe('UnaryExpression')
      expect(notNode.operator).toBe('not')
      expect(notNode.prefix).toBe(true)
    })

    it('respects precedence between comparison and logical operators (data:a > 5 and data:b < 10)', () => {
      const node = parseExpression('data:a > 5 and data:b < 10') as BloggerLogicalExpressionNode
      expect(node.type).toBe('LogicalExpression')
      expect(node.operator).toBe('and')
      expect((node.left as BloggerBinaryExpressionNode).operator).toBe('>')
      expect((node.right as BloggerBinaryExpressionNode).operator).toBe('<')
    })
  })

  describe('elvis & ternary expressions', () => {
    it('parses elvis operator (?:)', () => {
      const node = parseExpression('data:post.title ?: "Sin título"') as BloggerConditionalExpressionNode
      expect(node.type).toBe('ConditionalExpression')
      expect(node.isElvis).toBe(true)
      expect(node.test.type).toBe('DataPath')
      expect((node.consequent as BloggerLiteralNode).value).toBe('Sin título')
      expect(node.alternate).toBeUndefined()
    })

    it('parses full ternary operator (? :)', () => {
      const node = parseExpression('data:view.isPost ? "Post" : "Page"') as BloggerConditionalExpressionNode
      expect(node.type).toBe('ConditionalExpression')
      expect(node.isElvis).toBe(false)
      expect(node.test.type).toBe('DataPath')
      expect((node.consequent as BloggerLiteralNode).value).toBe('Post')
      expect((node.alternate as BloggerLiteralNode).value).toBe('Page')
    })

    it('honors right-associativity of elvis (a ?: b ?: c)', () => {
      const node = parseExpression('data:a ?: data:b ?: data:c') as BloggerConditionalExpressionNode
      expect(node.type).toBe('ConditionalExpression')
      expect(node.isElvis).toBe(true)
      expect(node.test.type).toBe('DataPath')

      const inner = node.consequent as BloggerConditionalExpressionNode
      expect(inner.type).toBe('ConditionalExpression')
      expect(inner.isElvis).toBe(true)
    })

    it('honors empirical primary coalescence precedence of elvis over arithmetic (* and +)', () => {
      const multNode = parseExpression('5 ?: 2 * 10') as BloggerBinaryExpressionNode
      expect(multNode.type).toBe('BinaryExpression')
      expect(multNode.operator).toBe('*')
      expect((multNode.left as BloggerConditionalExpressionNode).type).toBe('ConditionalExpression')
      expect((multNode.left as BloggerConditionalExpressionNode).isElvis).toBe(true)
      expect(((multNode.left as BloggerConditionalExpressionNode).test as BloggerLiteralNode).value).toBe(5)
      expect(((multNode.left as BloggerConditionalExpressionNode).consequent as BloggerLiteralNode).value).toBe(2)
      expect((multNode.right as BloggerLiteralNode).value).toBe(10)

      const concatNode = parseExpression('"A" ?: "B" + "C"') as BloggerBinaryExpressionNode
      expect(concatNode.type).toBe('BinaryExpression')
      expect(concatNode.operator).toBe('+')
      expect((concatNode.left as BloggerConditionalExpressionNode).type).toBe('ConditionalExpression')
      expect((concatNode.left as BloggerConditionalExpressionNode).isElvis).toBe(true)

      const ternaryNode = parseExpression('true ? 2 : 3 + 10') as BloggerConditionalExpressionNode
      expect(ternaryNode.type).toBe('ConditionalExpression')
      expect(ternaryNode.isElvis).toBe(false)
      expect((ternaryNode.test as BloggerLiteralNode).value).toBe(true)
      expect((ternaryNode.consequent as BloggerLiteralNode).value).toBe(2)
      expect((ternaryNode.alternate as BloggerBinaryExpressionNode).type).toBe('BinaryExpression')
      expect((ternaryNode.alternate as BloggerBinaryExpressionNode).operator).toBe('+')
    })
  })

  describe('collections & lambdas', () => {
    it('parses filter lambdas (array filter (p => p.id == 1))', () => {
      const node = parseExpression('data:posts filter (p => p.id == 1)') as BloggerLambdaExpressionNode
      expect(node.type).toBe('LambdaExpression')
      expect(node.operator).toBe('filter')
      expect(node.parameter).toBe('p')
      expect(node.callee.type).toBe('DataPath')
      expect(node.body.type).toBe('BinaryExpression')
      expect((node.body as BloggerBinaryExpressionNode).operator).toBe('==')
    })

    it('parses count, map and any lambdas', () => {
      const countNode = parseExpression('data:posts count (p => p.comments > 0)') as BloggerLambdaExpressionNode
      expect(countNode.type).toBe('LambdaExpression')
      expect(countNode.operator).toBe('count')
      expect(countNode.parameter).toBe('p')

      const mapNode = parseExpression('data:posts map (p => p.title)') as BloggerLambdaExpressionNode
      expect(mapNode.type).toBe('LambdaExpression')
      expect(mapNode.operator).toBe('map')

      const anyNode = parseExpression('data:posts any (p => p.hasJumpLink)') as BloggerLambdaExpressionNode
      expect(anyNode.type).toBe('LambdaExpression')
      expect(anyNode.operator).toBe('any')
    })

    it('parses collection pipeline chaining with slices (posts filter (...) take 5)', () => {
      const node = parseExpression('data:posts filter (p => p.comments > 0) take 5') as BloggerBinaryExpressionNode
      expect(node.type).toBe('BinaryExpression')
      expect(node.operator).toBe('take')
      expect(node.left.type).toBe('LambdaExpression')
      expect((node.right as BloggerLiteralNode).value).toBe(5)
    })
  })

  describe('function calls & composite literals', () => {
    it('parses native function calls (resizeImage, format, snippet)', () => {
      const call = parseExpression('resizeImage(data:img, 600, "16:9")') as BloggerCallExpressionNode
      expect(call.type).toBe('CallExpression')
      expect(call.callee).toBe('resizeImage')
      expect(call.arguments.length).toBe(3)
      expect(call.arguments[0]?.type).toBe('DataPath')
      expect((call.arguments[1] as BloggerLiteralNode).value).toBe(600)
      expect((call.arguments[2] as BloggerLiteralNode).value).toBe('16:9')
    })

    it('parses functional operators across arithmetic, relational, logical, and nullish symbols', () => {
      const plusCall = parseExpression('+(1, 2)') as BloggerCallExpressionNode
      expect(plusCall.type).toBe('CallExpression')
      expect(plusCall.callee).toBe('+')
      expect(plusCall.arguments.length).toBe(2)

      const minusCall = parseExpression('-(20, 10)') as BloggerCallExpressionNode
      expect(minusCall.type).toBe('CallExpression')
      expect(minusCall.callee).toBe('-')
      expect(minusCall.arguments.length).toBe(2)

      const eqCall = parseExpression('==(10, 10)') as BloggerCallExpressionNode
      expect(eqCall.type).toBe('CallExpression')
      expect(eqCall.callee).toBe('==')

      const neqCall = parseExpression('!=(10, 20)') as BloggerCallExpressionNode
      expect(neqCall.type).toBe('CallExpression')
      expect(neqCall.callee).toBe('!=')

      const ltCall = parseExpression('<(10, 20)') as BloggerCallExpressionNode
      expect(ltCall.type).toBe('CallExpression')
      expect(ltCall.callee).toBe('<')

      const gtCall = parseExpression('>(20, 10)') as BloggerCallExpressionNode
      expect(gtCall.type).toBe('CallExpression')
      expect(gtCall.callee).toBe('>')

      const lteCall = parseExpression('<=(20, 20)') as BloggerCallExpressionNode
      expect(lteCall.type).toBe('CallExpression')
      expect(lteCall.callee).toBe('<=')

      const gteCall = parseExpression('>=(20, 20)') as BloggerCallExpressionNode
      expect(gteCall.type).toBe('CallExpression')
      expect(gteCall.callee).toBe('>=')

      const andCall = parseExpression('&&(true, true)') as BloggerCallExpressionNode
      expect(andCall.type).toBe('CallExpression')
      expect(andCall.callee).toBe('&&')

      const orCall = parseExpression('||(false, true)') as BloggerCallExpressionNode
      expect(orCall.type).toBe('CallExpression')
      expect(orCall.callee).toBe('||')

      const elvisCall = parseExpression('?:(data:any, "Fallback")') as BloggerCallExpressionNode
      expect(elvisCall.type).toBe('CallExpression')
      expect(elvisCall.callee).toBe('?:')
    })

    it('parses array and object expressions', () => {
      const arr = parseExpression('[1, 2, 3]') as any
      expect(arr.type).toBe('ArrayExpression')
      expect(arr.elements.length).toBe(3)

      const obj = parseExpression('{ length: 50, links: false }') as any
      expect(obj.type).toBe('ObjectExpression')
      expect(obj.properties.length).toBe(2)
      expect(obj.properties[0]?.key).toBe('length')
      expect(obj.properties[1]?.key).toBe('links')
    })

    it('parses member access on identifiers and parenthesized expressions', () => {
      const member = parseExpression('(data:view.title).length') as BloggerMemberExpressionNode
      expect(member.type).toBe('MemberExpression')
      expect(member.object.type).toBe('DataPath')
      expect((member.property as any).name).toBe('length')
      expect(member.computed).toBe(false)
    })

    it('parses infix transform operators (resizeImage, sourceSet, params, appendParams)', () => {
      const resizeInfix = parseExpression('data:cdnImg resizeImage 240') as BloggerBinaryExpressionNode
      expect(resizeInfix.type).toBe('BinaryExpression')
      expect(resizeInfix.operator).toBe('resizeImage')
      expect(resizeInfix.precedence).toBe(3)

      const sourceSetInfix = parseExpression('data:cdnImg sourceSet [320, 640]') as BloggerBinaryExpressionNode
      expect(sourceSetInfix.type).toBe('BinaryExpression')
      expect(sourceSetInfix.operator).toBe('sourceSet')
      expect(sourceSetInfix.precedence).toBe(3)

      const paramsInfix = parseExpression('data:baseUri params { m: "1", hl: "es" }') as BloggerBinaryExpressionNode
      expect(paramsInfix.type).toBe('BinaryExpression')
      expect(paramsInfix.operator).toBe('params')
      expect(paramsInfix.precedence).toBe(3)

      const appendParamsInfix = parseExpression('"https://mi-blog.blogspot.com/?a=1" appendParams { b: "2" }') as BloggerBinaryExpressionNode
      expect(appendParamsInfix.type).toBe('BinaryExpression')
      expect(appendParamsInfix.operator).toBe('appendParams')
      expect(appendParamsInfix.precedence).toBe(3)
    })

    it('correctly associates format precedence higher than relational equality', () => {
      const relNode = parseExpression('data:realDate format "yyyy" == "2026"') as BloggerBinaryExpressionNode
      expect(relNode.type).toBe('BinaryExpression')
      expect(relNode.operator).toBe('==')
      expect(relNode.left.type).toBe('BinaryExpression')
      expect((relNode.left as BloggerBinaryExpressionNode).operator).toBe('format')
      expect((relNode.left as BloggerBinaryExpressionNode).precedence).toBe(3)
      expect(relNode.precedence).toBe(4)
    })
  })

  describe('error handling', () => {
    it('throws on empty expression', () => {
      expect(() => parseExpression('')).toThrow('Empty expression cannot be parsed')
      expect(() => parseExpression('   ')).toThrow('Empty expression cannot be parsed')
    })

    it('throws on unclosed delimiter', () => {
      expect(() => parseExpression('(1 + 2')).toThrow(/Expected '\)'/)
      expect(() => parseExpression('[1, 2')).toThrow(/Expected '\]'/)
      expect(() => parseExpression('{ a: 1')).toThrow(/Expected '\}'/)
    })

    it('throws on unexpected trailing tokens', () => {
      expect(() => parseExpression('1 + 2 3')).toThrow(/Unexpected token/)
    })
  })

  describe('conformance against real empirical expression fixtures', () => {
    const fixtureFiles = [
      'fixtures/expressions/arithmetic.json',
      'fixtures/expressions/coercion.json',
      'fixtures/expressions/collections_and_lambdas.json',
      'fixtures/expressions/helpers_and_transforms.json',
      'fixtures/expressions/logical_and_comparisons.json',
    ]

    for (const filePath of fixtureFiles) {
      it(`parses all expressions in ${filePath} without syntax errors`, () => {
        const fullPath = join(process.cwd(), filePath)
        const fileContent = JSON.parse(readFileSync(fullPath, 'utf-8'))
        const fixtures = fileContent.fixtures || []

        for (const fixture of fixtures) {
          if (fixture.input?.kind === 'expression' && typeof fixture.input.source === 'string') {
            const parsed = parseExpression(fixture.input.source)
            expect(parsed).toBeDefined()
            expect(parsed.type).toBeDefined()
          }
        }
      })
    }
  })
})
