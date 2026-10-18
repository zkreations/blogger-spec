import type { SpecCatalog } from '../catalogs/index.js'
import type {
  BloggerDiagnosticCode,
  BloggerDiagnosticRule,
  BloggerDirectiveToken,
  BloggerStructureDiagnostic,
  DirectiveNestingViolation,
} from '../types.js'
import type { Token } from './lexer.js'
import { getSpecCatalog } from '../catalogs/index.js'
import { evaluateExpressionBudget } from '../quota.js'
import { scanDirectiveTokens } from './directive-scanner.js'
import { flattenMultilineExpression, tokenize, unescapeXmlEntities } from './lexer.js'

function pushDiagnostic(
  diagnostics: BloggerStructureDiagnostic[],
  catalog: SpecCatalog,
  code: BloggerDiagnosticCode,
  token: BloggerDirectiveToken,
  options?: {
    message?: string
    rule?: BloggerDiagnosticRule
    attribute?: string
    start?: number
    end?: number
  },
): void {
  const rule = options?.rule ?? catalog.getDiagnostic(code)
  diagnostics.push({
    code: rule?.code ?? code,
    rule: rule ?? {
      code,
      name: `Diagnostic ${code}`,
      category: 'syntax',
      severity: 'error',
      message: options?.message ?? `Diagnostic ${code}`,
      evidence: 'unknown',
      verified_at: '2026-01-01',
    },
    message: options?.message ?? rule?.message ?? `Diagnostic ${code}`,
    severity: rule?.severity ?? 'error',
    tagName: token.tagName,
    attribute: options?.attribute,
    tagStart: options?.start ?? token.tagStart,
    tagEnd: options?.end ?? token.tagEnd,
  })
}

function handleClosingTag(
  token: BloggerDirectiveToken,
  tagStack: BloggerDirectiveToken[],
  catalog: SpecCatalog,
  diagnostics: BloggerStructureDiagnostic[],
): void {
  const lower = token.tagName.toLowerCase()
  const top = tagStack[tagStack.length - 1]
  if (!top || top.tagName.toLowerCase() !== lower) {
    const code = catalog.getStandardDiagnostic('mismatched_or_unclosed_tag')
    const rule = catalog.getDiagnostic(code)
    pushDiagnostic(diagnostics, catalog, code, token, {
      rule,
      message: rule?.message ?? `Closing tag </${token.tagName}> does not match the currently open tag.`,
    })
  }

  let matchIdx = -1
  for (let i = tagStack.length - 1; i >= 0; i--) {
    if (tagStack[i]!.tagName.toLowerCase() === lower) {
      matchIdx = i
      break
    }
  }
  if (matchIdx !== -1) {
    tagStack.splice(matchIdx)
  }
}

function validateNestingRules(
  token: BloggerDirectiveToken,
  tagStack: readonly BloggerDirectiveToken[],
  catalog: SpecCatalog,
  diagnostics: BloggerStructureDiagnostic[],
): void {
  if (catalog.isHallucinatedDirective(token.tagName)) {
    const diagCode = catalog.getHallucinatedDirectiveDiagnostic(token.tagName)
      ?? catalog.getStandardDiagnostic('prohibited_nesting')
    pushDiagnostic(diagnostics, catalog, diagCode, token)
    return
  }

  const isSection = token.tagName === 'b:section'
  const parentToken = tagStack.length > 0 ? tagStack[tagStack.length - 1] : undefined

  if (isSection && tagStack.some(t => t.tagName === 'b:section')) {
    const violation = validateDirectiveNesting('b:section', 'b:section', catalog)
    if (violation) {
      pushDiagnostic(diagnostics, catalog, violation.code as BloggerDiagnosticCode, token, {
        rule: violation.rule,
        message: violation.message,
      })
    }
    return
  }

  if (parentToken) {
    const violation = validateDirectiveNesting(parentToken.tagName, token.tagName, catalog)
    if (violation) {
      pushDiagnostic(diagnostics, catalog, violation.code as BloggerDiagnosticCode, token, {
        rule: violation.rule,
        message: violation.message,
      })
    }
  }
  else if (!catalog.canBeAtRoot(token.tagName)) {
    const directiveDef = catalog.getDirective(token.tagName)
    const policyDiag = (directiveDef?.grammar?.invalid_nesting_policy?.on_invalid_parent?.diagnostic
      ?? catalog.getStandardDiagnostic('prohibited_nesting')) as BloggerDiagnosticCode
    const rule = catalog.getDiagnostic(policyDiag)
    pushDiagnostic(diagnostics, catalog, policyDiag, token, {
      rule,
      message: rule?.message,
    })
  }
}

