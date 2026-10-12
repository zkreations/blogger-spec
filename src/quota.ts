import type { BloggerExpressionNode } from './ast.js'
import type {
  BloggerExpressionBudgetResult,
  BloggerExpressionBudgetStatus,
  BloggerExpressionToken,
  BloggerExpressionTokenInfo,
} from './types.js'

export const COMPILER_QUOTA_LIMIT = 40
export const COMPILER_QUOTA_WARNING = 36
export const COMPILER_NESTING_LIMIT = 50

const RELATIONAL_KEYWORDS = new Set(['eq', 'neq', 'lt', 'gt', 'lte', 'gte'])
const LOGICAL_KEYWORDS = new Set(['and', 'or', 'not'])
const MEMBERSHIP_KEYWORDS = new Set(['in', 'contains'])
const LAMBDA_KEYWORDS = new Set(['filter', 'where', 'map', 'select', 'first', 'count', 'any', 'all', 'none'])
const COLLECTION_KEYWORDS = new Set(['take', 'limit', 'skip', 'offset', 'to'])
const NATIVE_FUNCTIONS = new Set(['resizeimage', 'snippet', 'sourceset', 'format'])
const BOOLEAN_KEYWORDS = new Set(['true', 'false', 'null'])

export function flattenMultilineExpression(expr: string): string {
  const lines = expr
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
  return lines.join(' ')
}

