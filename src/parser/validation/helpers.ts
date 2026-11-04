import type { SpecCatalog } from '../../catalogs/index.js'
import type { BloggerSkinVariableSymbol } from '../../data-path.js'
import type {
  BloggerDiagnosticCode,
  BloggerDiagnosticFix,
  BloggerDiagnosticRule,
  BloggerDiagnosticSeverity,
  BloggerDirectiveToken,
  BloggerStructureDiagnostic,
  BloggerTextEdit,
} from '../../types.js'
import { toSkinVarIdentifier } from '../../data-path.js'
import { getSkinTypeModifiers } from '../../type-system.js'

export function pushDiagnostic(
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
    severity?: BloggerDiagnosticSeverity
  },
): void {
  const baseRule = options?.rule ?? catalog.getDiagnostic(code)
  const severity = options?.severity ?? baseRule?.severity ?? 'error'
  const rule = baseRule
    ? (options?.severity && baseRule.severity !== options.severity ? { ...baseRule, severity } : baseRule)
    : {
        category: 'syntax' as const,
        code,
        evidence: 'unknown' as const,
        message: options?.message ?? `Diagnostic ${code}`,
        name: `Diagnostic ${code}`,
        severity,
        verified_at: '2026-01-01',
      }
  diagnostics.push({
    attribute: options?.attribute,
    code: rule.code ?? code,
    fixes: options?.fixes,
    message: options?.message ?? rule.message ?? `Diagnostic ${code}`,
    rule,
    severity,
    suggestedReplacement: options?.suggestedReplacement,
    tagEnd: options?.end ?? token.tagEnd,
    tagName: token.tagName,
    tagStart: options?.start ?? token.tagStart,
  })
}

export function handleClosingTag(
  token: BloggerDirectiveToken,
  tagStack: BloggerDirectiveToken[],
  catalog: SpecCatalog,
  diagnostics: BloggerStructureDiagnostic[],
): void {
  const lower = token.tagName.toLowerCase()
  const top = tagStack[tagStack.length - 1]
  if (!top || top.tagName.toLowerCase() !== lower) {
    const directive = catalog.getDirective(token.tagName)
    const closingTagDiag = directive?.grammar?.invalid_nesting_policy?.on_invalid_child?.diagnostic
    const isProhibitedClosing = Boolean(closingTagDiag && directive?.grammar?.valid_children?.length === 0)
    if (isProhibitedClosing && closingTagDiag) {
      const code = closingTagDiag
      const rule = catalog.getDiagnostic(code)
      pushDiagnostic(diagnostics, catalog, code, token, {
        message: rule?.message ?? `Closing tag </${token.tagName}> is prohibited for self-closing directive <${token.tagName}/>.`,
        rule,
      })
    }
    else {
      const code = catalog.getStandardDiagnostic('mismatched_or_unclosed_tag')
      const rule = catalog.getDiagnostic(code)
      pushDiagnostic(diagnostics, catalog, code, token, {
        message: rule?.message ?? `Closing tag </${token.tagName}> does not match the currently open tag.`,
        rule,
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

export function buildHallucinatedDirectiveFixes(
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
    end: token.tagEnd,
    newText: openTagText,
    start: token.tagStart,
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
                  end: nextTok.tagEnd,
                  newText: '',
                  start: nextTok.tagStart,
                })
              }
              else {
                edits.push({
                  end: nextTok.tagEnd,
                  newText: `</${targetTag}>`,
                  start: nextTok.tagStart,
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
    edits,
    isPreferred: true,
    title: `Convert <${token.tagName}> to <${targetTag}>`,
  }]
}

export function isPrimitiveScalarLiteral(val: string): boolean {
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

export function collectSkinVariablesFromTokens(tokens: readonly BloggerDirectiveToken[]): Record<string, BloggerSkinVariableSymbol> {
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
          default: defaultVal,
          description,
          name,
          type,
          value,
        }
      }
    }
  }
  return result
}

const skinModifiersCache = new WeakMap<SpecCatalog, Set<string>>()

export function getAllSkinModifiers(catalog: SpecCatalog): Set<string> {
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

export interface SkinVarValidationResult {
  readonly isInvalid: boolean
  readonly normalizedSubpath?: string
}

export function checkSkinVarSubpath(
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