function validateDirectiveAttributeRules(
  token: BloggerDirectiveToken,
  catalog: SpecCatalog,
  diagnostics: BloggerStructureDiagnostic[],
): void {
  if (!catalog.isDirective(token.tagName) || token.tagName === 'Variable') {
    return
  }

  const attrValidation = catalog.validateDirectiveAttributes(token)

  for (const inv of attrValidation.inverted) {
    pushDiagnostic(diagnostics, catalog, inv.code as BloggerDiagnosticCode, token, {
      start: inv.start ?? token.tagStart,
      end: inv.end ?? token.tagEnd,
    })
  }

  const missingDiag = catalog.getStandardDiagnostic('missing_required_attribute')
  for (const missing of attrValidation.missingRequired) {
    pushDiagnostic(diagnostics, catalog, missingDiag, token, {
      message: `Mandatory attribute '${missing}' is missing on <${token.tagName}>.`,
    })
  }

  const deprecatedDiag = catalog.getStandardDiagnostic('deprecated_attribute')
  for (const dep of attrValidation.deprecated) {
    pushDiagnostic(diagnostics, catalog, deprecatedDiag, token, {
      message: `Attribute '${dep.name}' on <${token.tagName}> is deprecated. ${dep.reason || ''}`.trim(),
      start: dep.start ?? token.tagStart,
      end: dep.end ?? token.tagEnd,
    })
  }

  const invalidExprDiag = catalog.getStandardDiagnostic('disallowed_expression_attribute')
  for (const invalidExpr of attrValidation.invalidExpressions) {
    const attrToken = token.attributes[invalidExpr]
    pushDiagnostic(diagnostics, catalog, invalidExprDiag, token, {
      message: `Attribute '${invalidExpr}' on <${token.tagName}> does not support expressions.`,
      start: attrToken?.start ?? token.tagStart,
      end: attrToken?.end ?? token.tagEnd,
    })
  }

  const disallowedValueDiag = catalog.getStandardDiagnostic('disallowed_attribute_value')
  for (const disallowed of attrValidation.disallowedValues) {
    pushDiagnostic(diagnostics, catalog, disallowedValueDiag, token, {
      message: `Value '${disallowed.value}' is not allowed for attribute '${disallowed.attribute}' on <${token.tagName}>. Allowed values: ${disallowed.allowed.join(', ')}.`,
      start: disallowed.valueStart ?? disallowed.start ?? token.tagStart,
      end: disallowed.valueEnd ?? disallowed.end ?? token.tagEnd,
    })
  }

  const emptyDiag = catalog.getStandardDiagnostic('empty_required_attribute')
  const allowedAttrs = catalog.getDirectiveAttributes(token.tagName) || {}
  for (const [attrName, meta] of Object.entries(allowedAttrs)) {
    if (meta.required && !meta.allow_empty) {
      const attrToken = token.attributes[attrName] || token.attributes[`expr:${attrName}`]
      if (attrToken && !attrToken.value.trim()) {
        pushDiagnostic(diagnostics, catalog, emptyDiag, token, {
          message: `Element <${token.tagName}> has an empty '${attrToken.name}' attribute.`,
          start: attrToken.start,
          end: attrToken.end,
        })
      }
    }
  }
}

