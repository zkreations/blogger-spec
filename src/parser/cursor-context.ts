import type { BloggerCursorContext } from '../types.js'

function findPrecedingParenthesizedExpression(text: string, dotIndex: number): string | undefined {
  let depth = 0
  let end = -1
  for (let i = dotIndex - 1; i >= 0; i--) {
    const ch = text[i]
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      if (end === -1) {
        continue
      }
    }
    if (end === -1 && ch === ')') {
      end = i + 1
      depth = 1
      continue
    }
    if (end !== -1) {
      if (ch === ')') {
        depth++
      }
      else if (ch === '(') {
        depth--
        if (depth === 0) {
          return text.slice(i, end).trim()
        }
      }
    }
    else {
      break
    }
  }
  return undefined
}

function extractPrecedingOperand(text: string): string {
  const trimmed = text.trim()
  if (trimmed.endsWith(')')) {
    const parenExpr = findPrecedingParenthesizedExpression(trimmed, trimmed.length)
    if (parenExpr) {
      return parenExpr
    }
  }
  const match = trimmed.match(/([a-z_][\w:]*(?:\.[a-z_]\w*)*)$/i)
  return match ? match[1]! : trimmed
}

export function getExpressionCursorContext(
  expressionText: string,
  cursorOffset: number,
): BloggerCursorContext {
  const safeOffset = Math.max(0, Math.min(cursorOffset, expressionText.length))
  const textBefore = expressionText.slice(0, safeOffset)

  // 1. Check if inside a lambda header before the arrow =>
  const lastOpenParen = textBefore.lastIndexOf('(')
  if (lastOpenParen !== -1) {
    const beforeParen = textBefore.slice(0, lastOpenParen).trimEnd()
    const kwMatch = beforeParen.match(/\b(first|last|filter|where|any|all|count|map|select)$/i)
    if (kwMatch) {
      const collectionOperand = beforeParen.slice(0, kwMatch.index).trim()
      const inner = textBefore.slice(lastOpenParen + 1)
      if (!inner.includes('=>')) {
        const paramMatch = inner.match(/^\s*([a-z_]\w*)\s*$/i)

        if (!inner.trim()) {
          return {
            offset: safeOffset,
            expectedKind: 'lambda_param',
            enclosingLambda: {
              isWaitingParam: true,
              collectionOperand,
              paramName: undefined,
            },
            leftOperand: collectionOperand,
          }
        }

        if (paramMatch && inner.endsWith(' ')) {
          const paramName = paramMatch[1]!
          return {
            offset: safeOffset,
            expectedKind: 'lambda_arrow',
            enclosingLambda: {
              paramName,
              isWaitingForArrow: true,
              collectionOperand,
            },
            leftOperand: paramName,
          }
        }
      }
    }
  }

  // Find all active lambda parameters in the expression for enclosing context
  const activeParams: string[] = []
  const lambdaArrowRegex = /\(\s*([a-z_]\w*)\s*=>/gi
  for (const arrowMatch of textBefore.matchAll(lambdaArrowRegex)) {
    activeParams.push(arrowMatch[1]!)
  }
  const lastParam = activeParams.length > 0 ? activeParams[activeParams.length - 1] : undefined

  // 2. Member navigation after a dot: e.g. "p.", "p.au", "p.author.", "(data:posts.first).tit"
  const dotMemberMatch = textBefore.match(/\.([a-z_]\w*)?$/i)
  if (dotMemberMatch) {
    const partialMember = dotMemberMatch[1] || ''
    const beforeDot = textBefore.slice(0, dotMemberMatch.index!)

    let leftOperand: string
    let memberChain: string[] | undefined

    const parenExpr = findPrecedingParenthesizedExpression(textBefore, dotMemberMatch.index!)
    if (parenExpr) {
      leftOperand = parenExpr
    }
    else {
      const matchChain = beforeDot.match(/([a-z_][\w:]*(?:\.[a-z_]\w*)*)$/i)
      if (matchChain) {
        leftOperand = matchChain[1]!
        const parts = leftOperand.split('.')
        if (parts.length > 1) {
          memberChain = parts.slice(1)
        }
      }
      else {
        leftOperand = beforeDot.trim()
      }
    }

    return {
      offset: safeOffset,
      expectedKind: 'member',
      leftOperand,
      partialMember,
      memberChain,
      enclosingLambda: lastParam ? { paramName: lastParam } : undefined,
    }
  }

  // 3. Elvis operator: e.g. "data:view.description ?: "
  if (textBefore.endsWith('?:') || /\?:\s*$/.test(textBefore)) {
    const elvisIdx = textBefore.lastIndexOf('?:')
    const leftOperand = extractPrecedingOperand(textBefore.slice(0, elvisIdx))
    return {
      offset: safeOffset,
      expectedKind: 'expression',
      leftOperand,
      partialOperator: '?:',
      enclosingLambda: lastParam ? { paramName: lastParam } : undefined,
    }
  }

  // 4. Ternary operator: e.g. "data:post.hasOlderPage ? \"Yes\" : "
  if (/\?[^:]+:\s*$/.test(textBefore)) {
    return {
      offset: safeOffset,
      expectedKind: 'expression',
      enclosingLambda: lastParam ? { paramName: lastParam } : undefined,
    }
  }

  // 5. Binary or comparison operator followed by space:
  const binOpMatch = textBefore.match(/(==|!=|<=|>=|[<>+\-*/]|&&|\|\|)\s+$/)
  if (binOpMatch && binOpMatch.index !== undefined) {
    const leftOperand = extractPrecedingOperand(textBefore.slice(0, binOpMatch.index))
    return {
      offset: safeOffset,
      expectedKind: 'expression',
      leftOperand,
      partialOperator: binOpMatch[1],
      enclosingLambda: lastParam ? { paramName: lastParam } : undefined,
    }
  }

  // 6. Partial operator typing: e.g. "data:posts filt"
  const spaceIdx = textBefore.lastIndexOf(' ')
  if (spaceIdx !== -1) {
    const word = textBefore.slice(spaceIdx + 1)
    if (/^[a-z_]\w*$/i.test(word) && !textBefore.endsWith('.')) {
      const leftOperand = extractPrecedingOperand(textBefore.slice(0, spaceIdx))
      return {
        offset: safeOffset,
        expectedKind: 'operator',
        leftOperand,
        partialOperator: word,
        enclosingLambda: lastParam ? { paramName: lastParam } : undefined,
      }
    }
  }

  // Default fallback
  const fallbackOperand = extractPrecedingOperand(textBefore)
  return {
    offset: safeOffset,
    expectedKind: 'none',
    leftOperand: fallbackOperand || undefined,
    enclosingLambda: lastParam ? { paramName: lastParam } : undefined,
  }
}
