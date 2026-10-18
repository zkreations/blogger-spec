import type {
  BloggerArrayExpressionNode,
  BloggerBinaryExpressionNode,
  BloggerCallExpressionNode,
  BloggerConditionalExpressionNode,
  BloggerDataPathNode,
  BloggerErrorNode,
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
import type { SpecCatalog } from '../catalogs/index.js'
import type { Token, TokenPosition, TokenType } from './lexer.js'
import { getSpecCatalog } from '../catalogs/index.js'
import { tokenize } from './lexer.js'

export const DEFAULT_MAX_EXPRESSION_DEPTH = 50

export interface ParseExpressionOptions {
  readonly catalog?: SpecCatalog
  readonly tolerant?: boolean
  readonly maxDepth?: number
}

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

const INFIX_TOKEN_SYMBOLS: Partial<Record<TokenType, string>> = {
  STAR: '*',
  SLASH: '/',
  PERCENT: '%',
  PLUS: '+',
  MINUS: '-',
  EQ: '==',
  NEQ: '!=',
  STRICT_EQ: '===',
  STRICT_NEQ: '!==',
  LT: '<',
  GT: '>',
  LTE: '<=',
  GTE: '>=',
  AND: '&&',
  OR: '||',
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
  private readonly catalog: SpecCatalog
  private readonly tolerant: boolean
  private readonly maxDepth: number
  private depth = 0
  private current = 0

  constructor(source: string, options: ParseExpressionOptions = {}) {
    this.source = source
    this.tokens = tokenize(source)
    this.catalog = options.catalog ?? getSpecCatalog()
    this.tolerant = Boolean(options.tolerant)
    this.maxDepth = options.maxDepth ?? DEFAULT_MAX_EXPRESSION_DEPTH
  }

  public parse(): BloggerExpressionNode {
    if (this.isAtEnd()) {
      if (this.tolerant) {
        return {
          type: 'Error',
          message: 'Empty expression cannot be parsed',
          raw: '',
        }
      }
      throw new Error('Empty expression cannot be parsed')
    }

    const expr = this.parseExpression(0)

    if (!this.isAtEnd()) {
      const tok = this.peek()
      if (this.tolerant) {
        return expr
      }
      throw new Error(`Unexpected token '${tok.value}' at line ${tok.start.line}, column ${tok.start.column}`)
    }

    return expr
  }

  private parseExpression(currentBindingPower: number): BloggerExpressionNode {
    if (this.depth >= this.maxDepth) {
      if (this.tolerant) {
        const tok = !this.isAtEnd() ? this.peek() : undefined
        return {
          type: 'Error',
          message: `Maximum expression recursion depth of ${this.maxDepth} exceeded`,
          raw: tok?.rawValue ?? tok?.value ?? '',
        }
      }
      throw new Error(`Maximum expression recursion depth of ${this.maxDepth} exceeded`)
    }

    this.depth++
    try {
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
    finally {
      this.depth--
    }
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
        const lower = token.value.toLowerCase()
        const node: BloggerLiteralNode = {
          type: 'Literal',
          value: lower === 'true' || lower === 'yes',
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
        const opTok = this.advance()
        // Optimization: literal negative numbers (e.g. -5)
        if (this.check('NUMBER')) {
          const numTok = this.advance()
          const val = -Number(numTok.value)
          const raw = `-${numTok.rawValue ?? numTok.value}`
          const node: BloggerLiteralNode = {
            type: 'Literal',
            value: val,
            raw,
            loc: makeLoc(opTok.start, numTok.end),
          }
          return node
        }

        // Functional subtraction: -(20, 10)
        if (this.check('LPAREN')) {
          const savedPos = this.current
          this.advance() // '('
          const args = this.parseArgumentList()
          if (this.check('RPAREN')) {
            const closeParen = this.advance() // ')'
            if (args.length > 1) {
              const node: BloggerCallExpressionNode = {
                type: 'CallExpression',
                callee: '-',
                arguments: args,
                loc: makeLoc(opTok.start, closeParen.end),
              }
              return node
            }
            if (args.length === 1) {
              const node: BloggerUnaryExpressionNode = {
                type: 'UnaryExpression',
                operator: '-',
                argument: args[0]!,
                prefix: true,
                loc: makeLoc(opTok.start, closeParen.end),
              }
              return node
            }
          }
          this.current = savedPos
        }

        const unaryMinusBp = (this.catalog.getLevelBindingPower(3) ?? 80) + 5
        const argument = this.parseExpression(unaryMinusBp)
        const node: BloggerUnaryExpressionNode = {
          type: 'UnaryExpression',
          operator: '-',
          argument,
          prefix: true,
          loc: makeLoc(opTok.start, argument.loc ? { line: argument.loc.end.line, column: argument.loc.end.column, offset: argument.loc.end.offset ?? 0 } : opTok.end),
        }
        return node
      }

      case 'BANG': {
        this.advance()
        const notBp = this.catalog.getOperatorBindingPower('!') ?? this.catalog.getLevelBindingPower(6) ?? 50
        const argument = this.parseExpression(notBp)
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
          const notBp = this.catalog.getOperatorBindingPower('not') ?? this.catalog.getLevelBindingPower(6) ?? 50
          const argument = this.parseExpression(notBp)
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

      // Functional operator syntax: +(1, 2), ==(1, 1), >(2, 1), &&(a, b), ?:(a, b)
      case 'PLUS':
      case 'STAR':
      case 'SLASH':
      case 'PERCENT':
      case 'EQ':
      case 'NEQ':
      case 'LT':
      case 'GT':
      case 'LTE':
      case 'GTE':
      case 'AND':
      case 'OR':
      case 'ELVIS': {
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
        if (this.tolerant) {
          const errNode: BloggerErrorNode = {
            type: 'Error',
            message: `Unexpected operator '${opToken.value}' in prefix position`,
            raw: opToken.value,
            unexpectedToken: opToken.value,
            loc: makeLoc(opToken.start, opToken.end),
          }
          return errNode
        }
        throw new Error(`Unexpected operator '${opToken.value}' in prefix position at line ${opToken.start.line}, column ${opToken.start.column}`)
      }

      default: {
        if (this.tolerant) {
          const tok = this.isAtEnd() ? this.peek() : this.advance()
          const errNode: BloggerErrorNode = {
            type: 'Error',
            message: tok.type === 'EOF' ? 'Unexpected end of expression' : `Unexpected token '${tok.value}'`,
            raw: tok.type === 'EOF' ? '' : tok.value,
            unexpectedToken: tok.value,
            loc: makeLoc(tok.start, tok.end),
          }
          return errNode
        }
        throw new Error(`Unexpected token '${token.value}' at line ${token.start.line}, column ${token.start.column}`)
      }
    }
  }

  private parseInfix(left: BloggerExpressionNode, opInfo: InfixOpInfo): BloggerExpressionNode {
    const startLoc = left.loc ? { line: left.loc.start.line, column: left.loc.start.column, offset: left.loc.start.offset ?? 0 } : this.peek().start

    // 1. Member dot access: object.property
    if (opInfo.isMemberDot) {
      this.advance() // '.'
      const propToken = this.consumePropertyName('Expected property name after \'.\'')
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

    const members: BloggerDataPathNode['members'] = []
    let lastEnd = dataPrefixToken.end

    if (this.checkPropertyName()) {
      const firstPropToken = this.advance()
      members.push({ property: firstPropToken.value, computed: false })
      lastEnd = firstPropToken.end
    }
    else if (this.tolerant && !this.check('LBRACKET') && !this.check('DOT')) {
      members.push({ property: '', computed: false })
    }

    while (!this.isAtEnd()) {
      if (this.check('DOT')) {
        this.advance() // '.'
        if (this.checkPropertyName()) {
          const memberToken = this.advance()
          members.push({ property: memberToken.value, computed: false })
          lastEnd = memberToken.end
        }
        else if (this.tolerant) {
          members.push({ property: '', computed: false })
          break
        }
        else {
          const memberToken = this.consumePropertyName('Expected member identifier after \'.\'')
          members.push({ property: memberToken.value, computed: false })
          lastEnd = memberToken.end
        }
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

    if (keyTok.type === 'IDENTIFIER' || keyTok.type === 'STRING' || keyTok.type === 'BOOLEAN' || keyTok.type === 'NULL') {
      this.advance()
      key = keyTok.value
    }
    else {
      if (this.tolerant) {
        key = keyTok.value || 'error'
        if (!this.isAtEnd()) {
          this.advance()
        }
      }
      else {
        throw new Error(`Expected object property key at line ${keyTok.start.line}, column ${keyTok.start.column}`)
      }
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
      const bp = this.catalog.getLevelBindingPower(1) ?? 100
      return { name: '.', bindingPower: bp, catalogLevel: 1, isMemberDot: true }
    }

    if (token.type === 'LBRACKET') {
      const bp = this.catalog.getLevelBindingPower(1) ?? 100
      return { name: '[', bindingPower: bp, catalogLevel: 1, isMemberBracket: true }
    }

    if (token.type === 'ELVIS') {
      const bp = this.catalog.getOperatorBindingPower('?:') ?? 95
      const isRightAssociative = this.catalog.isRightAssociativeOperator('?:')
      return { name: '?:', bindingPower: bp, catalogLevel: 2, isElvis: true, isRightAssociative }
    }

    if (token.type === 'QUESTION') {
      const bp = this.catalog.getOperatorBindingPower('? :') ?? this.catalog.getLevelBindingPower(9) ?? 20
      const isRightAssociative = this.catalog.isRightAssociativeOperator('? :')
      return { name: '?', bindingPower: bp, catalogLevel: 9, isTernary: true, isRightAssociative }
    }

    const symbol = INFIX_TOKEN_SYMBOLS[token.type]
    if (symbol) {
      let precLevel = this.catalog.getOperatorPrecedence(symbol)
      let bindingPower = this.catalog.getOperatorBindingPower(symbol)
      if ((symbol === '===' || symbol === '!==') && (precLevel === undefined || bindingPower === undefined)) {
        precLevel = this.catalog.getOperatorPrecedence('==') ?? 7
        bindingPower = this.catalog.getOperatorBindingPower('==') ?? 30
      }
      if (precLevel !== undefined && bindingPower !== undefined) {
        return {
          name: symbol,
          bindingPower,
          catalogLevel: precLevel,
          isLogical: this.catalog.isLogicalOperator(symbol),
          isRightAssociative: this.catalog.isRightAssociativeOperator(symbol),
        }
      }
    }

    if (token.type === 'IDENTIFIER') {
      const lower = token.value.toLowerCase()

      if (this.catalog.getLambdaKeywords().has(lower)) {
        const bp = this.catalog.getOperatorBindingPower(lower) ?? this.catalog.getLevelBindingPower(10) ?? 10
        return { name: token.value, bindingPower: bp, catalogLevel: 10, isLambda: true }
      }

      const precLevel = this.catalog.getOperatorPrecedence(token.value) ?? this.catalog.getOperatorPrecedence(lower)
      const bindingPower = this.catalog.getOperatorBindingPower(token.value) ?? this.catalog.getOperatorBindingPower(lower)
      if (precLevel !== undefined && bindingPower !== undefined) {
        return {
          name: token.value,
          bindingPower,
          catalogLevel: precLevel,
          isLogical: this.catalog.isLogicalOperator(token.value) || this.catalog.isLogicalOperator(lower),
          isRightAssociative: this.catalog.isRightAssociativeOperator(token.value) || this.catalog.isRightAssociativeOperator(lower),
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
    if (this.tolerant) {
      return {
        type,
        value: '',
        start: tok.start,
        end: tok.end,
      }
    }
    throw new Error(`${errorMessage} (found '${tok.value}' at line ${tok.start.line}, column ${tok.start.column})`)
  }

  private checkPropertyName(): boolean {
    if (this.isAtEnd()) {
      return false
    }
    const t = this.peek().type
    return t === 'IDENTIFIER' || t === 'BOOLEAN' || t === 'NULL'
  }

  private consumePropertyName(errorMessage: string): Token {
    if (this.checkPropertyName()) {
      return this.advance()
    }
    return this.consume('IDENTIFIER', errorMessage)
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length || this.peek().type === 'EOF'
  }
}

export function parseExpression(
  source: string,
  options?: ParseExpressionOptions,
): BloggerExpressionNode {
  const parser = new ExpressionParser(source, options)
  return parser.parse()
}