function validateIdentifierUniqueness(
  token: BloggerDirectiveToken,
  globalSectionWidgetIds: Map<string, BloggerDirectiveToken>,
  containerIncludableIds: Map<BloggerDirectiveToken, Set<string>>,
  tagStack: readonly BloggerDirectiveToken[],
  catalog: SpecCatalog,
  diagnostics: BloggerStructureDiagnostic[],
): void {
  const isSection = token.tagName === 'b:section'
  const isWidget = token.tagName === 'b:widget'
  const isIncludable = token.tagName === 'b:includable'

  if (isSection || isWidget) {
    const idAttr = token.attributes.id
    if (idAttr) {
      const idVal = idAttr.value.trim()
      if (idVal) {
        if (globalSectionWidgetIds.has(idVal)) {
          const dupElemDiag = catalog.getStandardDiagnostic('duplicate_element_id')
          pushDiagnostic(diagnostics, catalog, dupElemDiag, token, {
            message: `Duplicate element identifier '${idVal}' detected. Blogger requires all <b:section> and <b:widget> elements to have unique 'id' attributes.`,
            start: idAttr.start,
            end: idAttr.end,
          })
        }
        else {
          globalSectionWidgetIds.set(idVal, token)
        }
      }
    }
  }

  if (isIncludable) {
    let container: BloggerDirectiveToken | undefined
    for (let i = tagStack.length - 1; i >= 0; i--) {
      if (tagStack[i]!.tagName === 'b:widget' || tagStack[i]!.tagName === 'b:defaultmarkup') {
        container = tagStack[i]
        break
      }
    }

    const idAttr = token.attributes.id
    if (idAttr) {
      const idVal = idAttr.value.trim()
      if (idVal && container) {
        let idSet = containerIncludableIds.get(container)
        if (!idSet) {
          idSet = new Set()
          containerIncludableIds.set(container, idSet)
        }
        if (idSet.has(idVal)) {
          const dupIncDiag = catalog.getStandardDiagnostic('duplicate_includable_id')
          pushDiagnostic(diagnostics, catalog, dupIncDiag, token, {
            message: `Duplicate includable identifier '${idVal}' in <${container.tagName}>.`,
            start: idAttr.start,
            end: idAttr.end,
          })
        }
        else {
          idSet.add(idVal)
        }
      }
    }
  }
}

function validateVariableElement(
  token: BloggerDirectiveToken,
  catalog: SpecCatalog,
  diagnostics: BloggerStructureDiagnostic[],
): void {
  if (token.tagName !== 'Variable') {
    return
  }

  const typeAttr = token.attributes.type
  if (typeAttr && typeAttr.value) {
    const varType = typeAttr.value.toLowerCase()
    const presentAttrs = Object.keys(token.attributes)
    const varValidation = catalog.validateVariableAttributes(varType, presentAttrs)
    if (!varValidation.valid && varValidation.invalidAttributes.length > 0) {
      const invalidVarTypeDiag = catalog.getStandardDiagnostic('invalid_variable_type_attribute')
      pushDiagnostic(diagnostics, catalog, invalidVarTypeDiag, token, {
        message: `Attribute(s) '${varValidation.invalidAttributes.join(', ')}' not supported for <Variable type="${varType}">.`,
      })
    }
  }
}

export function validateDirectiveNesting(
  parentTag: string,
  childTag: string,
  catalog: SpecCatalog = getSpecCatalog(),
): DirectiveNestingViolation | null {
  return catalog.validateNesting(parentTag, childTag)
}

export interface ExpressionValidationContext {
  readonly tagName?: string
  readonly tagStart?: number
  readonly tagEnd?: number
  readonly attributeName?: string
  readonly valueStart?: number
  readonly valueEnd?: number
  readonly widgetType?: string
}

