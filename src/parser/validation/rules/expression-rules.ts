import type { BloggerExpressionNode } from '../../../ast.js'
import type { SpecCatalog } from '../../../catalogs/index.js'
import type { BloggerSkinVariableSymbol } from '../../../data-path.js'
import type {
  BloggerDiagnosticSeverity,
  BloggerDirectiveToken,
  BloggerStructureDiagnostic,
} from '../../../types.js'
import type { Token } from '../../lexer.js'
import type { BloggerExpressionValidationContext } from '../types.js'
import { getSpecCatalog } from '../../../catalogs/index.js'
import { resolveDataPath } from '../../../data-path.js'
import { evaluateExpressionBudget } from '../../../quota.js'
import { scanDirectiveTokens } from '../../directive-scanner.js'
import { parseExpression } from '../../expr-parser.js'
import { tokenize, unescapeXmlEntitiesWithSourceMap } from '../../lexer.js'
import { checkSkinVarSubpath, collectSkinVariablesFromTokens, pushDiagnostic } from '../helpers.js'

const INFIX_OPERATOR_TOKEN_TYPES = new Set<string>([
  'PLUS',
  'MINUS',
  'STAR',
  'SLASH',
  'PERCENT',
  'EQ',
  'NEQ',
  'STRICT_EQ',
  'STRICT_NEQ',
  'LT',
  'GT',
  'LTE',
  'GTE',
  'AND',
  'OR',
  'ELVIS',
  'QUESTION',
])

const OPERAND_END_TOKEN_TYPES = new Set<string>([
  'NUMBER',
  'STRING',
  'BOOLEAN',
  'NULL',
  'IDENTIFIER',
  'RPAREN',
  'RBRACKET',
  'RBRACE',
])

function walkExpressionAst(node: BloggerExpressionNode, visitor: (n: BloggerExpressionNode) => void): void {
  visitor(node)
  switch (node.type) {
    case 'UnaryExpression':
      walkExpressionAst(node.argument, visitor)
      break
    case 'BinaryExpression':
    case 'LogicalExpression':
      walkExpressionAst(node.left, visitor)
      walkExpressionAst(node.right, visitor)
      break
    case 'ConditionalExpression':
      walkExpressionAst(node.test, visitor)
      walkExpressionAst(node.consequent, visitor)
      if (node.alternate) {
        walkExpressionAst(node.alternate, visitor)
      }
      break
    case 'CallExpression':
      for (const arg of node.arguments) {
        walkExpressionAst(arg, visitor)
      }
      break
    case 'LambdaExpression':
      walkExpressionAst(node.callee, visitor)
      walkExpressionAst(node.body, visitor)
      break
    case 'ObjectExpression':
      for (const prop of node.properties) {
        walkExpressionAst(prop.value, visitor)
      }
      break
    case 'ArrayExpression':
      for (const elem of node.elements) {
        walkExpressionAst(elem, visitor)
      }
      break
    case 'MemberExpression':
      walkExpressionAst(node.object, visitor)
      if (node.property.type !== 'Identifier') {
        walkExpressionAst(node.property, visitor)
      }
      break
  }
}

function getExpressionPath(node: BloggerExpressionNode): string | undefined {
  if (node.type === 'Identifier') {
    return node.name
  }
  if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
    const objPath = getExpressionPath(node.object)
    return objPath ? `${objPath}.${node.property.name}` : node.property.name
  }
  return undefined
}

