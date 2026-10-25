import type { BloggerExpressionNode } from '../ast.js'
import type { SpecCatalog } from '../catalogs/index.js'
import type { BloggerSkinVariableSymbol } from '../data-path.js'
import type {
  BloggerDiagnosticCode,
  BloggerDiagnosticFix,
  BloggerDiagnosticRule,
  BloggerDirectiveToken,
  BloggerStructureDiagnostic,
  BloggerTextEdit,
  DirectiveNestingViolation,
} from '../types.js'
import type { Token } from './lexer.js'
import { getSpecCatalog } from '../catalogs/index.js'
import { resolveDataPath, toSkinVarIdentifier } from '../data-path.js'
import { evaluateExpressionBudget } from '../quota.js'
import { getSkinTypeModifiers } from '../type-system.js'
import { scanDirectiveTokens } from './directive-scanner.js'
import { parseExpression } from './expr-parser.js'
import { tokenize, unescapeXmlEntitiesWithSourceMap } from './lexer.js'

export type {
  BloggerStructureDiagnostic,
  DirectiveNestingViolation,
}

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
    suggestedReplacement?: string
    fixes?: readonly BloggerDiagnosticFix[]
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
    suggestedReplacement: options?.suggestedReplacement,
    fixes: options?.fixes,
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
    const directive = catalog.getDirective(token.tagName)
    const invalidChildDiag = directive?.grammar?.invalid_nesting_policy?.on_invalid_child?.diagnostic
    if (invalidChildDiag === 'BX1013' || lower === 'b:eval') {
      const code = 'BX1013'
      const rule = catalog.getDiagnostic(code)
      pushDiagnostic(diagnostics, catalog, code, token, {
        rule,
        message: rule?.message ?? `Closing tag </${token.tagName}> is prohibited for self-closing directive <${token.tagName}/>.`,
      })
    }
    else {
      const code = catalog.getStandardDiagnostic('mismatched_or_unclosed_tag')
      const rule = catalog.getDiagnostic(code)
      pushDiagnostic(diagnostics, catalog, code, token, {
        rule,
        message: rule?.message ?? `Closing tag </${token.tagName}> does not match the currently open tag.`,
      })
    }
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

function buildHallucinatedDirectiveFixes(
  token: BloggerDirectiveToken,
  diagCode: BloggerDiagnosticCode,
  catalog: SpecCatalog,
  tokens?: readonly BloggerDirectiveToken[],
): BloggerDiagnosticFix[] {
  const transform = catalog.getHallucinatedDirectiveTransform(diagCode)
  if (!transform) {
    return []
  }

  const edits: BloggerTextEdit[] = []
  const targetTag = transform.targetTag
  const isStrictlySelfClosing = targetTag === 'b:case' || targetTag === 'b:default'

  const attrParts: string[] = []
  const providedCanonicalAttrs = new Set<string>()

  for (const [rawAttrName, attrTok] of Object.entries(token.attributes)) {
    const isExpr = rawAttrName.startsWith('expr:')
    const baseName = isExpr ? rawAttrName.slice(5) : rawAttrName
    const mappedBase = transform.attrMap[baseName] ?? baseName
    const canonicalName = isExpr ? `expr:${mappedBase}` : mappedBase
    providedCanonicalAttrs.add(mappedBase)

    const quote = attrTok.quote ?? '\''
    attrParts.push(`${canonicalName}=${quote}${attrTok.value}${quote}`)
  }

  if (transform.requiredAttrs) {
    for (const req of transform.requiredAttrs) {
      if (!providedCanonicalAttrs.has(req)) {
        attrParts.push(`${req}=''`)
      }
    }
  }

  const attrsString = attrParts.length > 0 ? ` ${attrParts.join(' ')}` : ''
  const openTagText = isStrictlySelfClosing ? `<${targetTag}${attrsString}/>` : `<${targetTag}${attrsString}>`

  edits.push({
    start: token.tagStart,
    end: token.tagEnd,
    newText: openTagText,
  })

  if (!token.isSelfClosing && tokens) {
    const lower = token.tagName.toLowerCase()
    let depth = 1
    const idx = tokens.indexOf(token)
    if (idx !== -1) {
      for (let i = idx + 1; i < tokens.length; i++) {
        const nextTok = tokens[i]!
        if (nextTok.tagName.toLowerCase() === lower) {
          if (nextTok.isClosing) {
            depth--
            if (depth === 0) {
              if (isStrictlySelfClosing) {
                edits.push({
                  start: nextTok.tagStart,
                  end: nextTok.tagEnd,
                  newText: '',
                })
              }
              else {
                edits.push({
                  start: nextTok.tagStart,
                  end: nextTok.tagEnd,
                  newText: `</${targetTag}>`,
                })
              }
              break
            }
          }
          else if (!nextTok.isSelfClosing) {
            depth++
          }
        }
      }
    }
  }

  return [{
    title: `Convert <${token.tagName}> to <${targetTag}>`,
    isPreferred: true,
    edits,
  }]
}