export function unescapeXmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, '\'')
    .replace(/&#39;/g, '\'')
    .replace(/&#x27;/gi, '\'')
    .replace(/&#34;/g, '"')
    .replace(/&#x22;/gi, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

export function tokenizeExpression(expr: string): BloggerExpressionToken[] {
  const tokens: BloggerExpressionToken[] = []
  const flattened = flattenMultilineExpression(expr)
  const s = unescapeXmlEntities(flattened)

  const length = s.length
  let pos = 0
  const ternaryStack = [0]
  const inObjectStack = [false]

  while (pos < length) {
    const ch = s[pos]!

    if (/\s/.test(ch)) {
      pos++
      continue
    }

    if (ch === '"' || ch === '\'') {
      const quoteChar = ch
      const start = pos
      pos++
      while (pos < length && s[pos] !== quoteChar) {
        if (s[pos] === '\\' && pos + 1 < length) {
          pos += 2
        }
        else {
          pos++
        }
      }
      if (pos < length) {
        pos++
      }
      const literal = s.slice(start, pos)
      tokens.push({ value: literal, tokenType: 'STRING_LITERAL', tokensConsumed: 1, pos: start })
      continue
    }

    const twoChar = s.slice(pos, pos + 2)
    if (['==', '!=', '<=', '>=', '?:', '=>', '&&', '||'].includes(twoChar)) {
      let tType: string
      if (twoChar === '?:') {
        tType = 'OPERATOR_ELVIS'
      }
      else if (twoChar === '=>') {
        tType = 'OPERATOR_LAMBDA'
      }
      else if (twoChar === '&&' || twoChar === '||') {
        tType = 'OPERATOR_LOGICAL_JS'
      }
      else {
        tType = 'OPERATOR_RELATIONAL'
      }
      tokens.push({ value: twoChar, tokenType: tType, tokensConsumed: 1, pos })
      pos += 2
      continue
    }

    if (ch === '{') {
      tokens.push({ value: ch, tokenType: 'CONTAINER_OBJECT', tokensConsumed: 1, pos })
      inObjectStack.push(true)
      pos++
      continue
    }

    if (ch === '}') {
      tokens.push({ value: ch, tokenType: 'CONTAINER_OBJECT_CLOSE', tokensConsumed: 0, pos })
      if (inObjectStack.length > 1) {
        inObjectStack.pop()
      }
      pos++
      continue
    }

    if (ch === '[') {
      tokens.push({ value: ch, tokenType: 'CONTAINER_ARRAY', tokensConsumed: 1, pos })
      pos++
      continue
    }

    if (ch === ']') {
      tokens.push({ value: ch, tokenType: 'CONTAINER_ARRAY_CLOSE', tokensConsumed: 0, pos })
      pos++
      continue
    }

    if (ch === '(' || ch === ')') {
      if (ch === '(') {
        ternaryStack.push(0)
        const lastToken = tokens[tokens.length - 1]
        const prevToken = tokens.length > 1 ? tokens[tokens.length - 2] : undefined
        const isFunctionalCall
          = tokens.length > 0
            && (lastToken!.tokenType === 'NATIVE_FUNCTION'
              || lastToken!.tokenType === 'OPERATOR_LAMBDA'
              || LAMBDA_KEYWORDS.has(lastToken!.value.toLowerCase())
              || (lastToken!.tokenType.startsWith('OPERATOR_')
                && (tokens.length === 1
                  || (prevToken
                    && (prevToken.tokenType === 'DELIMITER_COMMA'
                      || prevToken.tokenType === 'GROUPING_PAREN_OPEN')))))
        const cost = isFunctionalCall ? 0 : 1
        tokens.push({ value: ch, tokenType: 'GROUPING_PAREN_OPEN', tokensConsumed: cost, pos })
      }
      else {
        if (ternaryStack.length > 1) {
          ternaryStack.pop()
        }
        tokens.push({ value: ch, tokenType: 'GROUPING_PAREN_CLOSE', tokensConsumed: 0, pos })
      }
      pos++
      continue
    }

    if (ch === ',') {
      tokens.push({ value: ch, tokenType: 'DELIMITER_COMMA', tokensConsumed: 0, pos })
      pos++
      continue
    }

    if (ch === '?') {
      ternaryStack[ternaryStack.length - 1]! += 1
      tokens.push({ value: ch, tokenType: 'OPERATOR_TERNARY_SELECT', tokensConsumed: 1, pos })
      pos++
      continue
    }

    if (ch === ':') {
      if (ternaryStack[ternaryStack.length - 1]! > 0) {
        ternaryStack[ternaryStack.length - 1]! -= 1
        tokens.push({ value: ch, tokenType: 'OPERATOR_TERNARY_BRANCH', tokensConsumed: 1, pos })
      }
      else {
        tokens.push({ value: ch, tokenType: 'DELIMITER_COLON', tokensConsumed: 0, pos })
      }
      pos++
      continue
    }

    const isUnaryMinus
      = ch === '-'
        && (tokens.length === 0
          || tokens[tokens.length - 1]!.tokenType.startsWith('OPERATOR_')
          || [
            'GROUPING_PAREN_OPEN',
            'CONTAINER_ARRAY',
            'CONTAINER_OBJECT',
            'DELIMITER_COMMA',
            'DELIMITER_COLON',
          ].includes(tokens[tokens.length - 1]!.tokenType))
          && pos + 1 < length
          && /\d/.test(s[pos + 1]!)

    if (isUnaryMinus) {
      const numMatch = s.slice(pos).match(/^-\d+(?:\.\d+)?/)
      if (numMatch) {
        const val = numMatch[0]
        tokens.push({ value: val, tokenType: 'NUMBER_LITERAL', tokensConsumed: 1, pos })
        pos += val.length
        continue
      }
    }

    if (['+', '-', '*', '/', '%', '<', '>', '!'].includes(ch)) {
      let tType: string
      if (ch === '<' || ch === '>') {
        tType = 'OPERATOR_RELATIONAL'
      }
      else if (ch === '!') {
        tType = 'OPERATOR_LOGICAL'
      }
      else {
        tType = 'OPERATOR_ARITHMETIC'
      }
      tokens.push({ value: ch, tokenType: tType, tokensConsumed: 1, pos })
      pos++
      continue
    }

    if (s.slice(pos).startsWith('data:')) {
      const start = pos
      pos += 5
      const m = s.slice(pos).match(/^\w*/)
      if (m) {
        pos += m[0].length
      }

      while (pos < length) {
        if (s[pos] === '.') {
          const mProp = s.slice(pos).match(/^\.[\w-]+/)
          if (mProp) {
            pos += mProp[0].length
          }
          else {
            break
          }
        }
        else if (s[pos] === '[') {
          const bracketStart = pos
          pos += 1
          let bracketDepth = 1
          let inQuote: string | null = null
          while (pos < length && bracketDepth > 0) {
            const c = s[pos]!
            if (inQuote) {
              if (c === '\\') {
                pos += 2
                continue
              }
              else if (c === inQuote) {
                inQuote = null
              }
            }
            else {
              if (c === '"' || c === '\'') {
                inQuote = c
              }
              else if (c === '[') {
                bracketDepth++
              }
              else if (c === ']') {
                bracketDepth--
              }
            }
            pos++
          }
          if (bracketDepth !== 0) {
            pos = bracketStart
            break
          }
        }
        else {
          break
        }
      }

      const val = s.slice(start, pos)
      tokens.push({ value: val, tokenType: 'DATA_PATH', tokensConsumed: 1, pos: start })
      continue
    }

    const idMatch = s.slice(pos).match(/^[a-z_][\w-]*/i)
    if (idMatch) {
      const word = idMatch[0]
      const lowerWord = word.toLowerCase()
      const start = pos
      pos += word.length

      const following = s.slice(pos).trimStart()
      const lastToken = tokens[tokens.length - 1]

      const isObjectKey
        = inObjectStack[inObjectStack.length - 1]
          && following.startsWith(':')
          && ternaryStack[ternaryStack.length - 1] === 0
          && (!lastToken
            || lastToken.tokenType === 'CONTAINER_OBJECT'
            || lastToken.tokenType === 'DELIMITER_COMMA')

      if (isObjectKey) {
        tokens.push({ value: word, tokenType: 'OBJECT_KEY', tokensConsumed: 0, pos: start })
      }
      else if (following.startsWith('(') && NATIVE_FUNCTIONS.has(lowerWord)) {
        tokens.push({ value: word, tokenType: 'NATIVE_FUNCTION', tokensConsumed: 1, pos: start })
      }
      else if (RELATIONAL_KEYWORDS.has(lowerWord)) {
        tokens.push({ value: word, tokenType: 'OPERATOR_RELATIONAL', tokensConsumed: 1, pos: start })
      }
      else if (LOGICAL_KEYWORDS.has(lowerWord)) {
        tokens.push({ value: word, tokenType: 'OPERATOR_LOGICAL', tokensConsumed: 1, pos: start })
      }
      else if (MEMBERSHIP_KEYWORDS.has(lowerWord)) {
        tokens.push({ value: word, tokenType: 'OPERATOR_MEMBERSHIP', tokensConsumed: 1, pos: start })
      }
      else if (LAMBDA_KEYWORDS.has(lowerWord)) {
        tokens.push({ value: word, tokenType: 'OPERATOR_LAMBDA', tokensConsumed: 1, pos: start })
      }
      else if (COLLECTION_KEYWORDS.has(lowerWord)) {
        tokens.push({ value: word, tokenType: 'OPERATOR_COLLECTION', tokensConsumed: 1, pos: start })
      }
      else if (BOOLEAN_KEYWORDS.has(lowerWord)) {
        tokens.push({ value: word, tokenType: 'BOOLEAN_LITERAL', tokensConsumed: 1, pos: start })
      }
      else {
        tokens.push({ value: word, tokenType: 'IDENTIFIER', tokensConsumed: 1, pos: start })
      }
      continue
    }

    const numMatch = s.slice(pos).match(/^-?\d+(?:\.\d+)?/)
    if (numMatch) {
      const val = numMatch[0]
      tokens.push({ value: val, tokenType: 'NUMBER_LITERAL', tokensConsumed: 1, pos })
      pos += val.length
      continue
    }

    if (ch === '.') {
      const dotMatch = s.slice(pos).match(/^\.[\w-]+/)
      if (dotMatch) {
        const val = dotMatch[0]
        tokens.push({ value: val, tokenType: 'PROPERTY_ACCESS', tokensConsumed: 1, pos })
        pos += val.length
        continue
      }
      pos++
      continue
    }

    pos++
  }

  return tokens
}

export const tokenizeExpressionTokens = tokenizeExpression

export function countExpressionTokens(expr: string | BloggerExpressionNode): number {
  if (typeof expr === 'string') {
    const trimmed = expr.trim()
    if (!trimmed) {
      return 0
    }
    const tokens = tokenizeExpression(trimmed)
    return tokens.reduce((acc, t) => acc + t.tokensConsumed, 0)
  }

  if (typeof expr === 'object' && expr !== null) {
    const node = expr as BloggerExpressionNode
    switch (node.type) {
      case 'Literal':
      case 'Identifier':
      case 'DataPath':
        return 1
      case 'UnaryExpression':
        return 1 + countExpressionTokens(node.argument)
      case 'BinaryExpression':
      case 'LogicalExpression':
        return countExpressionTokens(node.left) + countExpressionTokens(node.right) + 1
      case 'ConditionalExpression':
        if (node.isElvis) {
          return countExpressionTokens(node.test) + countExpressionTokens(node.consequent) + 1
        }
        return (
          countExpressionTokens(node.test)
          + countExpressionTokens(node.consequent)
          + (node.alternate ? countExpressionTokens(node.alternate) : 0)
          + 2
        )
      case 'CallExpression':
        return 1 + node.arguments.reduce((acc, arg) => acc + countExpressionTokens(arg), 0)
      case 'LambdaExpression':
        return (
          countExpressionTokens(node.callee)
          + 3 // lambda keyword + parameter + '=>'
          + countExpressionTokens(node.body)
        )
      case 'ObjectExpression':
        return 1 + node.properties.reduce((acc, prop) => acc + countExpressionTokens(prop.value), 0)
      case 'ArrayExpression':
        return 1 + node.elements.reduce((acc, elem) => acc + countExpressionTokens(elem), 0)
      case 'MemberExpression':
        return countExpressionTokens(node.object) + 1
      default:
        return 1
    }
  }

  return 0
}

export function evaluateExpressionBudget(expr: string): BloggerExpressionBudgetResult {
  const flatExpr = flattenMultilineExpression(expr)
  const rawTokens = tokenizeExpression(flatExpr)
  const tokenStream: BloggerExpressionTokenInfo[] = rawTokens.map(t => ({
    value: t.value,
    tokenType: t.tokenType,
    tokensConsumed: t.tokensConsumed,
  }))
  const totalTokens = tokenStream.reduce((acc, t) => acc + t.tokensConsumed, 0)

  let status: BloggerExpressionBudgetStatus
  let isValid: boolean
  let recommendation: string

  if (totalTokens > COMPILER_QUOTA_LIMIT) {
    status = 'EXCEEDED'
    isValid = false
    recommendation = `CRITICAL: Expression uses ${totalTokens} tokens (limit is ${COMPILER_QUOTA_LIMIT}). Blogger compiler will abort with a fatal 'Invalid expression' error. Decompose using <b:with value='...' var='...'>.`
  }
  else if (totalTokens >= COMPILER_QUOTA_WARNING) {
    status = 'WARNING'
    isValid = true
    recommendation = `CAUTION: Expression uses ${totalTokens} tokens (limit is ${COMPILER_QUOTA_LIMIT}). Approaching compiler ceiling. Consider decomposing with <b:with> for safety.`
  }
  else {
    status = 'SAFE'
    isValid = true
    recommendation = `SAFE: Expression consumes ${totalTokens}/${COMPILER_QUOTA_LIMIT} tokens.`
  }

  return {
    expression: flatExpr,
    totalTokens,
    isValid,
    status,
    tokenStream,
    recommendation,
  }
}

export const analyzeExpressionBudget = evaluateExpressionBudget
