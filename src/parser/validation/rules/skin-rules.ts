import type { SpecCatalog } from '../../../catalogs/index.js'
import type { BloggerSkinVariableSymbol } from '../../../data-path.js'
import type {
  BloggerDirectiveToken,
  BloggerStructureDiagnostic,
} from '../../../types.js'
import { getSpecCatalog } from '../../../catalogs/index.js'
import { getSkinTypeModifiers } from '../../../type-system.js'
import { pushDiagnostic } from '../helpers.js'

export function validateVariableElement(
  token: BloggerDirectiveToken,
  catalog: SpecCatalog,
  diagnostics: BloggerStructureDiagnostic[],
): void {
  if (token.tagName !== 'Variable' && token.tagName !== 'Group') {
    return
  }

  for (const attr of Object.values(token.attributes)) {
    if (attr.quote === '\'') {
      pushDiagnostic(diagnostics, catalog, catalog.getStandardDiagnostic('invalid_skin_variable_syntax'), token, {
        attribute: attr.name,
        message: `Theme Designer tags (<${token.tagName}>) strictly require double quotes ("...") for attributes. Single quotes are not supported by the Theme Designer parser.`,
      })
    }
  }

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

export function validateSkinVariableReference(
  rawVar: string,
  skinVariables: Record<string, BloggerSkinVariableSymbol>,
  catalog: SpecCatalog,
): { isValid: true } | { isValid: false, message: string } {
  if (skinVariables[rawVar]) {
    return { isValid: true }
  }

  if (rawVar.includes('.')) {
    const lastDot = rawVar.lastIndexOf('.')
    const candidateVar = rawVar.slice(0, lastDot)
    const candidateMod = rawVar.slice(lastDot + 1)

    const baseVar = skinVariables[candidateVar]
    if (baseVar) {
      const varType = baseVar.type || 'string'
      const modifiers = getSkinTypeModifiers(varType, catalog)
      if (candidateMod in modifiers) {
        const modDef = modifiers[candidateMod]
        if (modDef && modDef.available_in_skin === false) {
          return {
            isValid: false,
            message: `Modifier '${candidateMod}' for skin variable '${candidateVar}' of type '${varType}' is only supported in outside-skin expressions (data:skin.vars...), not within $(...).`,
          }
        }
        return { isValid: true }
      }
      return {
        isValid: false,
        message: `Modifier '${candidateMod}' is not supported for skin variable '${candidateVar}' of type '${varType}'.`,
      }
    }

    let dotIdx = rawVar.indexOf('.')
    let longestPrefixVar: BloggerSkinVariableSymbol | undefined
    let longestPrefixName = ''
    while (dotIdx !== -1) {
      const prefix = rawVar.slice(0, dotIdx)
      if (skinVariables[prefix]) {
        longestPrefixVar = skinVariables[prefix]
        longestPrefixName = prefix
      }
      dotIdx = rawVar.indexOf('.', dotIdx + 1)
    }

    if (longestPrefixVar) {
      const remainder = rawVar.slice(longestPrefixName.length + 1)
      return {
        isValid: false,
        message: `Skin variable '${longestPrefixName}' does not support nested property path '${remainder}'.`,
      }
    }
  }

  return {
    isValid: false,
    message: `Referenced skin variable '${rawVar}' was not declared in a <Variable> tag within the Theme Designer skin.`,
  }
}

export function validateSkinStyles(
  xmlText: string,
  skinVariables: Record<string, BloggerSkinVariableSymbol> | ReadonlySet<string>,
  catalog: SpecCatalog = getSpecCatalog(),
  diagnostics: BloggerStructureDiagnostic[] = [],
): BloggerStructureDiagnostic[] {
  const normalizedSkinVars: Record<string, BloggerSkinVariableSymbol> = skinVariables instanceof Set
    ? Object.fromEntries(Array.from(skinVariables).map(name => [name, { name, type: 'string' }]))
    : skinVariables

  const skinRegex = /<b:(?:template-)?skin\b[^>]*>([\s\S]*?)<\/b:(?:template-)?skin>/gi
  for (const match of xmlText.matchAll(skinRegex)) {
    const fullTag = match[0]
    const tagStart = match.index ?? 0
    const fakeToken: BloggerDirectiveToken = {
      attributes: {},
      attributesOffset: tagStart,
      attributesText: '',
      hasSelfClosingSlash: false,
      isClosing: false,
      isSelfClosing: false,
      rawAttributesText: '',
      tagEnd: tagStart + fullTag.length,
      tagName: 'b:skin',
      tagStart,
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
      pushDiagnostic(diagnostics, catalog, catalog.getStandardDiagnostic('invalid_skin_variable_syntax'), fakeToken, {
        end,
        fixes: [{
          edits: [{ end, newText: replacement, start }],
          isPreferred: true,
          title: `Convert to '${replacement}'`,
        }],
        message: `Skin variable reference '${dMatch[0]}' with dots requires parenthesized syntax '${replacement}' within <b:skin> CSS.`,
        start,
        suggestedReplacement: replacement,
      })
    }

    // 2. BX1053: $(varName) or $varName not declared / invalid modifier / nested path
    if (Object.keys(normalizedSkinVars).length > 0) {
      const parenSkinVarRegex = /\$\(([a-z_][\w.-]*)\)/gi
      for (const pMatch of maskedContent.matchAll(parenSkinVarRegex)) {
        const rawVar = pMatch[1]!
        const check = validateSkinVariableReference(rawVar, normalizedSkinVars, catalog)
        if (!check.isValid) {
          const start = baseOffset + (pMatch.index ?? 0)
          const end = start + pMatch[0].length
          pushDiagnostic(diagnostics, catalog, catalog.getStandardDiagnostic('unresolved_skin_variable'), fakeToken, {
            end,
            message: check.message,
            start,
          })
        }
      }

      const standaloneRegex = /(?<![\w$])\$([a-z_]\w*)\b(?!\.)/gi
      for (const sMatch of maskedContent.matchAll(standaloneRegex)) {
        const rawVar = sMatch[1]!
        if (!normalizedSkinVars[rawVar]) {
          const start = baseOffset + (sMatch.index ?? 0)
          const end = start + sMatch[0].length
          pushDiagnostic(diagnostics, catalog, catalog.getStandardDiagnostic('unresolved_skin_variable'), fakeToken, {
            end,
            message: `Referenced skin variable '${rawVar}' was not declared in a <Variable> tag within the Theme Designer skin.`,
            start,
          })
        }
      }
    }
  }

  return diagnostics
}