function validateNestingRules(
  token: BloggerDirectiveToken,
  tagStack: readonly BloggerDirectiveToken[],
  catalog: SpecCatalog,
  diagnostics: BloggerStructureDiagnostic[],
  allTokens?: readonly BloggerDirectiveToken[],
): void {
  if (catalog.isHallucinatedDirective(token.tagName)) {
    const diagCode = catalog.getHallucinatedDirectiveDiagnostic(token.tagName)
      ?? catalog.getStandardDiagnostic('prohibited_nesting')
    const fixes = buildHallucinatedDirectiveFixes(token, diagCode, catalog, allTokens)
    const transform = catalog.getHallucinatedDirectiveTransform(diagCode)
    pushDiagnostic(diagnostics, catalog, diagCode, token, {
      suggestedReplacement: transform ? `<${transform.targetTag}>` : undefined,
      fixes: fixes.length > 0 ? fixes : undefined,
    })
    return
  }

  const lowerTag = token.tagName.toLowerCase()
  if (lowerTag.startsWith('b:') && !catalog.isDirective(token.tagName) && !catalog.isDirective(lowerTag)) {
    const diagCode = (catalog.getStandardDiagnostic('unknown_directive') || 'BX1025') as BloggerDiagnosticCode
    const diagRule = catalog.getDiagnostic(diagCode)
    pushDiagnostic(diagnostics, catalog, diagCode, token, {
      rule: diagRule,
      message: diagRule?.message ?? `Unknown directive '<${token.tagName}>' in Blogger 'b:' XML namespace.`,
    })
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

  if (isSection) {
    const invalidAncestor = tagStack.find(t =>
      t.tagName === 'b:widget' || t.tagName === 'b:includable' || t.tagName === 'b:defaultmarkup' || t.tagName === 'head' || t.tagName === 'b:loop',
    )
    if (invalidAncestor) {
      const defaultProhibited = (catalog.getStandardDiagnostic('prohibited_nesting') ?? 'BX1023') as BloggerDiagnosticCode
      pushDiagnostic(diagnostics, catalog, defaultProhibited, token, {
        message: `Tag <b:section> cannot be placed inside <${invalidAncestor.tagName}>.`,
      })
      return
    }
  }

  const isSkin = token.tagName === 'b:skin' || token.tagName === 'b:template-skin'
  if (isSkin && tagStack.some(t => t.tagName === 'b:widget')) {
    const violation = validateDirectiveNesting('b:widget', token.tagName, catalog)
      ?? catalog.validateNesting('b:widget', token.tagName)
    if (violation) {
      pushDiagnostic(diagnostics, catalog, violation.code as BloggerDiagnosticCode, token, {
        rule: violation.rule,
        message: `Tag <${token.tagName}> cannot be placed inside widgets (Blogger formats it as self-closing <${token.tagName}/> and strips its content).`,
      })
      return
    }
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
  if (!catalog.isDirective(token.tagName)) {
    return
  }

  const attrValidation = catalog.validateDirectiveAttributes(token)

  for (const inv of attrValidation.inverted) {
    const canonicalAttr = catalog.getInvertedAttribute(inv.code)
    const fixes: BloggerDiagnosticFix[] = []
    if (canonicalAttr && inv.start !== undefined) {
      fixes.push({
        title: `Change '${inv.attribute}' to '${canonicalAttr}'`,
        isPreferred: true,
        edits: [{
          start: inv.start,
          end: inv.start + inv.attribute.length,
          newText: canonicalAttr,
        }],
      })
    }
    pushDiagnostic(diagnostics, catalog, inv.code as BloggerDiagnosticCode, token, {
      start: inv.start ?? token.tagStart,
      end: inv.end ?? token.tagEnd,
      attribute: inv.attribute,
      suggestedReplacement: canonicalAttr,
      fixes: fixes.length > 0 ? fixes : undefined,
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
    const fixes: BloggerDiagnosticFix[] = []
    if (dep.replacement && dep.start !== undefined) {
      fixes.push({
        title: `Migrate '${dep.name}' to '${dep.replacement}'`,
        isPreferred: true,
        edits: [{
          start: dep.start,
          end: dep.start + dep.name.length,
          newText: dep.replacement,
        }],
      })
    }
    pushDiagnostic(diagnostics, catalog, deprecatedDiag, token, {
      message: `Attribute '${dep.name}' on <${token.tagName}> is deprecated. ${dep.reason || ''}`.trim(),
      start: dep.start ?? token.tagStart,
      end: dep.end ?? token.tagEnd,
      attribute: dep.name,
      suggestedReplacement: dep.replacement ?? undefined,
      fixes: fixes.length > 0 ? fixes : undefined,
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
  const directive = catalog.getDirective(token.tagName)
  const rawTypeVal = token.attributes.type?.value
  const subTypeValue = typeof rawTypeVal === 'string' ? rawTypeVal.trim().toLowerCase() : undefined
  const subtypeMeta = (directive?.type_attributes && subTypeValue)
    ? directive.type_attributes[subTypeValue]
    : undefined

  for (const [attrName, meta] of Object.entries(allowedAttrs)) {
    if (token.tagName === 'Variable' && attrName === 'value' && subTypeValue === 'string') {
      continue
    }

    const isRequired = subtypeMeta?.required ? subtypeMeta.required.includes(attrName) : Boolean(meta.required)
    if (isRequired && !meta.allow_empty) {
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

function validateWidgetElement(
  token: BloggerDirectiveToken,
  catalog: SpecCatalog,
  diagnostics: BloggerStructureDiagnostic[],
): void {
  if (token.tagName !== 'b:widget') {
    return
  }

  const typeAttr = token.attributes.type
  const idAttr = token.attributes.id
  if (typeAttr?.value && idAttr?.value) {
    const type = typeAttr.value.trim()
    const id = idAttr.value.trim()
    if (type && id) {
      const escapedType = type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const pattern = new RegExp(`^${escapedType}[1-9][0-9]{0,2}$`)
      if (!pattern.test(id)) {
        pushDiagnostic(diagnostics, catalog, 'BX1047', token, {
          start: idAttr.start,
          end: idAttr.end,
          message: `Widget id '${id}' is invalid for type '${type}'. Expected '${type}' followed by a number between 1 and 999 (e.g. '${type}1').`,
        })
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

function isPrimitiveScalarLiteral(val: string): boolean {
  const trimmed = val.trim()
  if (/^"(?:[^"\\]|\\.)*"$/.test(trimmed) || /^'(?:[^'\\]|\\.)*'$/.test(trimmed)) {
    return true
  }
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return true
  }
  if (trimmed === 'true' || trimmed === 'false') {
    return true
  }
  return false
}

function validateIncludeElement(
  token: BloggerDirectiveToken,
  catalog: SpecCatalog,
  diagnostics: BloggerStructureDiagnostic[],
): void {
  if (token.tagName !== 'b:include') {
    return
  }

  // 1. BX1031: Non-object scalar payload in data attribute
  const dataAttr = token.attributes.data || token.attributes['expr:data']
  if (dataAttr && isPrimitiveScalarLiteral(dataAttr.value)) {
    const diagCode = (catalog.getStandardDiagnostic('non_object_include_data_payload') || 'BX1031') as BloggerDiagnosticCode
    const diagRule = catalog.getDiagnostic(diagCode)
    pushDiagnostic(diagnostics, catalog, diagCode, token, {
      attribute: dataAttr.name,
      start: dataAttr.start,
      end: dataAttr.end,
      message: diagRule?.message ?? 'The \'data\' attribute of <b:include> strictly requires an object reference or object literal { ... }; passing primitive scalars is prohibited.',
    })
  }

  // 2. BX1024: Deprecated server inclusion
  const nameAttr = token.attributes.name
  if (nameAttr?.value) {
    const rawName = nameAttr.value.trim()
    const incName = rawName.startsWith('super.') ? rawName.slice('super.'.length) : rawName
    const incDef = catalog.getInclusion(incName)
    if (incDef?.deprecated) {
      const diagCode = (catalog.getStandardDiagnostic('deprecated_attribute') || 'BX1024') as BloggerDiagnosticCode
      pushDiagnostic(diagnostics, catalog, diagCode, token, {
        attribute: 'name',
        start: nameAttr.start,
        end: nameAttr.end,
        message: `Server inclusion '${incName}' is deprecated. ${incDef.deprecated.reason ?? ''}`.trim(),
      })
    }
  }
}

const skinModifiersCache = new WeakMap<SpecCatalog, Set<string>>()

function getAllSkinModifiers(catalog: SpecCatalog): Set<string> {
  let cached = skinModifiersCache.get(catalog)
  if (!cached) {
    cached = new Set<string>()
    for (const tDef of Object.values(catalog.getAllTypes())) {
      if (tDef.category === 'skin' && tDef.modifiers) {
        for (const mod of Object.keys(tDef.modifiers)) {
          cached.add(mod)
        }
      }
    }
    skinModifiersCache.set(catalog, cached)
  }
  return cached
}

interface SkinVarValidationResult {
  readonly isInvalid: boolean
  readonly normalizedSubpath?: string
}

function checkSkinVarSubpath(
  subpath: string,
  catalog: SpecCatalog,
  skinVariables?: Record<string, string | BloggerSkinVariableSymbol>,
): SkinVarValidationResult {
  if (!subpath.includes('.')) {
    return { isInvalid: false }
  }

  const lastDot = subpath.lastIndexOf('.')
  const prefix = subpath.slice(0, lastDot)
  const suffix = subpath.slice(lastDot + 1)

  if (skinVariables && Object.keys(skinVariables).length > 0) {
    let matchedVar: string | BloggerSkinVariableSymbol | undefined = skinVariables[prefix]
    if (!matchedVar) {
      const normalizedPrefix = toSkinVarIdentifier(prefix)
      for (const [k, v] of Object.entries(skinVariables)) {
        const id = toSkinVarIdentifier(typeof v === 'object' && v.name ? v.name : k)
        if (id === normalizedPrefix) {
          matchedVar = v
          break
        }
      }
    }

    if (matchedVar) {
      const rawType = typeof matchedVar === 'string' ? matchedVar : (matchedVar.type ?? 'string')
      const modifiers = getSkinTypeModifiers(rawType, catalog)
      if (modifiers[suffix]) {
        if (!prefix.includes('.')) {
          return { isInvalid: false }
        }
        return {
          isInvalid: true,
          normalizedSubpath: `${toSkinVarIdentifier(prefix)}.${suffix}`,
        }
      }
    }

    const normalizedSubpath = toSkinVarIdentifier(subpath)
    for (const [k, v] of Object.entries(skinVariables)) {
      const origName = typeof v === 'object' && v.name ? v.name : k
      if (origName === subpath || toSkinVarIdentifier(origName) === normalizedSubpath) {
        return {
          isInvalid: true,
          normalizedSubpath,
        }
      }
    }
  }

  const allSkinModifiers = getAllSkinModifiers(catalog)
  if (allSkinModifiers.has(suffix)) {
    if (!prefix.includes('.')) {
      return { isInvalid: false }
    }
    return {
      isInvalid: true,
      normalizedSubpath: `${toSkinVarIdentifier(prefix)}.${suffix}`,
    }
  }

  return {
    isInvalid: true,
    normalizedSubpath: toSkinVarIdentifier(subpath),
  }
}

function collectSkinVariablesFromTokens(tokens: readonly BloggerDirectiveToken[]): Record<string, BloggerSkinVariableSymbol> {
  const result: Record<string, BloggerSkinVariableSymbol> = {}
  for (const token of tokens) {
    if (token.tagName === 'Variable' && !token.isClosing) {
      const name = token.attributes.name?.value?.trim()
      if (name) {
        const type = token.attributes.type?.value?.trim() || 'string'
        const description = token.attributes.description?.value?.trim()
        const defaultVal = token.attributes.default?.value?.trim()
        const value = token.attributes.value?.value?.trim()
        result[name] = {
          name,
          type,
          description,
          default: defaultVal,
          value,
        }
      }
    }
  }
  return result
}

function validateDataElement(
  token: BloggerDirectiveToken,
  catalog: SpecCatalog,
  diagnostics: BloggerStructureDiagnostic[],
  skinVariables?: Record<string, string | BloggerSkinVariableSymbol>,
): void {
  if (!token.tagName.startsWith('data:')) {
    return
  }

  // 1. BX1027: Direct parameterized message invocation (<data:messages.byAuthor/>)
  if (token.tagName.startsWith('data:messages.')) {
    const messageKey = token.tagName.slice('data:messages.'.length)
    const msgDef = catalog.getMessage(messageKey)
    if (msgDef && msgDef.direct_invocation === false) {
      const diagCode = (msgDef.diagnostic || 'BX1027') as BloggerDiagnosticCode
      const diagRule = catalog.getDiagnostic(diagCode)
      pushDiagnostic(diagnostics, catalog, diagCode, token, {
        start: token.tagStart,
        end: token.tagEnd,
        message: diagRule?.message ?? `Parameterized message '${messageKey}' cannot be evaluated via direct tag invocation (<data:messages.${messageKey}/>). Use <b:message name='messages.${messageKey}'> with child <b:param> tags.`,
      })
    }
  }

  // BX1054: Dot syntax in <data:skin.vars.admin.name/>
  if (token.tagName.startsWith('data:skin.vars.')) {
    const idPart = token.tagName.slice('data:skin.vars.'.length)
    const check = checkSkinVarSubpath(idPart, catalog, skinVariables)
    if (check.isInvalid && check.normalizedSubpath) {
      const normalized = `data:skin.vars.${check.normalizedSubpath}`
      pushDiagnostic(diagnostics, catalog, 'BX1054', token, {
        start: token.tagStart,
        end: token.tagEnd,
        suggestedReplacement: `<${normalized}/>`,
        fixes: [{
          title: `Normalize to '<${normalized}/>'`,
          isPreferred: true,
          edits: [{ start: token.tagStart, end: token.tagEnd, newText: `<${normalized}/>` }],
        }],
        message: `Skin variable tag '<${token.tagName}/>' must use underscore notation '<${normalized}/>' instead of dots.`,
      })
    }
  }

  // BX1050: Deprecated data property on <data:.../>
  const resolved = resolveDataPath(token.tagName, { catalog, skinVariables })
  if (resolved?.isDeprecated) {
    const replacement = resolved.definition?.replacement as string | undefined
    const fixes = replacement
      ? [{
          title: `Replace with '<${replacement}/>'`,
          isPreferred: true,
          edits: [{ start: token.tagStart, end: token.tagEnd, newText: `<${replacement}/>` }],
        }]
      : undefined
    pushDiagnostic(diagnostics, catalog, 'BX1050', token, {
      start: token.tagStart,
      end: token.tagEnd,
      suggestedReplacement: replacement ? `<${replacement}/>` : undefined,
      fixes,
      message: `Tag '<${token.tagName}/>' is deprecated in Layouts v3.${resolved.description ? ` ${resolved.description}` : ''}`,
    })
  }

  const rawTail = token.attributesText ? token.attributesText.trim() : ''
  if (!rawTail) {
    return
  }

  // 2. BX1032: Direct bracket indexing in data:* tag (<data:items[0]/>)
  if (rawTail.includes('[') || rawTail.includes(']')) {
    const bracketIndex = token.attributesText.indexOf('[')
    const start = bracketIndex !== -1 ? token.attributesOffset + bracketIndex : token.attributesOffset
    const end = token.tagEnd
    const diagCode = (catalog.getStandardDiagnostic('prohibited_bracket_indexing_in_data_tag') || 'BX1032') as BloggerDiagnosticCode
    pushDiagnostic(diagnostics, catalog, diagCode, token, {
      start,
      end,
      message: `Direct bracket indexing is forbidden in <${token.tagName}> tags. Use <b:eval expr='...'/> to index collections.`,
    })
    return
  }

  // 3. BX1048: Expression operators in data:* tag (<data:post.title ?: 'Default'/>)
  const hasOperator = /[?:+\-*%!=<>&|/]|\b(?:and|or|not|in|contains)\b/.test(rawTail) || /["']/.test(rawTail)
  if (hasOperator) {
    const diagCode = (catalog.getStandardDiagnostic('prohibited_operator_in_data_tag') || 'BX1048') as BloggerDiagnosticCode
    pushDiagnostic(diagnostics, catalog, diagCode, token, {
      start: token.attributesOffset,
      end: token.tagEnd,
      message: `Expression operators are not permitted inside <${token.tagName}> tags. Use <b:eval expr='...'/> for expressions and computations.`,
    })
    return
  }

  // 4. Regular attributes on data:* tag (<data:post.title class="x"/>)
  if (Object.keys(token.attributes).length > 0) {
    for (const [attrName, attrToken] of Object.entries(token.attributes)) {
      const diagCode = (catalog.getStandardDiagnostic('unknown_directive') || 'BX1025') as BloggerDiagnosticCode
      pushDiagnostic(diagnostics, catalog, diagCode, token, {
        attribute: attrName,
        start: attrToken.start,
        end: attrToken.end,
        message: `Tag <${token.tagName}> does not accept attributes (found '${attrName}').`,
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
  readonly skinVariables?: Record<string, string | BloggerSkinVariableSymbol>
}

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

  const { unescaped, mapOffset } = unescapeXmlEntitiesWithSourceMap(exprText)
  const trimmed = unescaped.trim()
  if (!trimmed) {
    return diagnostics
  }

  // 1. Compiler token quota budget check (BX1021 / BX1045)
  const budget = evaluateExpressionBudget(unescaped, catalog)
  if (budget.status === 'EXCEEDED') {
    const diagCode = catalog.getExpressionQuotaDiagnostic() || 'BX1021'
    pushDiagnostic(diagnostics, catalog, diagCode, fakeToken, {
      attribute: context?.attributeName,
      start: baseStart,
      end: baseEnd,
      message: `Expression consumes ${budget.totalTokens} tokens, exceeding the compiler limit of ${catalog.getExpressionQuotaLimit()}.`,
    })
  }
  else if (budget.status === 'WARNING') {
    const warnDiagCode = catalog.getExpressionQuotaWarningDiagnostic() || 'BX1045'
    pushDiagnostic(diagnostics, catalog, warnDiagCode, fakeToken, {
      attribute: context?.attributeName,
      start: baseStart,
      end: baseEnd,
      message: `Expression consumes ${budget.totalTokens} tokens, approaching the compiler ceiling of ${catalog.getExpressionQuotaLimit()} (warning threshold is ${catalog.getExpressionQuotaWarning()}).`,
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
      const replacement = tok.type === 'STRICT_EQ' ? '==' : '!='
      const start = baseStart + mapOffset(tok.start.offset)
      const end = baseStart + mapOffset(tok.end.offset)
      pushDiagnostic(diagnostics, catalog, 'BX1018', fakeToken, {
        attribute: context?.attributeName,
        start,
        end,
        suggestedReplacement: replacement,
        fixes: [{
          title: `Replace '${tok.value}' with '${replacement}'`,
          isPreferred: true,
          edits: [{ start, end, newText: replacement }],
        }],
        message: `Strict equality operator '${tok.value}' is prohibited in Blogger expressions; use == or !=.`,
      })
    }

    // BX1020: Prohibited Literal Null
    if (tok.type === 'NULL') {
      pushDiagnostic(diagnostics, catalog, 'BX1020', fakeToken, {
        attribute: context?.attributeName,
        start: baseStart + mapOffset(tok.start.offset),
        end: baseStart + mapOffset(tok.end.offset),
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
          start: baseStart + mapOffset(tok.start.offset),
          end: baseStart + mapOffset(next2.end.offset),
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
              start: baseStart + mapOffset(tokens[j]!.start.offset),
              end: baseStart + mapOffset(nextTok.end.offset),
              suggestedReplacement: paramName,
              message: `Using 'data:' prefix on lambda iterator property 'data:${paramName}' is redundant. Access properties directly (${paramName}.prop).`,
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
                start: baseStart + mapOffset(tok.start.offset),
                end: baseStart + mapOffset(tokens[closeParenIndex]!.end.offset),
                message: `Invoking '-()' with 0 arguments triggers an unhandled backend crash (HTTP 500) on Blogger template engine.`,
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
                  start: baseStart + mapOffset(tok.start.offset),
                  end: baseStart + mapOffset(tokens[closeParenIndex]!.end.offset),
                  message: `Unary prefix operator '-' cannot be applied to parenthesized compound expressions; evaluate operands separately or use native operators.`,
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
            start: baseStart + mapOffset(tok.start.offset),
            end: baseStart + mapOffset(tokens[closeParenIndex]!.end.offset),
            message: `Invoking equality operator 'eq()' with fewer than 2 arguments triggers an unhandled backend crash (HTTP 500) on Blogger template engine.`,
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
            start,
            end,
            suggestedReplacement: replacement,
            fixes: [{
              title: `Replace '${nextTok.value}' with ${replacement}`,
              isPreferred: true,
              edits: [{ start, end, newText: replacement }],
            }],
            message: `Comparing against a quoted boolean string literal ('${nextTok.value}') in expression. Use boolean literals true or false directly.`,
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
              start: baseStart + mapOffset(startOffset),
              end: baseStart + mapOffset(endOffset),
              message: diagRule?.message ?? 'Direct relational comparison (<, <=, >, >=) on date objects is prohibited in Blogger expressions. Compare numeric timestamp or formatted string modifiers instead.',
            })
          }
        }
      }

      if (node.type === 'ArrayExpression' && node.isBraced && node.loc) {
        const diagRule = catalog.getDiagnostic('BX1046')
        pushDiagnostic(diagnostics, catalog, 'BX1046', fakeToken, {
          attribute: context?.attributeName,
          start: baseStart + mapOffset(node.loc.start.offset ?? 0),
          end: baseStart + mapOffset(node.loc.end.offset ?? 0),
          message: diagRule?.message ?? 'Using curly braces \'{ ... }\' for array/set collections is non-standard in Blogger. Use bracket notation \'[ ... ]\' instead to ensure future compatibility.',
        })
      }

      if (node.type === 'ObjectExpression') {
        for (const prop of node.properties) {
          if (prop.hasWhitespaceAfterColon === false) {
            const diagRule = catalog.getDiagnostic('BX1049')
            const colonOffset = prop.colonLoc?.start.offset ?? node.loc?.start.offset ?? 0
            const colonEndOffset = prop.colonLoc?.end.offset ?? colonOffset + 1
            pushDiagnostic(diagnostics, catalog, 'BX1049', fakeToken, {
              attribute: context?.attributeName,
              start: baseStart + mapOffset(colonOffset),
              end: baseStart + mapOffset(colonEndOffset),
              suggestedReplacement: ': ',
              message: diagRule?.message ?? 'Whitespace is required after colons in object literals { key: value } to avoid namespace collisions.',
            })
          }
        }
      }

      if (node.type === 'DataPath') {
        const raw = (node as any).raw || ''
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
            pushDiagnostic(diagnostics, catalog, 'BX1054', fakeToken, {
              attribute: context?.attributeName,
              start: baseAbsStart,
              end: baseAbsEnd,
              suggestedReplacement: normalized,
              fixes: [{
                title: `Normalize to '${normalized}'`,
                isPreferred: true,
                edits: [{ start: baseAbsStart, end: baseAbsEnd, newText: normalized }],
              }],
              message: `Skin variable data path '${raw}' must use underscore notation '${normalized}' instead of dots.`,
            })
          }
        }

        // BX1050: Deprecated data properties
        const resolved = resolveDataPath(raw, { catalog, widgetType: context?.widgetType, skinVariables: context?.skinVariables })
        if (resolved?.isDeprecated) {
          const replacement = resolved.definition?.replacement as string | undefined
          const fixes = replacement
            ? [{
                title: `Replace with '${replacement}'`,
                isPreferred: true,
                edits: [{ start: baseAbsStart, end: baseAbsEnd, newText: replacement }],
              }]
            : undefined

          pushDiagnostic(diagnostics, catalog, 'BX1050', fakeToken, {
            attribute: context?.attributeName,
            start: baseAbsStart,
            end: baseAbsEnd,
            suggestedReplacement: replacement,
            fixes,
            message: `Data property '${raw}' is deprecated in Layouts v3.${resolved.description ? ` ${resolved.description}` : ''}`,
          })
        }

        // BX1051: Hallucinated data properties
        const lowerRaw = raw.toLowerCase()
        let hallucinatedFix: { replacement: string, reason: string } | undefined
        if (lowerRaw.includes('categories')) {
          hallucinatedFix = { replacement: raw.replace(/categories/i, 'labels'), reason: 'Blogger uses \'labels\', not \'categories\'.' }
        }
        else if (lowerRaw.includes('headertitle')) {
          hallucinatedFix = { replacement: raw.replace(/headerTitle/i, 'title'), reason: 'Blogger Header widget uses \'title\'.' }
        }
        else if (lowerRaw.includes('logourl')) {
          hallucinatedFix = { replacement: raw.replace(/logoUrl/i, 'image'), reason: 'Blogger Header widget uses \'image\'.' }
        }
        else if (lowerRaw.includes('author.photo.url') || lowerRaw.includes('authorphoto.url')) {
          hallucinatedFix = { replacement: raw.replace(/photo\.url|authorPhoto\.url/i, 'authorPhoto.image'), reason: 'Author photo URL resides under authorPhoto.image.' }
        }

        if (hallucinatedFix) {
          pushDiagnostic(diagnostics, catalog, 'BX1051', fakeToken, {
            attribute: context?.attributeName,
            start: baseAbsStart,
            end: baseAbsEnd,
            suggestedReplacement: hallucinatedFix.replacement,
            fixes: [{
              title: `Use '${hallucinatedFix.replacement}'`,
              isPreferred: true,
              edits: [{ start: baseAbsStart, end: baseAbsEnd, newText: hallucinatedFix.replacement }],
            }],
            message: `Property in '${raw}' is hallucinated. ${hallucinatedFix.reason}`,
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
    const raw = (node as any).raw || ''
    const cleanPath = raw.startsWith('data:') ? raw.slice(5) : raw
    if (cleanPath.endsWith('.date') || cleanPath === 'date') {
      return true
    }
    const lastMember = (node as any).members?.[(node as any).members?.length - 1]
    if (lastMember && typeof lastMember.property === 'string') {
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
        tagName: token.tagName,
        tagStart: token.tagStart,
        tagEnd: token.tagEnd,
        attributeName: attrName,
        valueStart: attrToken.valueStart,
        valueEnd: attrToken.valueEnd,
        widgetType: currentWidgetType,
        skinVariables: effectiveSkinVars,
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
  const pendingIncludes: Array<{ token: BloggerDirectiveToken, container: BloggerDirectiveToken }> = []
  const defaultMarkupIncludableIds = new Set<string>()
  const skinVariables = collectSkinVariablesFromTokens(tokens)
  const declaredSkinVars = new Set<string>(Object.keys(skinVariables))

  interface ActiveMessageContext {
    readonly token: BloggerDirectiveToken
    readonly messageKey?: string
    readonly isPlural: boolean
    lastParamToken?: BloggerDirectiveToken
  }
  const messageStack: ActiveMessageContext[] = []

  for (const token of tokens) {
    if (token.isClosing) {
      if (token.tagName.toLowerCase() === 'b:message' && messageStack.length > 0) {
        messageStack.pop()
      }
      handleClosingTag(token, tagStack, catalog, diagnostics)
      continue
    }

    if (token.tagName === 'b:message' && !token.isSelfClosing) {
      const rawName = token.attributes.name?.value?.trim() ?? ''
      const msgKey = rawName.startsWith('messages.') ? rawName.slice('messages.'.length) : rawName
      const msgDef = catalog.getMessage(msgKey)
      const isPlural = Boolean(msgDef?.pattern && /\{[^{}]+,\s*plural\s*,/.test(msgDef.pattern))
      messageStack.push({ token, messageKey: msgKey, isPlural })
    }

    if (token.tagName === 'b:param') {
      const currentMsg = messageStack.length > 0 ? messageStack[messageStack.length - 1] : undefined
      if (currentMsg) {
        if (currentMsg.lastParamToken) {
          const prevEnd = currentMsg.lastParamToken.tagEnd
          const currStart = token.tagStart
          let isConcatenatedWithoutWhitespace = false
          if (typeof tokensOrXml === 'string') {
            const gap = tokensOrXml.slice(prevEnd, currStart)
            isConcatenatedWithoutWhitespace = !/\s/.test(gap)
          }
          else {
            isConcatenatedWithoutWhitespace = currStart <= prevEnd
          }

          if (isConcatenatedWithoutWhitespace) {
            const diagCode = 'BX1029' as BloggerDiagnosticCode
            pushDiagnostic(diagnostics, catalog, diagCode, token, {
              start: token.tagStart,
              end: token.tagEnd,
              message: 'Multiple <b:param> tags must be separated by whitespace to avoid parameter parsing errors.',
            })
          }
        }

        if (currentMsg.isPlural) {
          const nameAttr = token.attributes.name
          if (!nameAttr || !nameAttr.value.trim()) {
            const diagCode = 'BX1028' as BloggerDiagnosticCode
            pushDiagnostic(diagnostics, catalog, diagCode, token, {
              start: token.tagStart,
              end: token.tagEnd,
              message: `Pluralized ICU message '${currentMsg.messageKey}' requires the 'name' attribute on child <b:param> tags.`,
            })
          }
        }

        currentMsg.lastParamToken = token
      }
    }

    validateNestingRules(token, tagStack, catalog, diagnostics, tokens)
    validateDirectiveAttributeRules(token, catalog, diagnostics)
    validateIdentifierUniqueness(token, globalSectionWidgetIds, containerIncludableIds, tagStack, catalog, diagnostics)
    validateWidgetElement(token, catalog, diagnostics)
    validateVariableElement(token, catalog, diagnostics)
    validateDataElement(token, catalog, diagnostics, skinVariables)
    validateIncludeElement(token, catalog, diagnostics)

    if (token.tagName === 'Variable') {
      const nameVal = token.attributes.name?.value?.trim()
      if (nameVal) {
        declaredSkinVars.add(nameVal)
      }
    }

    if (token.tagName === 'b:includable' && !token.isClosing) {
      if (tagStack.some(t => t.tagName === 'b:defaultmarkup')) {
        const idVal = token.attributes.id?.value?.trim()
        if (idVal) {
          defaultMarkupIncludableIds.add(idVal)
        }
      }
    }

    if (token.tagName === 'b:include' && !token.isClosing) {
      const enclosingWidget = tagStack.slice().reverse().find(t => t.tagName === 'b:widget')
      if (enclosingWidget) {
        pendingIncludes.push({ token, container: enclosingWidget })
      }
    }

    if (!token.isSelfClosing) {
      tagStack.push(token)
    }
  }

  for (const { token, container } of pendingIncludes) {
    const nameAttr = token.attributes.name
    if (nameAttr?.value) {
      const name = nameAttr.value.trim()
      const isSuper = name.startsWith('super.')
      const isDynamic = name.includes('{') || name.startsWith('data:')
      const isServerInclusion = Boolean(catalog.getInclusion(name))
      const widgetIncludables = containerIncludableIds.get(container)
      const isInWidget = widgetIncludables?.has(name) ?? false
      const isInDefaultMarkup = defaultMarkupIncludableIds.has(name)

      if (!isSuper && !isDynamic && !isServerInclusion && !isInWidget && !isInDefaultMarkup) {
        const diagCode = (catalog.getStandardDiagnostic('unresolved_inclusion') || 'BX1037') as BloggerDiagnosticCode
        const diagRule = catalog.getDiagnostic(diagCode)
        pushDiagnostic(diagnostics, catalog, diagCode, token, {
          attribute: nameAttr.name,
          start: nameAttr.start,
          end: nameAttr.end,
          message: diagRule?.message ?? `Referenced includable '${name}' was not found within the current widget, parent widget, or default markup.`,
        })
      }
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

  if (typeof tokensOrXml === 'string') {
    validateSkinStyles(tokensOrXml, declaredSkinVars, catalog, diagnostics)
  }

  if (options?.validateExpressions) {
    const exprDiags = validateTemplateExpressions(tokens, catalog, skinVariables)
    diagnostics.push(...exprDiags)
  }

  return diagnostics
}

function validateSkinStyles(
  xmlText: string,
  declaredVars: ReadonlySet<string>,
  catalog: SpecCatalog,
  diagnostics: BloggerStructureDiagnostic[],
): void {
  const skinRegex = /<b:(?:template-)?skin\b[^>]*>([\s\S]*?)<\/b:(?:template-)?skin>/gi
  for (const match of xmlText.matchAll(skinRegex)) {
    const fullTag = match[0]
    const tagStart = match.index ?? 0
    const fakeToken: BloggerDirectiveToken = {
      tagName: 'b:skin',
      tagStart,
      tagEnd: tagStart + fullTag.length,
      isClosing: false,
      isSelfClosing: false,
      hasSelfClosingSlash: false,
      attributesText: '',
      rawAttributesText: '',
      attributesOffset: tagStart,
      attributes: {},
    }

    const cdataStart = fullTag.indexOf('<![CDATA[')
    if (cdataStart === -1) {
      continue
    }
    const cdataEnd = fullTag.indexOf(']]>', cdataStart)
    if (cdataEnd === -1) {
      continue
    }

    const cdataContent = fullTag.slice(cdataStart + 9, cdataEnd)
    const baseOffset = tagStart + cdataStart + 9

    const maskedContent = cdataContent.replace(/<[^>]+>/g, m => ' '.repeat(m.length))

    // 1. BX1052: $var.name outside parentheses
    const dottedSkinVarRegex = /(?<![\w$])\$([a-z_]\w*\.[a-z_][\w.-]*)/gi
    for (const dMatch of maskedContent.matchAll(dottedSkinVarRegex)) {
      const varName = dMatch[1]!
      const start = baseOffset + (dMatch.index ?? 0)
      const end = start + dMatch[0].length
      const replacement = `$(${varName})`
      pushDiagnostic(diagnostics, catalog, 'BX1052', fakeToken, {
        start,
        end,
        suggestedReplacement: replacement,
        fixes: [{
          title: `Convert to '${replacement}'`,
          isPreferred: true,
          edits: [{ start, end, newText: replacement }],
        }],
        message: `Skin variable reference '${dMatch[0]}' with dots requires parenthesized syntax '${replacement}' within <b:skin> CSS.`,
      })
    }

    // 2. BX1053: $(varName) or $varName not declared
    if (declaredVars.size > 0) {
      const parenSkinVarRegex = /\$\(([a-z_][\w.-]*)\)/gi
      for (const pMatch of maskedContent.matchAll(parenSkinVarRegex)) {
        const rawVar = pMatch[1]!
        const baseVar = rawVar.split('.')[0]!
        if (!declaredVars.has(rawVar) && !declaredVars.has(baseVar)) {
          const start = baseOffset + (pMatch.index ?? 0)
          const end = start + pMatch[0].length
          pushDiagnostic(diagnostics, catalog, 'BX1053', fakeToken, {
            start,
            end,
            message: `Referenced skin variable '${rawVar}' was not declared in a <Variable> tag within the Theme Designer skin.`,
          })
        }
      }

      const standaloneRegex = /(?<![\w$])\$([a-z_]\w*)\b(?!\.)/gi
      for (const sMatch of maskedContent.matchAll(standaloneRegex)) {
        const rawVar = sMatch[1]!
        if (!declaredVars.has(rawVar)) {
          const start = baseOffset + (sMatch.index ?? 0)
          const end = start + sMatch[0].length
          pushDiagnostic(diagnostics, catalog, 'BX1053', fakeToken, {
            start,
            end,
            message: `Referenced skin variable '${rawVar}' was not declared in a <Variable> tag within the Theme Designer skin.`,
          })
        }
      }
    }
  }
}
