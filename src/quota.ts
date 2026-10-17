/* eslint-disable import/no-mutable-exports */
import type { BloggerExpressionNode } from './ast.js'
import type { SpecCatalog } from './catalogs/index.js'
import type {
  BloggerExpressionBudgetResult,
  BloggerExpressionBudgetStatus,
  BloggerExpressionToken,
  BloggerExpressionTokenInfo,
} from './types.js'
import { getSpecCatalog, registerCacheResetListener } from './catalogs/index.js'
import {
  flattenMultilineExpression,
  Lexer,
  unescapeXmlEntities,
} from './parser/lexer.js'

export let COMPILER_QUOTA_LIMIT = getSpecCatalog().getExpressionQuotaLimit()
export let COMPILER_QUOTA_WARNING = getSpecCatalog().getExpressionQuotaWarning()
export let COMPILER_NESTING_LIMIT = getSpecCatalog().getDirectiveNestingLimit()

registerCacheResetListener(() => {
  try {
    const spec = getSpecCatalog()
    COMPILER_QUOTA_LIMIT = spec.getExpressionQuotaLimit()
    COMPILER_QUOTA_WARNING = spec.getExpressionQuotaWarning()
    COMPILER_NESTING_LIMIT = spec.getDirectiveNestingLimit()
  }
  catch {
    // Retain defaults if the active store does not have operators/directives
  }
})

export {
  flattenMultilineExpression,
  unescapeXmlEntities,
}

