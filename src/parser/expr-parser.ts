import type {
  BloggerArrayExpressionNode,
  BloggerBinaryExpressionNode,
  BloggerCallExpressionNode,
  BloggerConditionalExpressionNode,
  BloggerDataPathNode,
  BloggerExpressionNode,
  BloggerIdentifierNode,
  BloggerLambdaExpressionNode,
  BloggerLiteralNode,
  BloggerLogicalExpressionNode,
  BloggerMemberExpressionNode,
  BloggerObjectExpressionNode,
  BloggerPropertyNode,
  BloggerSourceLocation,
  BloggerSourcePosition,
  BloggerUnaryExpressionNode,
} from '../ast.js'
import type { Token, TokenPosition, TokenType } from './lexer.js'
import { getOperatorPrecedence } from '../helpers.js'
import { tokenize } from './lexer.js'

interface InfixOpInfo {
  name: string
  bindingPower: number
  catalogLevel: number
  isLogical?: boolean
  isRightAssociative?: boolean
  isLambda?: boolean
  isElvis?: boolean
  isTernary?: boolean
  isMemberDot?: boolean
  isMemberBracket?: boolean
}

const LEVEL_TO_BINDING_POWER: Record<number, number> = {
  2: 90, // Multiplicative: *, /, %
  3: 80, // Additive & Transforms: +, -, format, params, etc.
  4: 70, // Relational, Comparisons & Slices: ==, !=, <, >, eq, neq, take, skip, to, etc.
  5: 60, // Membership: in, contains
  6: 50, // Logical NOT: !, not
  7: 40, // Logical AND: &&, and
  8: 30, // Logical OR: ||, or
  9: 20, // Ternary & Elvis: ?:
  10: 10, // Collection lambdas: filter, map, any, count, etc.
}

const LAMBDA_KEYWORDS = new Set([
  'filter',
  'where',
  'map',
  'select',
  'any',
  'all',
  'none',
  'count',
  'first',
])

const HIERARCHY_OPERATOR_LEVELS: Record<string, number> = {
  '*': 2,
  '/': 2,
  '%': 2,
  '+': 3,
  '-': 3,
  'path': 3,
  'params': 3,
  'appendparams': 3,
  'fragment': 3,
  'format': 3,
  'resizeimage': 3,
  'sourceset': 3,
  'snippet': 3,
  '==': 4,
  '!=': 4,
  '<': 4,
  '>': 4,
  '<=': 4,
  '>=': 4,
  'eq': 4,
  'neq': 4,
  'lt': 4,
  'gt': 4,
  'lte': 4,
  'gte': 4,
  'take': 4,
  'skip': 4,
  'limit': 4,
  'offset': 4,
  'to': 4,
  'in': 5,
  'contains': 5,
  '!': 6,
  'not': 6,
  '&&': 7,
  'and': 7,
  '||': 8,
  'or': 8,
  '?:': 9,
  '?': 9,
  'where': 10,
  'map': 10,
  'select': 10,
  'filter': 10,
  'any': 10,
  'all': 10,
  'none': 10,
  'count': 10,
  'first': 10,
}

function toSourcePosition(pos: TokenPosition): BloggerSourcePosition {
  return {
    line: pos.line,
    column: pos.column,
    offset: pos.offset,
  }
}

function makeLoc(start: TokenPosition, end: TokenPosition): BloggerSourceLocation {
  return {
    start: toSourcePosition(start),
    end: toSourcePosition(end),
  }
}

export class ExpressionParser {
  private readonly tokens: Token[]
  private readonly source: string
  private current = 0

  constructor(source: string) {
    this.source = source
    this.tokens = tokenize(source)
  }

  public parse(): BloggerExpressionNode {
    if (this.isAtEnd()) {
      throw new Error('Empty expression cannot be parsed')
    }

    const expr = this.parseExpression(0)

    if (!this.isAtEnd()) {
      const tok = this.peek()
      throw new Error(`Unexpected token '${tok.value}' at line ${tok.start.line}, column ${tok.start.column}`)
    }

    return expr
  }