function isDateExpressionNode(node: BloggerExpressionNode, catalog: SpecCatalog): boolean {
  if (node.type === 'DataPath') {
    const raw = node.raw || ''
    const cleanPath = raw.startsWith('data:') ? raw.slice(5) : raw
    if (cleanPath.endsWith('.date') || cleanPath === 'date') {
      return true
    }
    const lastMember = node.members[node.members.length - 1]
    if (lastMember?.property) {
      const p = lastMember.property.toLowerCase()
      if (p === 'date' || p === 'published' || p === 'lastmodified') {
        return true
      }
    }
    const resolved = resolveDataPath(cleanPath, { catalog })
    if (resolved?.type === 'date') {
      return true
    }
    return false
  }

  if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
    const propName = node.property.name.toLowerCase()
    if (propName === 'date' || propName === 'published' || propName === 'lastmodified' || propName === 'timestamp') {
      return true
    }
  }
  const fullPath = getExpressionPath(node)
  if (fullPath) {
    const cleanPath = fullPath.startsWith('data:') ? fullPath.slice(5) : fullPath
    if (cleanPath.endsWith('.date') || cleanPath === 'date') {
      return true
    }
    const resolved = resolveDataPath(cleanPath, { catalog })
    if (resolved?.type === 'date') {
      return true
    }
  }
  return false
}