export function forEachExpressionToken(
  expr: string,
  catalog: SpecCatalog = getSpecCatalog(),
  callback: (token: BloggerExpressionToken) => void,
): void {
  const flattened = flattenMultilineExpression(expr)
  const s = unescapeXmlEntities(flattened)
  if (!s.trim()) {
    return
  }

  const rawTokens = new Lexer(s).tokenize()
  const ternaryStack = [0]
  const inObjectStack = [false]

  let lastToken: BloggerExpressionToken | undefined
  let prevToken: BloggerExpressionToken | undefined
  let tokenCount = 0

  const emit = (tok: BloggerExpressionToken) => {
    prevToken = lastToken
    lastToken = tok
    tokenCount++
    callback(tok)
  }

  let i = 0
  while (i < rawTokens.length) {
    const token = rawTokens[i]!
    if (token.type === 'EOF') {
      break
    }

    if (token.type === 'STRING') {
      emit({
        value: token.rawValue ?? token.value,
        tokenType: 'STRING_LITERAL',
        tokensConsumed: 1,
        pos: token.start.offset,
      })
      i++
      continue
    }

    if (token.type === 'NUMBER') {
      emit({
        value: token.value,
        tokenType: 'NUMBER_LITERAL',
        tokensConsumed: 1,
        pos: token.start.offset,
      })
      i++
      continue
    }

    if (token.type === 'MINUS') {
      const nextToken = rawTokens[i + 1]
      const isUnaryMinus = (tokenCount === 0
        || lastToken!.tokenType.startsWith('OPERATOR_')
        || [
          'GROUPING_PAREN_OPEN',
          'CONTAINER_ARRAY',
          'CONTAINER_OBJECT',
          'DELIMITER_COMMA',
          'DELIMITER_COLON',
        ].includes(lastToken!.tokenType)
      ) && nextToken?.type === 'NUMBER' && nextToken.start.offset === token.end.offset

      if (isUnaryMinus) {
        emit({
          value: `-${nextToken.value}`,
          tokenType: 'NUMBER_LITERAL',
          tokensConsumed: 1,
          pos: token.start.offset,
        })
        i += 2
        continue
      }
      emit({
        value: '-',
        tokenType: 'OPERATOR_ARITHMETIC',
        tokensConsumed: catalog.getOperator('-')?.token_cost ?? 1,
        pos: token.start.offset,
      })
      i++
      continue
    }

    if (token.type === 'PLUS' || token.type === 'STAR' || token.type === 'SLASH' || token.type === 'PERCENT') {
      emit({
        value: token.value,
        tokenType: 'OPERATOR_ARITHMETIC',
        tokensConsumed: catalog.getOperator(token.value)?.token_cost ?? 1,
        pos: token.start.offset,
      })
      i++
      continue
    }

    if (token.type === 'EQ' || token.type === 'NEQ' || token.type === 'LT' || token.type === 'GT' || token.type === 'LTE' || token.type === 'GTE') {
      emit({
        value: token.value,
        tokenType: 'OPERATOR_RELATIONAL',
        tokensConsumed: catalog.getOperator(token.value)?.token_cost ?? 1,
        pos: token.start.offset,
      })
      i++
      continue
    }

    if (token.type === 'ELVIS') {
      emit({
        value: '?:',
        tokenType: 'OPERATOR_ELVIS',
        tokensConsumed: catalog.getOperator('?:')?.token_cost ?? 1,
        pos: token.start.offset,
      })
      i++
      continue
    }

    if (token.type === 'ARROW') {
      emit({
        value: '=>',
        tokenType: 'OPERATOR_LAMBDA',
        tokensConsumed: 1,
        pos: token.start.offset,
      })
      i++
      continue
    }

    if (token.type === 'AND' || token.type === 'OR') {
      emit({
        value: token.value,
        tokenType: 'OPERATOR_LOGICAL_JS',
        tokensConsumed: catalog.getOperator(token.value)?.token_cost ?? 1,
        pos: token.start.offset,
      })
      i++
      continue
    }

    if (token.type === 'BANG') {
      emit({
        value: '!',
        tokenType: 'OPERATOR_LOGICAL',
        tokensConsumed: catalog.getOperator('!')?.token_cost ?? 1,
        pos: token.start.offset,
      })
      i++
      continue
    }

    if (token.type === 'LBRACE') {
      emit({
        value: '{',
        tokenType: 'CONTAINER_OBJECT',
        tokensConsumed: 1,
        pos: token.start.offset,
      })
      inObjectStack.push(true)
      i++
      continue
    }

    if (token.type === 'RBRACE') {
      emit({
        value: '}',
        tokenType: 'CONTAINER_OBJECT_CLOSE',
        tokensConsumed: 0,
        pos: token.start.offset,
      })
      if (inObjectStack.length > 1) {
        inObjectStack.pop()
      }
      i++
      continue
    }

    if (token.type === 'LBRACKET') {
      emit({
        value: '[',
        tokenType: 'CONTAINER_ARRAY',
        tokensConsumed: 1,
        pos: token.start.offset,
      })
      i++
      continue
    }

    if (token.type === 'RBRACKET') {
      emit({
        value: ']',
        tokenType: 'CONTAINER_ARRAY_CLOSE',
        tokensConsumed: 0,
        pos: token.start.offset,
      })
      i++
      continue
    }

    if (token.type === 'COMMA') {
      emit({
        value: ',',
        tokenType: 'DELIMITER_COMMA',
        tokensConsumed: 0,
        pos: token.start.offset,
      })
      i++
      continue
    }

    if (token.type === 'QUESTION') {
      ternaryStack[ternaryStack.length - 1]! += 1
      emit({
        value: '?',
        tokenType: 'OPERATOR_TERNARY_SELECT',
        tokensConsumed: 1,
        pos: token.start.offset,
      })
      i++
      continue
    }

    if (token.type === 'COLON') {
      if (ternaryStack[ternaryStack.length - 1]! > 0) {
        ternaryStack[ternaryStack.length - 1]! -= 1
        emit({
          value: ':',
          tokenType: 'OPERATOR_TERNARY_BRANCH',
          tokensConsumed: 1,
          pos: token.start.offset,
        })
      }
      else {
        emit({
          value: ':',
          tokenType: 'DELIMITER_COLON',
          tokensConsumed: 0,
          pos: token.start.offset,
        })
      }
      i++
      continue
    }

    if (token.type === 'LPAREN') {
      ternaryStack.push(0)
      const isNonFunctionalPrefix
        = lastToken !== undefined
          && (lastToken.value === '!' || lastToken.value.toLowerCase() === 'not')

      const isPrefixContext
        = tokenCount === 1
          || (prevToken !== undefined
            && (prevToken.tokenType === 'DELIMITER_COMMA'
              || prevToken.tokenType === 'GROUPING_PAREN_OPEN'
              || prevToken.tokenType === 'CONTAINER_ARRAY'
              || prevToken.tokenType === 'DELIMITER_COLON'
              || prevToken.tokenType.startsWith('OPERATOR_')))

      const lastWord = lastToken?.value.toLowerCase()
      const lastOp = lastWord ? catalog.getOperator(lastWord) : undefined
      const isFunctionalCall
        = tokenCount > 0
          && !isNonFunctionalPrefix
          && (lastToken!.tokenType === 'NATIVE_FUNCTION'
            || lastToken!.tokenType === 'OPERATOR_LAMBDA'
            || lastOp?.family === 'lambda'
            || (lastToken!.tokenType.startsWith('OPERATOR_') && isPrefixContext))

      const cost = isFunctionalCall ? 0 : 1
      emit({
        value: '(',
        tokenType: 'GROUPING_PAREN_OPEN',
        tokensConsumed: cost,
        pos: token.start.offset,
      })
      i++
      continue
    }

    if (token.type === 'RPAREN') {
      if (ternaryStack.length > 1) {
        ternaryStack.pop()
      }
      emit({
        value: ')',
        tokenType: 'GROUPING_PAREN_CLOSE',
        tokensConsumed: 0,
        pos: token.start.offset,
      })
      i++
      continue
    }

    if (token.type === 'DATA_PREFIX') {
      const startOffset = token.start.offset
      let lastConsumed = token
      i++ // skip 'data:'

      if (rawTokens[i]?.type === 'IDENTIFIER') {
        lastConsumed = rawTokens[i]!
        i++
      }

      while (i < rawTokens.length) {
        if (rawTokens[i]?.type === 'DOT' && rawTokens[i + 1]?.type === 'IDENTIFIER') {
          lastConsumed = rawTokens[i + 1]!
          i += 2
        }
        else if (rawTokens[i]?.type === 'LBRACKET') {
          let bDepth = 1
          i++
          while (i < rawTokens.length && bDepth > 0) {
            if (rawTokens[i]!.type === 'LBRACKET') {
              bDepth++
            }
            else if (rawTokens[i]!.type === 'RBRACKET') {
              bDepth--
            }
            lastConsumed = rawTokens[i]!
            i++
          }
        }
        else {
          break
        }
      }

      const val = s.slice(startOffset, lastConsumed.end.offset)
      emit({
        value: val,
        tokenType: 'DATA_PATH',
        tokensConsumed: 1,
        pos: startOffset,
      })
      continue
    }

    if (token.type === 'DOT') {
      const nextToken = rawTokens[i + 1]
      if (nextToken?.type === 'IDENTIFIER' && nextToken.start.offset === token.end.offset) {
        emit({
          value: `.${nextToken.value}`,
          tokenType: 'IDENTIFIER',
          tokensConsumed: 1,
          pos: token.start.offset,
        })
        i += 2
        continue
      }
      emit({
        value: '.',
        tokenType: 'IDENTIFIER',
        tokensConsumed: 1,
        pos: token.start.offset,
      })
      i++
      continue
    }

    if (token.type === 'BOOLEAN' || token.type === 'NULL') {
      emit({
        value: token.value,
        tokenType: 'BOOLEAN_LITERAL',
        tokensConsumed: 1,
        pos: token.start.offset,
      })
      i++
      continue
    }

    if (token.type === 'IDENTIFIER') {
      const nextToken = rawTokens[i + 1]
      const isObjectKey
        = inObjectStack[inObjectStack.length - 1]
          && nextToken?.type === 'COLON'
          && ternaryStack[ternaryStack.length - 1] === 0
          && (!lastToken
            || lastToken.tokenType === 'CONTAINER_OBJECT'
            || lastToken.tokenType === 'DELIMITER_COMMA')

      if (isObjectKey) {
        emit({
          value: token.value,
          tokenType: 'OBJECT_KEY',
          tokensConsumed: 0,
          pos: token.start.offset,
        })
        i++
        continue
      }

      const opDef = catalog.getOperator(token.value)
      const isPrefixContext
        = tokenCount === 0
          || lastToken === undefined
          || lastToken.tokenType === 'DELIMITER_COMMA'
          || lastToken.tokenType === 'GROUPING_PAREN_OPEN'
          || lastToken.tokenType === 'CONTAINER_ARRAY'
          || lastToken.tokenType === 'DELIMITER_COLON'
          || lastToken.tokenType.startsWith('OPERATOR_')

      if (
        nextToken?.type === 'LPAREN'
        && opDef?.syntax?.supports_functional
        && opDef.family !== 'lambda'
        && (isPrefixContext || !['comparison', 'logical', 'arithmetic'].includes(opDef.family))
      ) {
        emit({
          value: token.value,
          tokenType: 'NATIVE_FUNCTION',
          tokensConsumed: opDef?.token_cost ?? 1,
          pos: token.start.offset,
        })
      }
      else if (opDef?.family === 'comparison') {
        emit({
          value: token.value,
          tokenType: 'OPERATOR_RELATIONAL',
          tokensConsumed: opDef?.token_cost ?? 1,
          pos: token.start.offset,
        })
      }
      else if (opDef?.family === 'logical') {
        emit({
          value: token.value,
          tokenType: 'OPERATOR_LOGICAL',
          tokensConsumed: opDef?.token_cost ?? 1,
          pos: token.start.offset,
        })
      }
      else if (opDef?.family === 'membership' || opDef?.family === 'content') {
        emit({
          value: token.value,
          tokenType: 'OPERATOR_MEMBERSHIP',
          tokensConsumed: opDef?.token_cost ?? 1,
          pos: token.start.offset,
        })
      }
      else if (opDef?.family === 'lambda') {
        emit({
          value: token.value,
          tokenType: 'OPERATOR_LAMBDA',
          tokensConsumed: opDef?.token_cost ?? 1,
          pos: token.start.offset,
        })
      }
      else if (opDef?.family === 'collection') {
        emit({
          value: token.value,
          tokenType: 'OPERATOR_COLLECTION',
          tokensConsumed: opDef?.token_cost ?? 1,
          pos: token.start.offset,
        })
      }
      else {
        emit({
          value: token.value,
          tokenType: 'IDENTIFIER',
          tokensConsumed: 1,
          pos: token.start.offset,
        })
      }
      i++
      continue
    }

    i++
  }
}

