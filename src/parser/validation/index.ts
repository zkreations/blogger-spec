import type { SpecCatalog } from '../../catalogs/index.js'
import type { BloggerSkinVariableSymbol } from '../../data-path.js'
import type { BloggerDirectiveToken, BloggerStructureDiagnostic } from '../../types.js'
import type { ValidateTemplateStructureOptions } from './types.js'
import { getSpecCatalog } from '../../catalogs/index.js'
import { scanDirectiveTokens } from '../directive-scanner.js'
import {
  collectSkinVariablesFromTokens,
  handleClosingTag,
  pushDiagnostic,
} from './helpers.js'
import {
  validateDataElement,
  validateDirectiveAttributeRules,
  validateIncludeElement,
  validateRootAttributes,
} from './rules/attributes-rules.js'
import {
  validateTemplateExpressions,
} from './rules/expression-rules.js'
import {
  validateNestingRules,
} from './rules/nesting-rules.js'
import {
  validateSkinStyles,
  validateVariableElement,
} from './rules/skin-rules.js'
import {
  validateIdentifierUniqueness,
  validateWidgetElement,
  validateWidgetSettingElement,
} from './rules/widget-rules.js'

export * from './rules/attributes-rules.js'
export * from './rules/expression-rules.js'
export * from './rules/nesting-rules.js'
export * from './rules/section-rules.js'
export * from './rules/skin-rules.js'
export * from './rules/widget-rules.js'
export type {
  BloggerDirectiveNestingViolation,
  BloggerExpressionValidationContext,
  BloggerStructureDiagnostic,
  ValidateTemplateStructureOptions,
} from './types.js'

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
  const localSkinVars = collectSkinVariablesFromTokens(tokens)
  const skinVariables: Record<string, BloggerSkinVariableSymbol> = { ...localSkinVars }
  if (options?.skinVariables) {
    for (const [k, v] of Object.entries(options.skinVariables)) {
      if (typeof v === 'string') {
        skinVariables[k] = { name: k, type: v }
      }
      else {
        skinVariables[k] = v
      }
    }
  }

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
      messageStack.push({ isPlural, messageKey: msgKey, token })
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
            const diagCode = catalog.getMessageDiagnostic('inline_concatenated_params')
            pushDiagnostic(diagnostics, catalog, diagCode, token, {
              end: token.tagEnd,
              message: 'Multiple <b:param> tags must be separated by whitespace to avoid parameter parsing errors.',
              start: token.tagStart,
            })
          }
        }

        if (currentMsg.isPlural) {
          const nameAttr = token.attributes.name
          if (!nameAttr || !nameAttr.value.trim()) {
            const diagCode = catalog.getMessageDiagnostic('plural_param_missing_name')
            pushDiagnostic(diagnostics, catalog, diagCode, token, {
              end: token.tagEnd,
              message: `Pluralized ICU message '${currentMsg.messageKey}' requires the 'name' attribute on child <b:param> tags.`,
              start: token.tagStart,
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
    const currentEnclosingWidget = tagStack.slice().reverse().find(t => t.tagName === 'b:widget')
    const currentWidgetType = currentEnclosingWidget?.attributes.type?.value?.trim()
    validateWidgetSettingElement(token, currentEnclosingWidget, tokensOrXml, catalog, diagnostics)
    validateDataElement(token, catalog, diagnostics, skinVariables, currentWidgetType)
    validateIncludeElement(token, catalog, diagnostics)
    validateRootAttributes(token, catalog, diagnostics)

    if (token.tagName === 'b:includable' && !token.isClosing) {
      if (tagStack.some(t => t.tagName === 'b:defaultmarkup')) {
        const idVal = token.attributes.id?.value?.trim()
        if (idVal && !idVal.startsWith('super.')) {
          defaultMarkupIncludableIds.add(idVal)
        }
      }
    }

    if (token.tagName === 'b:include' && !token.isClosing) {
      const enclosingWidget = tagStack.slice().reverse().find(t => t.tagName === 'b:widget')
      if (enclosingWidget) {
        pendingIncludes.push({ container: enclosingWidget, token })
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
        const diagCode = catalog.getStandardDiagnostic('unresolved_inclusion')
        const diagRule = catalog.getDiagnostic(diagCode)
        pushDiagnostic(diagnostics, catalog, diagCode, token, {
          attribute: nameAttr.name,
          end: nameAttr.end,
          message: diagRule?.message ?? `Referenced includable '${name}' was not found within the current widget, parent widget, or default markup.`,
          start: nameAttr.start,
        })
      }
    }
  }

  const unclosedCode = catalog.getStandardDiagnostic('mismatched_or_unclosed_tag')
  const rule = catalog.getDiagnostic(unclosedCode)
  for (const token of tagStack) {
    pushDiagnostic(diagnostics, catalog, unclosedCode, token, {
      message: rule?.message ?? `Tag <${token.tagName}> is not closed.`,
      rule,
    })
  }

  if (typeof tokensOrXml === 'string') {
    validateSkinStyles(tokensOrXml, skinVariables, catalog, diagnostics)
  }

  if (options?.validateExpressions) {
    const exprDiags = validateTemplateExpressions(tokens, catalog, skinVariables)
    diagnostics.push(...exprDiags)
  }

  return diagnostics
}