  private parseExpression(currentBindingPower: number): BloggerExpressionNode {
    let left = this.parsePrefix()

    while (!this.isAtEnd()) {
      const opInfo = this.getInfixOpInfo(this.peek())
      if (!opInfo || opInfo.bindingPower <= currentBindingPower) {
        break
      }

      left = this.parseInfix(left, opInfo)
    }

    return left
  }

  private parsePrefix(): BloggerExpressionNode {
    const token = this.peek()

    switch (token.type) {
      case 'NUMBER': {
        this.advance()
        const raw = token.rawValue ?? token.value
        const numVal = Number(token.value)
        const node: BloggerLiteralNode = {
          type: 'Literal',
          value: numVal,
          raw,
          loc: makeLoc(token.start, token.end),
        }
        return node
      }

      case 'STRING': {
        this.advance()
        const node: BloggerLiteralNode = {
          type: 'Literal',
          value: token.value,
          raw: token.rawValue ?? `"${token.value}"`,
          loc: makeLoc(token.start, token.end),
        }
        return node
      }

      case 'BOOLEAN': {
        this.advance()
        const node: BloggerLiteralNode = {
          type: 'Literal',
          value: token.value === 'true',
          raw: token.value,
          loc: makeLoc(token.start, token.end),
        }
        return node
      }

      case 'NULL': {
        this.advance()
        const node: BloggerLiteralNode = {
          type: 'Literal',
          value: null,
          raw: 'null',
          loc: makeLoc(token.start, token.end),
        }
        return node
      }

      case 'LPAREN': {
        this.advance() // '('
        const inner = this.parseExpression(0)
        this.consume('RPAREN', 'Expected \')\' to close parenthesized expression')
        return inner
      }

      case 'LBRACKET': {
        return this.parseArrayExpression()
      }

      case 'LBRACE': {
        return this.parseObjectExpression()
      }

      case 'MINUS': {
        this.advance()
        // Optimization: literal negative numbers (e.g. -5)
        if (this.check('NUMBER')) {
          const numTok = this.advance()
          const val = -Number(numTok.value)
          const raw = `-${numTok.rawValue ?? numTok.value}`
          const node: BloggerLiteralNode = {
            type: 'Literal',
            value: val,
            raw,
            loc: makeLoc(token.start, numTok.end),
          }
          return node
        }

        const argument = this.parseExpression(85)
        const node: BloggerUnaryExpressionNode = {
          type: 'UnaryExpression',
          operator: '-',
          argument,
          prefix: true,
          loc: makeLoc(token.start, argument.loc ? { line: argument.loc.end.line, column: argument.loc.end.column, offset: argument.loc.end.offset ?? 0 } : token.end),
        }
        return node
      }

      case 'BANG': {
        this.advance()
        const argument = this.parseExpression(LEVEL_TO_BINDING_POWER[6]!)
        const node: BloggerUnaryExpressionNode = {
          type: 'UnaryExpression',
          operator: '!',
          argument,
          prefix: true,
          loc: makeLoc(token.start, argument.loc ? { line: argument.loc.end.line, column: argument.loc.end.column, offset: argument.loc.end.offset ?? 0 } : token.end),
        }
        return node
      }

      case 'DATA_PREFIX': {
        return this.parseDataPath()
      }

      case 'IDENTIFIER': {
        const idToken = this.advance()
        const idLower = idToken.value.toLowerCase()

        if (idLower === 'not') {
          const argument = this.parseExpression(LEVEL_TO_BINDING_POWER[6]!)
          const node: BloggerUnaryExpressionNode = {
            type: 'UnaryExpression',
            operator: 'not',
            argument,
            prefix: true,
            loc: makeLoc(idToken.start, argument.loc ? { line: argument.loc.end.line, column: argument.loc.end.column, offset: argument.loc.end.offset ?? 0 } : idToken.end),
          }
          return node
        }

        // Functional call expression: resizeImage(...), format(...), etc.
        if (this.check('LPAREN')) {
          this.advance() // '('
          const args = this.parseArgumentList()
          const closeParen = this.consume('RPAREN', 'Expected \')\' after function arguments')
          const node: BloggerCallExpressionNode = {
            type: 'CallExpression',
            callee: idToken.value,
            arguments: args,
            loc: makeLoc(idToken.start, closeParen.end),
          }
          return node
        }

        const node: BloggerIdentifierNode = {
          type: 'Identifier',
          name: idToken.value,
          loc: makeLoc(idToken.start, idToken.end),
        }
        return node
      }

      // Functional operator syntax: +(1, 2)
      case 'PLUS':
      case 'STAR':
      case 'SLASH':
      case 'PERCENT':
      case 'EQ':
      case 'NEQ': {
        const opToken = this.advance()
        if (this.check('LPAREN')) {
          this.advance() // '('
          const args = this.parseArgumentList()
          const closeParen = this.consume('RPAREN', 'Expected \')\' after functional operator arguments')
          const node: BloggerCallExpressionNode = {
            type: 'CallExpression',
            callee: opToken.value,
            arguments: args,
            loc: makeLoc(opToken.start, closeParen.end),
          }
          return node
        }
        throw new Error(`Unexpected operator '${opToken.value}' in prefix position at line ${opToken.start.line}, column ${opToken.start.column}`)
      }

      default:
        throw new Error(`Unexpected token '${token.value}' at line ${token.start.line}, column ${token.start.column}`)
    }
  }

