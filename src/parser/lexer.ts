export function flattenMultilineExpression(expr: string): string {
  const lines = expr
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
  return lines.join(' ')
}

const PREDEFINED_XML_ENTITIES: Record<string, string> = {
  quot: '"',
  apos: '\'',
  lt: '<',
  gt: '>',
  amp: '&',
}

const XML_ENTITY_REGEX = /&(?:(quot|apos|lt|gt|amp)|#(?:(\d+)|x([\da-f]+)));/gi

export function unescapeXmlEntities(text: string): string {
  return text.replace(XML_ENTITY_REGEX, (match, named, dec, hex) => {
    if (named) {
      return PREDEFINED_XML_ENTITIES[named.toLowerCase()] ?? match
    }
    if (dec) {
      const code = Number.parseInt(dec, 10)
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : match
    }
    if (hex) {
      const code = Number.parseInt(hex, 16)
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : match
    }
    return match
  })
}

export interface EntityReplacement {
  rawStart: number
  rawEnd: number
  unescapedStart: number
  unescapedEnd: number
}

export interface UnescapedXmlSourceMap {
  unescaped: string
  mapOffset: (offset: number) => number
}

export function unescapeXmlEntitiesWithSourceMap(rawText: string): UnescapedXmlSourceMap {
  if (!rawText.includes('&')) {
    return {
      unescaped: rawText,
      mapOffset: (offset: number) => offset,
    }
  }

  const replacements: EntityReplacement[] = []
  let unescaped = ''
  let lastRawIndex = 0

  const regex = /&(?:(quot|apos|lt|gt|amp)|#(?:(\d+)|x([\da-f]+)));/gi

  for (const match of rawText.matchAll(regex)) {
    const rawMatchStart = match.index
    const rawMatchText = match[0]
    const rawMatchEnd = rawMatchStart + rawMatchText.length

    if (rawMatchStart > lastRawIndex) {
      unescaped += rawText.slice(lastRawIndex, rawMatchStart)
    }

    const named = match[1]
    const dec = match[2]
    const hex = match[3]
    let decoded = rawMatchText

    if (named) {
      decoded = PREDEFINED_XML_ENTITIES[named.toLowerCase()] ?? rawMatchText
    }
    else if (dec) {
      const code = Number.parseInt(dec, 10)
      if (Number.isFinite(code) && code > 0) {
        decoded = String.fromCodePoint(code)
      }
    }
    else if (hex) {
      const code = Number.parseInt(hex, 16)
      if (Number.isFinite(code) && code > 0) {
        decoded = String.fromCodePoint(code)
      }
    }

    const unescapedMatchStart = unescaped.length
    unescaped += decoded
    const unescapedMatchEnd = unescaped.length

    if (decoded !== rawMatchText) {
      replacements.push({
        rawStart: rawMatchStart,
        rawEnd: rawMatchEnd,
        unescapedStart: unescapedMatchStart,
        unescapedEnd: unescapedMatchEnd,
      })
    }

    lastRawIndex = rawMatchEnd
  }

  if (lastRawIndex < rawText.length) {
    unescaped += rawText.slice(lastRawIndex)
  }

  const mapOffset = (offset: number): number => {
    if (offset <= 0) {
      return 0
    }
    if (replacements.length === 0) {
      return offset
    }

    let lastRepBefore: EntityReplacement | null = null

    for (const rep of replacements) {
      if (offset < rep.unescapedStart) {
        break
      }
      if (offset <= rep.unescapedEnd) {
        if (offset === rep.unescapedStart) {
          return rep.rawStart
        }
        if (offset === rep.unescapedEnd) {
          return rep.rawEnd
        }
        const span = rep.unescapedEnd - rep.unescapedStart
        if (span > 0) {
          const progress = (offset - rep.unescapedStart) / span
          return Math.round(rep.rawStart + progress * (rep.rawEnd - rep.rawStart))
        }
        return rep.rawStart
      }
      lastRepBefore = rep
    }

    if (lastRepBefore) {
      return lastRepBefore.rawEnd + (offset - lastRepBefore.unescapedEnd)
    }

    return offset
  }

  return { unescaped, mapOffset }
}

export type TokenType
  = | 'NUMBER'
    | 'STRING'
    | 'BOOLEAN'
    | 'NULL'
    | 'IDENTIFIER'
    | 'DATA_PREFIX'
    | 'PLUS'
    | 'MINUS'
    | 'STAR'
    | 'SLASH'
    | 'PERCENT'
    | 'EQ'
    | 'NEQ'
    | 'STRICT_EQ'
    | 'STRICT_NEQ'
    | 'LT'
    | 'GT'
    | 'LTE'
    | 'GTE'
    | 'AND'
    | 'OR'
    | 'BANG'
    | 'QUESTION'
    | 'COLON'
    | 'ELVIS'
    | 'ARROW'
    | 'LPAREN'
    | 'RPAREN'
    | 'LBRACKET'
    | 'RBRACKET'
    | 'LBRACE'
    | 'RBRACE'
    | 'COMMA'
    | 'DOT'
    | 'EOF'

export interface TokenPosition {
  line: number
  column: number
  offset: number
}

export interface Token {
  type: TokenType
  value: string
  rawValue?: string
  start: TokenPosition
  end: TokenPosition
}

export class Lexer {
  private readonly source: string
  private readonly length: number
  private pos = 0
  private line = 1
  private column = 1
  private lastToken: Token | null = null

  constructor(input: string) {
    this.source = unescapeXmlEntities(input)
    this.length = this.source.length
  }

  public tokenize(): Token[] {
    const tokens: Token[] = []
    let token = this.nextToken()
    while (token.type !== 'EOF') {
      tokens.push(token)
      token = this.nextToken()
    }
    tokens.push(token)
    return tokens
  }

  public nextToken(): Token {
    this.skipWhitespace()

    if (this.pos >= this.length) {
      const pos = this.currentPosition()
      const eofToken: Token = {
        type: 'EOF',
        value: '',
        start: pos,
        end: pos,
      }
      this.lastToken = eofToken
      return eofToken
    }

    const startPos = this.currentPosition()
    const ch = this.source[this.pos]!

    if (ch === '"' || ch === '\'') {
      const token = this.readString(startPos, ch)
      this.lastToken = token
      return token
    }

    // Three-character operators & sequences (prohibited JS strict equality: ===, !==)
    if (this.pos + 2 < this.length) {
      const three = this.source.slice(this.pos, this.pos + 3)
      if (three === '===') {
        this.advance(3)
        return this.makeToken('STRICT_EQ', '===', startPos)
      }
      if (three === '!==') {
        this.advance(3)
        return this.makeToken('STRICT_NEQ', '!==', startPos)
      }
    }

    if (this.pos + 1 < this.length) {
      const two = this.source.slice(this.pos, this.pos + 2)
      if (two === '=>') {
        this.advance(2)
        return this.makeToken('ARROW', '=>', startPos)
      }
      if (two === '?:') {
        this.advance(2)
        return this.makeToken('ELVIS', '?:', startPos)
      }
      if (two === '==') {
        this.advance(2)
        return this.makeToken('EQ', '==', startPos)
      }
      if (two === '!=') {
        this.advance(2)
        return this.makeToken('NEQ', '!=', startPos)
      }
      if (two === '<=') {
        this.advance(2)
        return this.makeToken('LTE', '<=', startPos)
      }
      if (two === '>=') {
        this.advance(2)
        return this.makeToken('GTE', '>=', startPos)
      }
      if (two === '&&') {
        this.advance(2)
        return this.makeToken('AND', '&&', startPos)
      }
      if (two === '||') {
        this.advance(2)
        return this.makeToken('OR', '||', startPos)
      }
    }

    if (this.source.slice(this.pos, this.pos + 5) === 'data:') {
      this.advance(5)
      return this.makeToken('DATA_PREFIX', 'data:', startPos)
    }

    // Number literals (including decimal point if starts with digit)
    if (/\d/.test(ch)) {
      const token = this.readNumber(startPos)
      this.lastToken = token
      return token
    }

    switch (ch) {
      case '+':
        this.advance(1)
        return this.makeToken('PLUS', '+', startPos)
      case '-':
        this.advance(1)
        return this.makeToken('MINUS', '-', startPos)
      case '*':
        this.advance(1)
        return this.makeToken('STAR', '*', startPos)
      case '/':
        this.advance(1)
        return this.makeToken('SLASH', '/', startPos)
      case '%':
        this.advance(1)
        return this.makeToken('PERCENT', '%', startPos)
      case '<':
        this.advance(1)
        return this.makeToken('LT', '<', startPos)
      case '>':
        this.advance(1)
        return this.makeToken('GT', '>', startPos)
      case '!':
        this.advance(1)
        return this.makeToken('BANG', '!', startPos)
      case '?':
        this.advance(1)
        return this.makeToken('QUESTION', '?', startPos)
      case ':':
        this.advance(1)
        return this.makeToken('COLON', ':', startPos)
      case '(':
        this.advance(1)
        return this.makeToken('LPAREN', '(', startPos)
      case ')':
        this.advance(1)
        return this.makeToken('RPAREN', ')', startPos)
      case '[':
        this.advance(1)
        return this.makeToken('LBRACKET', '[', startPos)
      case ']':
        this.advance(1)
        return this.makeToken('RBRACKET', ']', startPos)
      case '{':
        this.advance(1)
        return this.makeToken('LBRACE', '{', startPos)
      case '}':
        this.advance(1)
        return this.makeToken('RBRACE', '}', startPos)
      case ',':
        this.advance(1)
        return this.makeToken('COMMA', ',', startPos)
      case '.':
        this.advance(1)
        return this.makeToken('DOT', '.', startPos)
    }

    // Identifiers and keywords (supports hyphens if immediately preceded by dot '.')
    if (/[a-z_$]/i.test(ch)) {
      const token = this.readIdentifier(startPos)
      this.lastToken = token
      return token
    }

    throw new Error(`Unexpected character '${ch}' at line ${startPos.line}, column ${startPos.column} (offset ${startPos.offset})`)
  }

  private skipWhitespace(): void {
    while (this.pos < this.length) {
      const ch = this.source[this.pos]!
      if (ch === '\n') {
        this.pos++
        this.line++
        this.column = 1
      }
      else if (ch === '\r') {
        this.pos++
        if (this.pos < this.length && this.source[this.pos] === '\n') {
          this.pos++
        }
        this.line++
        this.column = 1
      }
      else if (/\s/.test(ch)) {
        this.pos++
        this.column++
      }
      else {
        break
      }
    }
  }

  private currentPosition(): TokenPosition {
    return {
      line: this.line,
      column: this.column,
      offset: this.pos,
    }
  }

  private advance(count: number): void {
    this.pos += count
    this.column += count
  }

  private makeToken(type: TokenType, value: string, start: TokenPosition, rawValue?: string): Token {
    const token: Token = {
      type,
      value,
      rawValue: rawValue ?? value,
      start,
      end: this.currentPosition(),
    }
    this.lastToken = token
    return token
  }

  private readString(startPos: TokenPosition, quote: string): Token {
    const rawStart = this.pos
    this.advance(1) // skip opening quote
    let value = ''

    while (this.pos < this.length) {
      const c = this.source[this.pos]!
      if (c === quote) {
        this.advance(1) // skip closing quote
        const rawValue = this.source.slice(rawStart, this.pos)
        return this.makeToken('STRING', value, startPos, rawValue)
      }

      if (c === '\\' && this.pos + 1 < this.length) {
        const next = this.source[this.pos + 1]!
        this.advance(2)
        switch (next) {
          case 'n':
            value += '\n'
            break
          case 'r':
            value += '\r'
            break
          case 't':
            value += '\t'
            break
          case 'b':
            value += '\b'
            break
          case 'f':
            value += '\f'
            break
          case '\\':
            value += '\\'
            break
          case '\'':
            value += '\''
            break
          case '"':
            value += '"'
            break
          default:
            value += next
            break
        }
      }
      else {
        value += c
        this.advance(1)
      }
    }

    throw new Error(`Unterminated string literal at line ${startPos.line}, column ${startPos.column}`)
  }

  private readNumber(startPos: TokenPosition): Token {
    const startOffset = this.pos
    while (this.pos < this.length && /\d/.test(this.source[this.pos]!)) {
      this.advance(1)
    }

    if (this.pos < this.length && this.source[this.pos] === '.' && this.pos + 1 < this.length && /\d/.test(this.source[this.pos + 1]!)) {
      this.advance(1) // skip '.'
      while (this.pos < this.length && /\d/.test(this.source[this.pos]!)) {
        this.advance(1)
      }
    }

    const value = this.source.slice(startOffset, this.pos)
    return this.makeToken('NUMBER', value, startPos)
  }

  private readIdentifier(startPos: TokenPosition): Token {
    const startOffset = this.pos
    const allowHyphens = this.lastToken?.type === 'DOT' || this.lastToken?.type === 'DATA_PREFIX'

    while (this.pos < this.length) {
      const ch = this.source[this.pos]!
      if (/[\w$]/.test(ch)) {
        this.advance(1)
      }
      else if (allowHyphens && ch === '-') {
        this.advance(1)
      }
      else {
        break
      }
    }

    const value = this.source.slice(startOffset, this.pos)
    const lower = value.toLowerCase()
    if (lower === 'true' || lower === 'false' || lower === 'yes' || lower === 'no') {
      return this.makeToken('BOOLEAN', value, startPos)
    }

    if (value === 'null') {
      return this.makeToken('NULL', value, startPos)
    }

    return this.makeToken('IDENTIFIER', value, startPos)
  }
}

export function tokenize(source: string): Token[] {
  const lexer = new Lexer(source)
  return lexer.tokenize()
}