export function validateExpression(
  exprText: string,
  catalog: SpecCatalog = getSpecCatalog(),
  context?: BloggerExpressionValidationContext,
): BloggerStructureDiagnostic[] {
  const diagnostics: BloggerStructureDiagnostic[] = []
  const tagName = context?.tagName ?? 'expression'
  const baseStart = context?.valueStart ?? context?.tagStart ?? 0
  const baseEnd = context?.valueEnd ?? context?.tagEnd ?? exprText.length

  const fakeToken: BloggerDirectiveToken = {
    attributes: {},
    attributesOffset: baseStart,
    attributesText: '',
    hasSelfClosingSlash: true,
    isClosing: false,
    isSelfClosing: true,
    rawAttributesText: '',
    tagEnd: context?.tagEnd ?? baseEnd,
    tagName,
    tagStart: context?.tagStart ?? baseStart,
  }

  const { unescaped, mapOffset } = unescapeXmlEntitiesWithSourceMap(exprText)
  const trimmed = unescaped.trim()
  if (!trimmed) {
    return diagnostics
  }

  // 1. Compiler token quota budget check (BX1021 / BX1045)
  const budget = evaluateExpressionBudget(unescaped, catalog)
  if (budget.status === 'EXCEEDED') {
    const diagCode = catalog.getExpressionQuotaDiagnostic() ?? 'BX1021'
    pushDiagnostic(diagnostics, catalog, diagCode, fakeToken, {
      attribute: context?.attributeName,
      end: baseEnd,
      message: `Expression consumes ${budget.totalTokens} tokens, exceeding the compiler limit of ${catalog.getExpressionQuotaLimit()}.`,
      start: baseStart,
    })
  }
  else if (budget.status === 'WARNING') {
    const warnDiagCode = catalog.getExpressionQuotaWarningDiagnostic() ?? 'BX1045'
    pushDiagnostic(diagnostics, catalog, warnDiagCode, fakeToken, {
      attribute: context?.attributeName,
      end: baseEnd,
      message: `Expression consumes ${budget.totalTokens} tokens, approaching the compiler ceiling of ${catalog.getExpressionQuotaLimit()} (warning threshold is ${catalog.getExpressionQuotaWarning()}).`,
      start: baseStart,
    })
  }

  // 2. Tokenize expression to evaluate lexical / grammatical anti-patterns
  let tokens: Token[] = []
  try {
    tokens = tokenize(unescaped)
  }
  catch {
    // If tokenization failed on syntax, continue with partial analysis
  }

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]!

    // BX1055: Logical AND operator (&& / &amp;&amp;)
    if (tok.type === 'AND' && tok.value === '&&') {
      const rawStart = mapOffset(tok.start.offset)
      const rawEnd = mapOffset(tok.end.offset)
      const rawText = exprText.slice(rawStart, rawEnd)
      const isEscaped = rawText.includes('&amp;') || rawText.includes('&#')
      const severity: BloggerDiagnosticSeverity = isEscaped ? 'warning' : 'error'
      const message = isEscaped
        ? `Logical AND operator '${rawText}' reduces code readability. Use 'and' instead.`
        : `Logical AND operator '&&' causes XML parsing errors because '&' is not escaped. Use 'and' instead.`
      const start = baseStart + rawStart
      const end = baseStart + rawEnd

      pushDiagnostic(diagnostics, catalog, 'BX1055', fakeToken, {
        attribute: context?.attributeName,
        end,
        fixes: [{
          edits: [{ end, newText: 'and', start }],
          isPreferred: true,
          title: `Replace '${rawText}' with 'and'`,
        }],
        message,
        severity,
        start,
        suggestedReplacement: 'and',
      })
    }

    // BX1018: Strict equality operator (===, !==)
    if (tok.type === 'STRICT_EQ' || tok.type === 'STRICT_NEQ') {
      const replacement = tok.type === 'STRICT_EQ' ? '==' : '!='
      const start = baseStart + mapOffset(tok.start.offset)
      const end = baseStart + mapOffset(tok.end.offset)
      pushDiagnostic(diagnostics, catalog, 'BX1018', fakeToken, {
        attribute: context?.attributeName,
        end,
        fixes: [{
          edits: [{ end, newText: replacement, start }],
          isPreferred: true,
          title: `Replace '${tok.value}' with '${replacement}'`,
        }],
        message: `Strict equality operator '${tok.value}' is prohibited in Blogger expressions; use == or !=.`,
        start,
        suggestedReplacement: replacement,
      })
    }

    // BX1020: Prohibited Literal Null
    if (tok.type === 'NULL') {
      pushDiagnostic(diagnostics, catalog, 'BX1020', fakeToken, {
        attribute: context?.attributeName,
        end: baseStart + mapOffset(tok.end.offset),
        message: `Literal 'null' is not supported in Blogger expressions.`,
        start: baseStart + mapOffset(tok.start.offset),
      })
    }

    // BX1017: Prohibited JavaScript method call (.method(...))
    if (tok.type === 'DOT' && i + 2 < tokens.length) {
      const next1 = tokens[i + 1]!
      const next2 = tokens[i + 2]!
      if (next1.type === 'IDENTIFIER' && next2.type === 'LPAREN') {
        pushDiagnostic(diagnostics, catalog, 'BX1017', fakeToken, {
          attribute: context?.attributeName,
          end: baseStart + mapOffset(next2.end.offset),
          message: `JavaScript method call '.${next1.value}()' is prohibited in Blogger expressions. Use native operators and helpers.`,
          start: baseStart + mapOffset(tok.start.offset),
        })
      }
    }

    // BX1019: Prohibited Lambda Data Prefix (p => data:p.prop)
    if (tok.type === 'IDENTIFIER' && i + 1 < tokens.length && tokens[i + 1]!.type === 'ARROW') {
      const paramName = tok.value
      for (let j = i + 2; j < tokens.length; j++) {
        if (tokens[j]!.type === 'DATA_PREFIX' && j + 1 < tokens.length) {
          const nextTok = tokens[j + 1]!
          if (nextTok.type === 'IDENTIFIER' && nextTok.value === paramName) {
            pushDiagnostic(diagnostics, catalog, 'BX1019', fakeToken, {
              attribute: context?.attributeName,
              end: baseStart + mapOffset(nextTok.end.offset),
              message: `Using 'data:' prefix on lambda iterator property 'data:${paramName}' is redundant. Access properties directly (${paramName}.prop).`,
              start: baseStart + mapOffset(tokens[j]!.start.offset),
              suggestedReplacement: paramName,
            })
          }
        }
      }
    }

    // BX1030: Prohibited Unary Minus on Compound Expressions (-(...))
    if (tok.type === 'MINUS' && i + 1 < tokens.length && tokens[i + 1]!.type === 'LPAREN') {
      const isPrefix = i === 0 || ['LPAREN', 'COMMA', 'COLON', 'QUESTION', 'ELVIS', 'PLUS', 'MINUS', 'STAR', 'SLASH', 'PERCENT', 'EQ', 'NEQ', 'STRICT_EQ', 'STRICT_NEQ', 'LT', 'GT', 'LTE', 'GTE', 'AND', 'OR', 'BANG'].includes(tokens[i - 1]!.type)
      if (isPrefix) {
        let parenDepth = 0
        let closeParenIndex = -1
        for (let j = i + 1; j < tokens.length; j++) {
          if (tokens[j]!.type === 'LPAREN') {
            parenDepth++
          }
          else if (tokens[j]!.type === 'RPAREN') {
            parenDepth--
            if (parenDepth === 0) {
              closeParenIndex = j
              break
            }
          }
        }

        if (closeParenIndex !== -1) {
          const innerTokens = tokens.slice(i + 2, closeParenIndex)

          // 1. Discard functional calls with multiple arguments (e.g. -(-1, 5) or -(a, b))
          let innerNesting = 0
          let hasRootComma = false
          let hasRootInfixOp = false
          let prevAtDepth0: Token | null = null

          for (const it of innerTokens) {
            if (it.type === 'LPAREN' || it.type === 'LBRACKET' || it.type === 'LBRACE') {
              innerNesting++
              continue
            }
            if (it.type === 'RPAREN' || it.type === 'RBRACKET' || it.type === 'RBRACE') {
              innerNesting--
              if (innerNesting === 0) {
                prevAtDepth0 = it
              }
              continue
            }
            if (innerNesting === 0) {
              if (it.type === 'COMMA') {
                hasRootComma = true
                break
              }

              const isInfixToken = INFIX_OPERATOR_TOKEN_TYPES.has(it.type) || (
                it.type === 'IDENTIFIER' && (it.value.toLowerCase() === 'and' || it.value.toLowerCase() === 'or')
              )

              const prevCanBeOperandEnd = prevAtDepth0 != null && OPERAND_END_TOKEN_TYPES.has(prevAtDepth0.type)

              if (isInfixToken && prevCanBeOperandEnd) {
                hasRootInfixOp = true
              }

              prevAtDepth0 = it
            }
          }

          if (!hasRootComma) {
            // BX1044: Empty call -() causes an unhandled backend crash (HTTP 500)
            if (tok.type === 'MINUS' && innerTokens.length === 0) {
              pushDiagnostic(diagnostics, catalog, 'BX1044', fakeToken, {
                attribute: context?.attributeName,
                end: baseStart + mapOffset(tokens[closeParenIndex]!.end.offset),
                message: `Invoking '-()' with 0 arguments triggers an unhandled backend crash (HTTP 500) on Blogger template engine.`,
                start: baseStart + mapOffset(tok.start.offset),
              })
            }
            else {
              // 2. Validate only compound binary/logical/conditional expressions
              let isCompound = hasRootInfixOp
              const innerSlice = unescaped.slice(tokens[i + 1]!.end.offset, tokens[closeParenIndex]!.start.offset).trim()

              if (innerSlice) {
                try {
                  const ast = parseExpression(innerSlice, { catalog, tolerant: true })
                  if (
                    ast.type === 'BinaryExpression'
                    || ast.type === 'LogicalExpression'
                    || ast.type === 'ConditionalExpression'
                  ) {
                    isCompound = true
                  }
                }
                catch {
                  // If parsing threw, rely on hasRootInfixOp
                }
              }

              if (isCompound) {
                pushDiagnostic(diagnostics, catalog, 'BX1030', fakeToken, {
                  attribute: context?.attributeName,
                  end: baseStart + mapOffset(tokens[closeParenIndex]!.end.offset),
                  message: `Unary prefix operator '-' cannot be applied to parenthesized compound expressions; evaluate operands separately or use native operators.`,
                  start: baseStart + mapOffset(tok.start.offset),
                })
              }
            }
          }
        }
      }
    }

    // BX1044: Fatal Operator Arity (eq() with fewer than 2 arguments triggers backend crash)
    if (
      ((tok.type === 'IDENTIFIER' && tok.value.toLowerCase() === 'eq') || tok.type === 'EQ')
      && i + 1 < tokens.length
      && tokens[i + 1]!.type === 'LPAREN'
    ) {
      let parenDepth = 0
      let closeParenIndex = -1
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j]!.type === 'LPAREN') {
          parenDepth++
        }
        else if (tokens[j]!.type === 'RPAREN') {
          parenDepth--
          if (parenDepth === 0) {
            closeParenIndex = j
            break
          }
        }
      }

      if (closeParenIndex !== -1) {
        const innerTokens = tokens.slice(i + 2, closeParenIndex)
        let innerNesting = 0
        let hasRootComma = false
        for (const it of innerTokens) {
          if (it.type === 'LPAREN' || it.type === 'LBRACKET' || it.type === 'LBRACE') {
            innerNesting++
          }
          else if (it.type === 'RPAREN' || it.type === 'RBRACKET' || it.type === 'RBRACE') {
            innerNesting--
          }
          else if (innerNesting === 0 && it.type === 'COMMA') {
            hasRootComma = true
            break
          }
        }

        if (!hasRootComma) {
          pushDiagnostic(diagnostics, catalog, 'BX1044', fakeToken, {
            attribute: context?.attributeName,
            end: baseStart + mapOffset(tokens[closeParenIndex]!.end.offset),
            message: `Invoking equality operator 'eq()' with fewer than 2 arguments triggers an unhandled backend crash (HTTP 500) on Blogger template engine.`,
            start: baseStart + mapOffset(tok.start.offset),
          })
        }
      }
    }

    // BX1038: String Boolean in Expression (== "true", == "false", != "true", != "false")
    if ((tok.type === 'EQ' || tok.type === 'NEQ') && i + 1 < tokens.length) {
      const nextTok = tokens[i + 1]!
      if (nextTok.type === 'STRING') {
        const val = nextTok.value.toLowerCase()
        if (val === 'true' || val === 'false' || val === 'yes' || val === 'no') {
          const replacement = (val === 'true' || val === 'yes') ? 'true' : 'false'
          const start = baseStart + mapOffset(nextTok.start.offset)
          const end = baseStart + mapOffset(nextTok.end.offset)
          pushDiagnostic(diagnostics, catalog, 'BX1038', fakeToken, {
            attribute: context?.attributeName,
            end,
            fixes: [{
              edits: [{ end, newText: replacement, start }],
              isPreferred: true,
              title: `Replace '${nextTok.value}' with ${replacement}`,
            }],
            message: `Comparing against a quoted boolean string literal ('${nextTok.value}') in expression. Use boolean literals true or false directly.`,
            start,
            suggestedReplacement: replacement,
          })
        }
      }
    }
  }

  // 3. Structural AST checks (BX1046: Non-standard braced collections, BX1026: Prohibited Date Relational Comparison)
  try {
    const ast = parseExpression(unescaped, { catalog, tolerant: true })
    walkExpressionAst(ast, (node) => {
      if (node.type === 'BinaryExpression') {
        const relOps = new Set(['<', '<=', '>', '>=', 'lt', 'lte', 'gt', 'gte'])
        if (relOps.has(node.operator)) {
          if (isDateExpressionNode(node.left, catalog) || isDateExpressionNode(node.right, catalog)) {
            const diagRule = catalog.getDiagnostic('BX1026')
            const startOffset = node.loc?.start.offset ?? 0
            const endOffset = node.loc?.end.offset ?? startOffset + 1
            pushDiagnostic(diagnostics, catalog, 'BX1026', fakeToken, {
              attribute: context?.attributeName,
              end: baseStart + mapOffset(endOffset),
              message: diagRule?.message ?? 'Direct relational comparison (<, <=, >, >=) on date objects is prohibited in Blogger expressions. Compare numeric timestamp or formatted string modifiers instead.',
              start: baseStart + mapOffset(startOffset),
            })
          }
        }
      }

      if (node.type === 'ArrayExpression' && node.isBraced && node.loc) {
        const isIncludeDataAttr = context?.tagName === 'b:include' && (context?.attributeName === 'data' || context?.attributeName === 'expr:data')
        if (!isIncludeDataAttr) {
          const diagRule = catalog.getDiagnostic('BX1046')
          pushDiagnostic(diagnostics, catalog, 'BX1046', fakeToken, {
            attribute: context?.attributeName,
            end: baseStart + mapOffset(node.loc.end.offset ?? 0),
            message: diagRule?.message ?? 'Using curly braces \'{ ... }\' for array/set collections is non-standard in Blogger. Use bracket notation \'[ ... ]\' instead to ensure future compatibility.',
            start: baseStart + mapOffset(node.loc.start.offset ?? 0),
          })
        }
      }

      if (node.type === 'CallExpression') {
        const callee = node.callee
        if (!catalog.isFunctionalOperator(callee)) {
          const diagRule = catalog.getDiagnostic('BX1017')
          const startOffset = node.loc?.start.offset ?? 0
          const endOffset = node.loc?.end.offset ?? startOffset + callee.length
          pushDiagnostic(diagnostics, catalog, 'BX1017', fakeToken, {
            attribute: context?.attributeName,
            end: baseStart + mapOffset(endOffset),
            message: diagRule?.message ?? `Standalone function call '${callee}()' is invalid in Blogger expressions. Blogger expressions only support canonical operators.`,
            start: baseStart + mapOffset(startOffset),
          })
        }
      }

      if (node.type === 'ObjectExpression') {
        for (const prop of node.properties) {
          if (prop.hasWhitespaceAfterColon === false) {
            const diagRule = catalog.getDiagnostic('BX1049')
            const colonOffset = prop.colonLoc?.start.offset ?? node.loc?.start.offset ?? 0
            const colonEndOffset = prop.colonLoc?.end.offset ?? colonOffset + 1
            pushDiagnostic(diagnostics, catalog, 'BX1049', fakeToken, {
              attribute: context?.attributeName,
              end: baseStart + mapOffset(colonEndOffset),
              message: diagRule?.message ?? 'Whitespace is required after colons in object literals { key: value } to avoid namespace collisions.',
              start: baseStart + mapOffset(colonOffset),
              suggestedReplacement: ': ',
            })
          }
        }
      }

      if (node.type === 'DataPath') {
        const raw = node.raw || ''
        const startOffset = node.loc?.start.offset ?? 0
        const endOffset = node.loc?.end.offset ?? startOffset + raw.length
        const baseAbsStart = baseStart + mapOffset(startOffset)
        const baseAbsEnd = baseStart + mapOffset(endOffset)

        // BX1054: Dot syntax in data:skin.vars.
        if (raw.startsWith('data:skin.vars.') || raw.startsWith('skin.vars.')) {
          const varPart = raw.startsWith('data:') ? raw.slice(15) : raw.slice(10)
          const check = checkSkinVarSubpath(varPart, catalog, context?.skinVariables)
          if (check.isInvalid && check.normalizedSubpath) {
            const normalized = `data:skin.vars.${check.normalizedSubpath}`
            pushDiagnostic(diagnostics, catalog, catalog.getStandardDiagnostic('invalid_skin_var_data_path'), fakeToken, {
              attribute: context?.attributeName,
              end: baseAbsEnd,
              fixes: [{
                edits: [{ end: baseAbsEnd, newText: normalized, start: baseAbsStart }],
                isPreferred: true,
                title: `Normalize to '${normalized}'`,
              }],
              message: `Skin variable data path '${raw}' must use underscore notation '${normalized}' instead of dots.`,
              start: baseAbsStart,
              suggestedReplacement: normalized,
            })
          }
        }

        // BX1050: Deprecated data properties
        const resolved = resolveDataPath(raw, { catalog, skinVariables: context?.skinVariables, widgetType: context?.widgetType })
        if (resolved?.isDeprecated) {
          const replacement = resolved.definition?.replacement as string | undefined
          const fixes = replacement
            ? [{
                edits: [{ end: baseAbsEnd, newText: replacement, start: baseAbsStart }],
                isPreferred: true,
                title: `Replace with '${replacement}'`,
              }]
            : undefined

          pushDiagnostic(diagnostics, catalog, catalog.getStandardDiagnostic('deprecated_data_property'), fakeToken, {
            attribute: context?.attributeName,
            end: baseAbsEnd,
            fixes,
            message: `Data property '${raw}' is deprecated in Layouts v3.${resolved.description ? ` ${resolved.description}` : ''}`,
            start: baseAbsStart,
            suggestedReplacement: replacement,
          })
        }

        // BX1051: Hallucinated data properties
        const lowerRaw = raw.toLowerCase()
        let hallucinatedFix: { replacement: string, reason: string } | undefined
        if (lowerRaw.includes('categories')) {
          hallucinatedFix = { reason: 'Blogger uses \'labels\', not \'categories\'.', replacement: raw.replace(/categories/i, 'labels') }
        }
        else if (lowerRaw.includes('headertitle')) {
          hallucinatedFix = { reason: 'Blogger Header widget uses \'title\'.', replacement: raw.replace(/headerTitle/i, 'title') }
        }
        else if (lowerRaw.includes('logourl')) {
          hallucinatedFix = { reason: 'Blogger Header widget uses \'image\'.', replacement: raw.replace(/logoUrl/i, 'image') }
        }
        else if (lowerRaw.includes('author.photo.url') || lowerRaw.includes('authorphoto.url')) {
          hallucinatedFix = { reason: 'Author photo URL resides under authorPhoto.image.', replacement: raw.replace(/photo\.url|authorPhoto\.url/i, 'authorPhoto.image') }
        }

        if (hallucinatedFix) {
          pushDiagnostic(diagnostics, catalog, catalog.getStandardDiagnostic('hallucinated_data_property'), fakeToken, {
            attribute: context?.attributeName,
            end: baseAbsEnd,
            fixes: [{
              edits: [{ end: baseAbsEnd, newText: hallucinatedFix.replacement, start: baseAbsStart }],
              isPreferred: true,
              title: `Use '${hallucinatedFix.replacement}'`,
            }],
            message: `Property in '${raw}' is hallucinated. ${hallucinatedFix.reason}`,
            start: baseAbsStart,
            suggestedReplacement: hallucinatedFix.replacement,
          })
        }
      }
    })
  }
  catch {
    // Tolerant parsing fallback
  }

  return diagnostics
}