  private parseInfix(left: BloggerExpressionNode, opInfo: InfixOpInfo): BloggerExpressionNode {
    const startLoc = left.loc ? { line: left.loc.start.line, column: left.loc.start.column, offset: left.loc.start.offset ?? 0 } : this.peek().start

    // 1. Member dot access: object.property
    if (opInfo.isMemberDot) {
      this.advance() // '.'
      const propToken = this.consume('IDENTIFIER', 'Expected property name after \'.\'')
      const node: BloggerMemberExpressionNode = {
        type: 'MemberExpression',
        object: left,
        property: {
          type: 'Identifier',
          name: propToken.value,
          loc: makeLoc(propToken.start, propToken.end),
        },
        computed: false,
        loc: makeLoc(startLoc, propToken.end),
      }
      return node
    }

    // 2. Member bracket indexing: object[expr]
    if (opInfo.isMemberBracket) {
      this.advance() // '['
      const indexExpr = this.parseExpression(0)
      const closeBracket = this.consume('RBRACKET', 'Expected \']\' after index expression')
      const node: BloggerMemberExpressionNode = {
        type: 'MemberExpression',
        object: left,
        property: indexExpr,
        computed: true,
        loc: makeLoc(startLoc, closeBracket.end),
      }
      return node
    }

    // 3. Elvis operator: left ?: right
    if (opInfo.isElvis) {
      this.advance() // '?:'
      const right = this.parseExpression(opInfo.bindingPower - 1)
      const endLoc = right.loc ? { line: right.loc.end.line, column: right.loc.end.column, offset: right.loc.end.offset ?? 0 } : this.peek().end
      const node: BloggerConditionalExpressionNode = {
        type: 'ConditionalExpression',
        test: left,
        consequent: right,
        isElvis: true,
        loc: makeLoc(startLoc, endLoc),
      }
      return node
    }

    // 4. Ternary operator: test ? consequent : alternate
    if (opInfo.isTernary) {
      this.advance() // '?'
      const consequent = this.parseExpression(0)
      this.consume('COLON', 'Expected \':\' after consequent in ternary expression')
      const alternate = this.parseExpression(opInfo.bindingPower - 1)
      const endLoc = alternate.loc ? { line: alternate.loc.end.line, column: alternate.loc.end.column, offset: alternate.loc.end.offset ?? 0 } : this.peek().end
      const node: BloggerConditionalExpressionNode = {
        type: 'ConditionalExpression',
        test: left,
        consequent,
        alternate,
        isElvis: false,
        loc: makeLoc(startLoc, endLoc),
      }
      return node
    }

    // 5. Collection lambda operators: array filter (p => p.id == 1)
    if (opInfo.isLambda) {
      const opToken = this.advance()
      let parameter = ''
      let body: BloggerExpressionNode
      let endTokenPos: TokenPosition

      if (this.check('LPAREN')) {
        this.advance() // '('
        const paramToken = this.consume('IDENTIFIER', 'Expected lambda parameter identifier')
        parameter = paramToken.value
        this.consume('ARROW', 'Expected \'=>\' after lambda parameter')
        body = this.parseExpression(0)
        const closeParen = this.consume('RPAREN', 'Expected \')\' closing lambda expression')
        endTokenPos = closeParen.end
      }
      else {
        const paramToken = this.consume('IDENTIFIER', 'Expected lambda parameter identifier')
        parameter = paramToken.value
        this.consume('ARROW', 'Expected \'=>\' after lambda parameter')
        body = this.parseExpression(0)
        endTokenPos = body.loc ? { line: body.loc.end.line, column: body.loc.end.column, offset: body.loc.end.offset ?? 0 } : this.peek().end
      }

      const node: BloggerLambdaExpressionNode = {
        type: 'LambdaExpression',
        callee: left,
        operator: opToken.value,
        parameter,
        body,
        loc: makeLoc(startLoc, endTokenPos),
      }
      return node
    }

    // 6. Logical operators: left && right / left and right
    if (opInfo.isLogical) {
      this.advance()
      const right = this.parseExpression(opInfo.bindingPower)
      const endLoc = right.loc ? { line: right.loc.end.line, column: right.loc.end.column, offset: right.loc.end.offset ?? 0 } : this.peek().end
      const node: BloggerLogicalExpressionNode = {
        type: 'LogicalExpression',
        operator: opInfo.name as '&&' | '||' | 'and' | 'or',
        left,
        right,
        loc: makeLoc(startLoc, endLoc),
      }
      return node
    }

    // 7. General binary expressions (arithmetic, relational, transforms, slices)
    this.advance()
    const nextBp = opInfo.isRightAssociative ? opInfo.bindingPower - 1 : opInfo.bindingPower
    const right = this.parseExpression(nextBp)
    const endLoc = right.loc ? { line: right.loc.end.line, column: right.loc.end.column, offset: right.loc.end.offset ?? 0 } : this.peek().end
    const node: BloggerBinaryExpressionNode = {
      type: 'BinaryExpression',
      operator: opInfo.name,
      left,
      right,
      precedence: opInfo.catalogLevel,
      loc: makeLoc(startLoc, endLoc),
    }
    return node
  }