export function validateExpression(
  exprText: string,
  catalog: SpecCatalog = getSpecCatalog(),
  context?: ExpressionValidationContext,
): BloggerStructureDiagnostic[] {
  const diagnostics: BloggerStructureDiagnostic[] = []
  const tagName = context?.tagName ?? 'expression'
  const baseStart = context?.valueStart ?? context?.tagStart ?? 0
  const baseEnd = context?.valueEnd ?? context?.tagEnd ?? exprText.length

  const fakeToken: BloggerDirectiveToken = {
    tagName,
    tagStart: context?.tagStart ?? baseStart,
    tagEnd: context?.tagEnd ?? baseEnd,
    isClosing: false,
    isSelfClosing: true,
    hasSelfClosingSlash: true,
    attributesText: '',
    rawAttributesText: '',
    attributesOffset: baseStart,
    attributes: {},
  }

  const unescaped = unescapeXmlEntities(flattenMultilineExpression(exprText))
  const trimmed = unescaped.trim()
  if (!trimmed) {
    return diagnostics
  }

  // 1. Compiler token quota budget check (BX1021)
  const budget = evaluateExpressionBudget(unescaped, catalog)
  if (budget.status === 'EXCEEDED') {
    pushDiagnostic(diagnostics, catalog, 'BX1021', fakeToken, {
      attribute: context?.attributeName,
      start: baseStart,
      end: baseEnd,
      message: `Expression consumes ${budget.totalTokens} tokens, exceeding the compiler limit of ${catalog.getExpressionQuotaLimit()}.`,
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

    // BX1018: Strict equality operator (===, !==)
    if (tok.type === 'STRICT_EQ' || tok.type === 'STRICT_NEQ') {
      pushDiagnostic(diagnostics, catalog, 'BX1018', fakeToken, {
        attribute: context?.attributeName,
        start: baseStart + tok.start.offset,
        end: baseStart + tok.end.offset,
        message: `Strict equality operator '${tok.value}' is prohibited in Blogger expressions; use == or !=.`,
      })
    }

    // BX1020: Prohibited Literal Null
    if (tok.type === 'NULL') {
      pushDiagnostic(diagnostics, catalog, 'BX1020', fakeToken, {
        attribute: context?.attributeName,
        start: baseStart + tok.start.offset,
        end: baseStart + tok.end.offset,
        message: `Literal 'null' is not supported in Blogger expressions.`,
      })
    }

    // BX1017: Prohibited JavaScript method call (.method(...))
    if (tok.type === 'DOT' && i + 2 < tokens.length) {
      const next1 = tokens[i + 1]!
      const next2 = tokens[i + 2]!
      if (next1.type === 'IDENTIFIER' && next2.type === 'LPAREN') {
        pushDiagnostic(diagnostics, catalog, 'BX1017', fakeToken, {
          attribute: context?.attributeName,
          start: baseStart + tok.start.offset,
          end: baseStart + next2.end.offset,
          message: `JavaScript method call '.${next1.value}()' is prohibited in Blogger expressions. Use native operators and helpers.`,
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
              start: baseStart + tokens[j]!.start.offset,
              end: baseStart + nextTok.end.offset,
              message: `Using 'data:' prefix on lambda iterator property 'data:${paramName}' is redundant. Access properties directly (${paramName}.prop).`,
            })
          }
        }
      }
    }

    // BX1030: Prohibited Unary Negation on Compound Expressions (-(...))
    if (tok.type === 'MINUS' && i + 1 < tokens.length && tokens[i + 1]!.type === 'LPAREN') {
      const isPrefix = i === 0 || ['LPAREN', 'COMMA', 'COLON', 'QUESTION', 'ELVIS', 'PLUS', 'MINUS', 'STAR', 'SLASH', 'PERCENT', 'EQ', 'NEQ', 'STRICT_EQ', 'STRICT_NEQ', 'LT', 'GT', 'LTE', 'GTE', 'AND', 'OR', 'BANG'].includes(tokens[i - 1]!.type)
      if (isPrefix) {
        pushDiagnostic(diagnostics, catalog, 'BX1030', fakeToken, {
          attribute: context?.attributeName,
          start: baseStart + tok.start.offset,
          end: baseStart + tokens[i + 1]!.end.offset,
          message: `Unary negation '-' cannot be applied to parenthesized compound expressions; use (0 - (...)) instead.`,
        })
      }
    }

    // BX1038: String Boolean in Expression (== "true", == "false", != "true", != "false")
    if ((tok.type === 'EQ' || tok.type === 'NEQ') && i + 1 < tokens.length) {
      const nextTok = tokens[i + 1]!
      if (nextTok.type === 'STRING') {
        const val = nextTok.value.toLowerCase()
        if (val === 'true' || val === 'false' || val === 'yes' || val === 'no') {
          pushDiagnostic(diagnostics, catalog, 'BX1038', fakeToken, {
            attribute: context?.attributeName,
            start: baseStart + nextTok.start.offset,
            end: baseStart + nextTok.end.offset,
            message: `Comparing against a quoted boolean string literal ('${nextTok.value}') in expression. Use boolean literals true or false directly.`,
          })
        }
      }
    }
  }

  return diagnostics
}