export function tokenizeExpression(
  expr: string,
  catalog: SpecCatalog = getSpecCatalog(),
): BloggerExpressionToken[] {
  const tokens: BloggerExpressionToken[] = []
  forEachExpressionToken(expr, catalog, tok => tokens.push(tok))
  return tokens
}

export const tokenizeExpressionTokens = tokenizeExpression

export function countExpressionTokens(
  expr: string | BloggerExpressionNode,
  catalog: SpecCatalog = getSpecCatalog(),
): number {
  if (typeof expr === 'string') {
    const trimmed = expr.trim()
    if (!trimmed) {
      return 0
    }
    let total = 0
    forEachExpressionToken(trimmed, catalog, (tok) => {
      total += tok.tokensConsumed
    })
    return total
  }

  if (typeof expr === 'object' && expr !== null) {
    const node = expr as BloggerExpressionNode
    switch (node.type) {
      case 'Literal':
      case 'Identifier':
      case 'DataPath':
        return 1
      case 'UnaryExpression':
        return 1 + countExpressionTokens(node.argument, catalog)
      case 'BinaryExpression':
      case 'LogicalExpression':
        return countExpressionTokens(node.left, catalog) + countExpressionTokens(node.right, catalog) + 1
      case 'ConditionalExpression':
        if (node.isElvis) {
          return countExpressionTokens(node.test, catalog) + countExpressionTokens(node.consequent, catalog) + 1
        }
        return (
          countExpressionTokens(node.test, catalog)
          + countExpressionTokens(node.consequent, catalog)
          + (node.alternate ? countExpressionTokens(node.alternate, catalog) : 0)
          + 2
        )
      case 'CallExpression':
        return 1 + node.arguments.reduce((acc, arg) => acc + countExpressionTokens(arg, catalog), 0)
      case 'LambdaExpression':
        return (
          countExpressionTokens(node.callee, catalog)
          + 3 // lambda keyword + parameter + '=>'
          + countExpressionTokens(node.body, catalog)
        )
      case 'ObjectExpression':
        return 1 + node.properties.reduce((acc, prop) => acc + countExpressionTokens(prop.value, catalog), 0)
      case 'ArrayExpression':
        return 1 + node.elements.reduce((acc, elem) => acc + countExpressionTokens(elem, catalog), 0)
      case 'MemberExpression':
        return countExpressionTokens(node.object, catalog) + 1
      default:
        return 1
    }
  }

  return 0
}