  private parseDataPath(): BloggerDataPathNode {
    const dataPrefixToken = this.advance() // 'data:'
    const startLoc = dataPrefixToken.start

    const firstPropToken = this.consume('IDENTIFIER', 'Expected identifier following \'data:\'')
    const members: BloggerDataPathNode['members'] = [
      { property: firstPropToken.value, computed: false },
    ]

    let lastEnd = firstPropToken.end

    while (!this.isAtEnd()) {
      if (this.check('DOT')) {
        this.advance() // '.'
        const memberToken = this.consume('IDENTIFIER', 'Expected member identifier after \'.\'')
        members.push({ property: memberToken.value, computed: false })
        lastEnd = memberToken.end
      }
      else if (this.check('LBRACKET')) {
        this.advance() // '['
        const indexExpr = this.parseExpression(0)
        const closeBracket = this.consume('RBRACKET', 'Expected \']\' after index expression')
        if (indexExpr.type === 'Literal' && (typeof indexExpr.value === 'string' || typeof indexExpr.value === 'number')) {
          members.push({ property: String(indexExpr.value), computed: true, expression: indexExpr })
        }
        else {
          members.push({ property: '', computed: true, expression: indexExpr })
        }
        lastEnd = closeBracket.end
      }
      else {
        break
      }
    }

    const raw = this.source.slice(startLoc.offset, lastEnd.offset)

    return {
      type: 'DataPath',
      raw,
      root: 'data',
      members,
      loc: makeLoc(startLoc, lastEnd),
    }
  }