export function validateTemplateExpressions(
  tokensOrXml: readonly BloggerDirectiveToken[] | string,
  catalog: SpecCatalog = getSpecCatalog(),
  skinVariables?: Record<string, string | BloggerSkinVariableSymbol>,
): BloggerStructureDiagnostic[] {
  const tokens = typeof tokensOrXml === 'string'
    ? scanDirectiveTokens(tokensOrXml, { catalog })
    : tokensOrXml

  const effectiveSkinVars = skinVariables ?? collectSkinVariablesFromTokens(tokens)
  const diagnostics: BloggerStructureDiagnostic[] = []
  let currentWidgetType: string | undefined

  for (const token of tokens) {
    if (token.isClosing) {
      if (token.tagName === 'b:widget') {
        currentWidgetType = undefined
      }
      continue
    }

    if (token.tagName === 'b:widget') {
      currentWidgetType = token.attributes.type?.value
    }

    for (const [attrName, attrToken] of Object.entries(token.attributes)) {
      const isExpr = catalog.isDirectiveExpressionAttribute(token.tagName, attrName) || attrName.startsWith('expr:')
      if (!isExpr) {
        continue
      }

      if (!attrToken.value || !attrToken.value.trim()) {
        continue
      }

      const exprDiagnostics = validateExpression(attrToken.value, catalog, {
        attributeName: attrName,
        skinVariables: effectiveSkinVars,
        tagEnd: token.tagEnd,
        tagName: token.tagName,
        tagStart: token.tagStart,
        valueEnd: attrToken.valueEnd,
        valueStart: attrToken.valueStart,
        widgetType: currentWidgetType,
      })

      diagnostics.push(...exprDiagnostics)
    }
  }

  return diagnostics
}