export function evaluateExpressionBudget(
  expr: string,
  catalog: SpecCatalog = getSpecCatalog(),
): BloggerExpressionBudgetResult {
  const flatExpr = flattenMultilineExpression(expr)
  const rawTokens = tokenizeExpression(flatExpr, catalog)
  const tokenStream: BloggerExpressionTokenInfo[] = rawTokens.map(t => ({
    value: t.value,
    tokenType: t.tokenType,
    tokensConsumed: t.tokensConsumed,
  }))
  const totalTokens = tokenStream.reduce((acc, t) => acc + t.tokensConsumed, 0)

  const quotaLimit = catalog.getExpressionQuotaLimit()
  const quotaWarning = catalog.getExpressionQuotaWarning()

  let status: BloggerExpressionBudgetStatus
  let isValid: boolean
  let recommendation: string

  if (totalTokens > quotaLimit) {
    status = 'EXCEEDED'
    isValid = false
    recommendation = `CRITICAL: Expression uses ${totalTokens} tokens (limit is ${quotaLimit}). Blogger compiler will abort with a fatal 'Invalid expression' error. Decompose using <b:with value='...' var='...'>.`
  }
  else if (totalTokens >= quotaWarning) {
    status = 'WARNING'
    isValid = true
    recommendation = `CAUTION: Expression uses ${totalTokens} tokens (limit is ${quotaLimit}). Approaching compiler ceiling. Consider decomposing with <b:with> for safety.`
  }
  else {
    status = 'SAFE'
    isValid = true
    recommendation = `SAFE: Expression consumes ${totalTokens}/${quotaLimit} tokens.`
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