  private parseArrayExpression(): BloggerArrayExpressionNode {
    const startTok = this.advance() // '['
    const elements: BloggerExpressionNode[] = []

    if (!this.check('RBRACKET')) {
      elements.push(this.parseExpression(0))
      while (this.check('COMMA')) {
        this.advance() // ','
        if (this.check('RBRACKET')) {
          break
        }
        elements.push(this.parseExpression(0))
      }
    }

    const closeBracket = this.consume('RBRACKET', 'Expected \']\' closing array literal')
    return {
      type: 'ArrayExpression',
      elements,
      loc: makeLoc(startTok.start, closeBracket.end),
    }
  }

  private parseObjectExpression(): BloggerObjectExpressionNode {
    const startTok = this.advance() // '{'
    const properties: BloggerPropertyNode[] = []

    if (!this.check('RBRACE')) {
      properties.push(this.parseProperty())
      while (this.check('COMMA')) {
        this.advance() // ','
        if (this.check('RBRACE')) {
          break
        }
        properties.push(this.parseProperty())
      }
    }

    const closeBrace = this.consume('RBRACE', 'Expected \'}\' closing object literal')
    return {
      type: 'ObjectExpression',
      properties,
      loc: makeLoc(startTok.start, closeBrace.end),
    }
  }

  private parseProperty(): BloggerPropertyNode {
    const keyTok = this.peek()
    let key = ''

    if (keyTok.type === 'IDENTIFIER' || keyTok.type === 'STRING') {
      this.advance()
      key = keyTok.value
    }
    else {
      throw new Error(`Expected object property key at line ${keyTok.start.line}, column ${keyTok.start.column}`)
    }

    this.consume('COLON', 'Expected \':\' after object property key')
    const value = this.parseExpression(0)
    const endLoc = value.loc ? { line: value.loc.end.line, column: value.loc.end.column, offset: value.loc.end.offset ?? 0 } : this.peek().end

    return {
      type: 'Property',
      key,
      value,
      loc: makeLoc(keyTok.start, endLoc),
    }
  }

  private parseArgumentList(): BloggerExpressionNode[] {
    const args: BloggerExpressionNode[] = []
    if (!this.check('RPAREN')) {
      args.push(this.parseExpression(0))
      while (this.check('COMMA')) {
        this.advance() // ','
        if (this.check('RPAREN')) {
          break
        }
        args.push(this.parseExpression(0))
      }
    }
    return args
  }

