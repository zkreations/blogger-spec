import type { SpecCatalog } from '../catalogs/index.js'
import type {
  BloggerDiagnosticCode,
  BloggerDiagnosticRule,
  BloggerDirectiveToken,
  BloggerStructureDiagnostic,
  DirectiveNestingViolation,
} from '../types.js'
import { getSpecCatalog } from '../catalogs/index.js'
import { scanDirectiveTokens } from './directive-scanner.js'

function pushDiagnostic(
  diagnostics: BloggerStructureDiagnostic[],
  catalog: SpecCatalog,
  code: BloggerDiagnosticCode,
  token: BloggerDirectiveToken,
  options?: {
    message?: string
    rule?: BloggerDiagnosticRule
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
      verifiedAt: '2026-01-01',
    },
    message: options?.message ?? rule?.message ?? `Diagnostic ${code}`,
    severity: rule?.severity ?? 'error',
    tagName: token.tagName,
    tagStart: options?.start ?? token.tagStart,
    tagEnd: options?.end ?? token.tagEnd,
  })
}

function handleClosingTag(token: BloggerDirectiveToken, tagStack: BloggerDirectiveToken[]): void {
  const lower = token.tagName.toLowerCase()
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
  }
  else if (parentToken) {
    const violation = validateDirectiveNesting(parentToken.tagName, token.tagName, catalog)
    if (violation) {
      pushDiagnostic(diagnostics, catalog, violation.code as BloggerDiagnosticCode, token, {
        rule: violation.rule,
        message: violation.message,
      })
    }
  }
  else if (token.tagName === 'b:widget' && !tagStack.some(t => t.tagName === 'b:section')) {
    const violation = validateDirectiveNesting('body', 'b:widget', catalog)
    if (violation) {
      pushDiagnostic(diagnostics, catalog, violation.code as BloggerDiagnosticCode, token, {
        rule: violation.rule,
        message: violation.message,
      })
    }
  }
  else if (token.tagName === 'b:includable' && !tagStack.some(t => t.tagName === 'b:widget' || t.tagName === 'b:defaultmarkup')) {
    const violation = validateDirectiveNesting('b:section', 'b:includable', catalog)
    if (violation) {
      pushDiagnostic(diagnostics, catalog, violation.code as BloggerDiagnosticCode, token, {
        rule: violation.rule,
        message: violation.message,
      })
    }
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

  const presentAttrs = Object.keys(token.attributes)
  const attrValidation = catalog.validateDirectiveAttributes(token.tagName, presentAttrs)

  for (const inv of attrValidation.inverted) {
    pushDiagnostic(diagnostics, catalog, inv.code as BloggerDiagnosticCode, token)
  }

  const missingDiag = catalog.getStandardDiagnostic('missing_required_attribute')
  for (const missing of attrValidation.missingRequired) {
    pushDiagnostic(diagnostics, catalog, missingDiag, token, {
      message: `Mandatory attribute '${missing}' is missing on <${token.tagName}>.`,
    })
  }

  const deprecatedDiag = catalog.getStandardDiagnostic('deprecated_attribute')
  for (const dep of attrValidation.deprecated) {
    const attrToken = token.attributes[dep.name]
    pushDiagnostic(diagnostics, catalog, deprecatedDiag, token, {
      message: `Attribute '${dep.name}' on <${token.tagName}> is deprecated. ${dep.reason || ''}`.trim(),
      start: attrToken?.start ?? token.tagStart,
      end: attrToken?.end ?? token.tagEnd,
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

export function validateTemplateStructure(
  tokensOrXml: readonly BloggerDirectiveToken[] | string,
  catalog: SpecCatalog = getSpecCatalog(),
): BloggerStructureDiagnostic[] {
  const tokens = typeof tokensOrXml === 'string'
    ? scanDirectiveTokens(tokensOrXml)
    : tokensOrXml

  const diagnostics: BloggerStructureDiagnostic[] = []
  const tagStack: BloggerDirectiveToken[] = []
  const globalSectionWidgetIds = new Map<string, BloggerDirectiveToken>()
  const containerIncludableIds = new Map<BloggerDirectiveToken, Set<string>>()

  for (const token of tokens) {
    if (token.isClosing) {
      handleClosingTag(token, tagStack)
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

  return diagnostics
}