export function validateTemplateExpressions(
  tokensOrXml: readonly BloggerDirectiveToken[] | string,
  catalog: SpecCatalog = getSpecCatalog(),
): BloggerStructureDiagnostic[] {
  const tokens = typeof tokensOrXml === 'string'
    ? scanDirectiveTokens(tokensOrXml, { catalog })
    : tokensOrXml

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
        tagName: token.tagName,
        tagStart: token.tagStart,
        tagEnd: token.tagEnd,
        attributeName: attrName,
        valueStart: attrToken.valueStart,
        valueEnd: attrToken.valueEnd,
        widgetType: currentWidgetType,
      })

      diagnostics.push(...exprDiagnostics)
    }
  }

  return diagnostics
}

export interface ValidateTemplateStructureOptions {
  readonly validateExpressions?: boolean
}

export function validateTemplateStructure(
  tokensOrXml: readonly BloggerDirectiveToken[] | string,
  catalog: SpecCatalog = getSpecCatalog(),
  options?: ValidateTemplateStructureOptions,
): BloggerStructureDiagnostic[] {
  const tokens = typeof tokensOrXml === 'string'
    ? scanDirectiveTokens(tokensOrXml, { catalog })
    : tokensOrXml

  const diagnostics: BloggerStructureDiagnostic[] = []
  const tagStack: BloggerDirectiveToken[] = []
  const globalSectionWidgetIds = new Map<string, BloggerDirectiveToken>()
  const containerIncludableIds = new Map<BloggerDirectiveToken, Set<string>>()

  for (const token of tokens) {
    if (token.isClosing) {
      handleClosingTag(token, tagStack, catalog, diagnostics)
      continue
    }

    validateNestingRules(token, tagStack, catalog, diagnostics)
    validateDirectiveAttributeRules(token, catalog, diagnostics)
    validateIdentifierUniqueness(token, globalSectionWidgetIds, containerIncludableIds, tagStack, catalog, diagnostics)
    validateVariableElement(token, catalog, diagnostics)

    if (!token.isSelfClosing) {
      tagStack.push(token)
    }
  }

  const unclosedCode = catalog.getStandardDiagnostic('mismatched_or_unclosed_tag')
  const rule = catalog.getDiagnostic(unclosedCode)
  for (const token of tagStack) {
    pushDiagnostic(diagnostics, catalog, unclosedCode, token, {
      rule,
      message: rule?.message ?? `Tag <${token.tagName}> is not closed.`,
    })
  }

  if (options?.validateExpressions) {
    const exprDiags = validateTemplateExpressions(tokens, catalog)
    diagnostics.push(...exprDiags)
  }

  return diagnostics
}