  private getInfixOpInfo(token: Token): InfixOpInfo | null {
    if (token.type === 'DOT') {
      return { name: '.', bindingPower: 100, catalogLevel: 1, isMemberDot: true }
    }

    if (token.type === 'LBRACKET') {
      return { name: '[', bindingPower: 100, catalogLevel: 1, isMemberBracket: true }
    }

    if (token.type === 'ELVIS') {
      return { name: '?:', bindingPower: LEVEL_TO_BINDING_POWER[9]!, catalogLevel: 9, isElvis: true, isRightAssociative: true }
    }

    if (token.type === 'QUESTION') {
      return { name: '?', bindingPower: LEVEL_TO_BINDING_POWER[9]!, catalogLevel: 9, isTernary: true, isRightAssociative: true }
    }

    if (token.type === 'STAR') {
      return { name: '*', bindingPower: LEVEL_TO_BINDING_POWER[2]!, catalogLevel: 2 }
    }
    if (token.type === 'SLASH') {
      return { name: '/', bindingPower: LEVEL_TO_BINDING_POWER[2]!, catalogLevel: 2 }
    }
    if (token.type === 'PERCENT') {
      return { name: '%', bindingPower: LEVEL_TO_BINDING_POWER[2]!, catalogLevel: 2 }
    }

    if (token.type === 'PLUS') {
      return { name: '+', bindingPower: LEVEL_TO_BINDING_POWER[3]!, catalogLevel: 3 }
    }
    if (token.type === 'MINUS') {
      return { name: '-', bindingPower: LEVEL_TO_BINDING_POWER[3]!, catalogLevel: 3 }
    }

    if (token.type === 'EQ') {
      return { name: '==', bindingPower: LEVEL_TO_BINDING_POWER[4]!, catalogLevel: 4 }
    }
    if (token.type === 'NEQ') {
      return { name: '!=', bindingPower: LEVEL_TO_BINDING_POWER[4]!, catalogLevel: 4 }
    }
    if (token.type === 'LT') {
      return { name: '<', bindingPower: LEVEL_TO_BINDING_POWER[4]!, catalogLevel: 4 }
    }
    if (token.type === 'GT') {
      return { name: '>', bindingPower: LEVEL_TO_BINDING_POWER[4]!, catalogLevel: 4 }
    }
    if (token.type === 'LTE') {
      return { name: '<=', bindingPower: LEVEL_TO_BINDING_POWER[4]!, catalogLevel: 4 }
    }
    if (token.type === 'GTE') {
      return { name: '>=', bindingPower: LEVEL_TO_BINDING_POWER[4]!, catalogLevel: 4 }
    }

    if (token.type === 'AND') {
      return { name: '&&', bindingPower: LEVEL_TO_BINDING_POWER[7]!, catalogLevel: 7, isLogical: true }
    }
    if (token.type === 'OR') {
      return { name: '||', bindingPower: LEVEL_TO_BINDING_POWER[8]!, catalogLevel: 8, isLogical: true }
    }

    if (token.type === 'IDENTIFIER') {
      const lower = token.value.toLowerCase()

      if (LAMBDA_KEYWORDS.has(lower)) {
        return { name: token.value, bindingPower: LEVEL_TO_BINDING_POWER[10]!, catalogLevel: 10, isLambda: true }
      }

      if (lower === 'and') {
        return { name: 'and', bindingPower: LEVEL_TO_BINDING_POWER[7]!, catalogLevel: 7, isLogical: true }
      }
      if (lower === 'or') {
        return { name: 'or', bindingPower: LEVEL_TO_BINDING_POWER[8]!, catalogLevel: 8, isLogical: true }
      }

      const precLevel = HIERARCHY_OPERATOR_LEVELS[lower] ?? getOperatorPrecedence(token.value) ?? getOperatorPrecedence(lower)
      if (precLevel !== undefined && precLevel in LEVEL_TO_BINDING_POWER) {
        return {
          name: token.value,
          bindingPower: LEVEL_TO_BINDING_POWER[precLevel]!,
          catalogLevel: precLevel,
        }
      }
    }

    return null
  }

  private peek(): Token {
    return this.tokens[this.current]!
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) {
      return false
    }
    return this.peek().type === type
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++
    }
    return this.tokens[this.current - 1]!
  }

  private consume(type: TokenType, errorMessage: string): Token {
    if (this.check(type)) {
      return this.advance()
    }
    const tok = this.peek()
    throw new Error(`${errorMessage} (found '${tok.value}' at line ${tok.start.line}, column ${tok.start.column})`)
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length || this.peek().type === 'EOF'
  }
}

export function parseExpression(source: string): BloggerExpressionNode {
  const parser = new ExpressionParser(source)
  return parser.parse()
}
