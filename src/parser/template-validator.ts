import type { SpecCatalog } from '../catalogs/index.js'
import type {
  BloggerDirectiveToken,
  BloggerStructureDiagnostic,
  DirectiveNestingViolation,
} from '../types.js'
import { getSpecCatalog } from '../catalogs/index.js'
import { scanDirectiveTokens } from './directive-scanner.js'

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
      continue
    }

    const parentToken = tagStack.length > 0 ? tagStack[tagStack.length - 1] : undefined
    const isSection = token.tagName === 'b:section'
    const isWidget = token.tagName === 'b:widget'
    const isIncludable = token.tagName === 'b:includable'

    // 1. Nesting Checks
    if (isSection && tagStack.some(t => t.tagName === 'b:section')) {
      const rule = catalog.getDiagnostic('BX1035')
      if (rule) {
        diagnostics.push({
          code: rule.code,
          rule,
          message: rule.message,
          severity: rule.severity,
          tagName: token.tagName,
          tagStart: token.tagStart,
          tagEnd: token.tagEnd,
        })
      }
    }
    else if (isWidget && !tagStack.some(t => t.tagName === 'b:section')) {
      const rule = catalog.getDiagnostic('BX1034')
      if (rule) {
        diagnostics.push({
          code: rule.code,
          rule,
          message: rule.message,
          severity: rule.severity,
          tagName: token.tagName,
          tagStart: token.tagStart,
          tagEnd: token.tagEnd,
        })
      }
    }
    else if (isIncludable && !parentToken && !tagStack.some(t => t.tagName === 'b:widget' || t.tagName === 'b:defaultmarkup')) {
      const rule = catalog.getDiagnostic('BX1023')
      if (rule) {
        diagnostics.push({
          code: rule.code,
          rule,
          message: `<b:includable> must be placed inside <b:widget> or <b:defaultmarkup>.`,
          severity: rule.severity,
          tagName: token.tagName,
          tagStart: token.tagStart,
          tagEnd: token.tagEnd,
        })
      }
    }
    else if (parentToken) {
      const violation = validateDirectiveNesting(parentToken.tagName, token.tagName, catalog)
      if (violation) {
        diagnostics.push({
          code: violation.code,
          rule: violation.rule,
          message: violation.message,
          severity: violation.rule.severity,
          tagName: token.tagName,
          tagStart: token.tagStart,
          tagEnd: token.tagEnd,
        })
      }
    }

    // 2. Duplicate element ID across template for <b:section> and <b:widget>
    if (isSection || isWidget) {
      const idAttr = token.attributes.id
      if (idAttr) {
        const idVal = idAttr.value.trim()
        if (!idVal) {
          const rule = catalog.getDiagnostic('BX1039')
          if (rule) {
            diagnostics.push({
              code: rule.code,
              rule,
              message: `Element <${token.tagName}> has an empty 'id' attribute.`,
              severity: rule.severity,
              tagName: token.tagName,
              tagStart: idAttr.start,
              tagEnd: idAttr.end,
            })
          }
        }
        else if (globalSectionWidgetIds.has(idVal)) {
          const rule = catalog.getDiagnostic('BX1033')
          if (rule) {
            diagnostics.push({
              code: rule.code,
              rule,
              message: `Duplicate element identifier '${idVal}' detected. Blogger requires all <b:section> and <b:widget> elements to have unique 'id' attributes.`,
              severity: rule.severity,
              tagName: token.tagName,
              tagStart: idAttr.start,
              tagEnd: idAttr.end,
            })
          }
        }
        else {
          globalSectionWidgetIds.set(idVal, token)
        }
      }
    }

    // 3. Duplicate <b:includable id="..."> within container
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
        if (!idVal) {
          const rule = catalog.getDiagnostic('BX1039')
          if (rule) {
            diagnostics.push({
              code: rule.code,
              rule,
              message: `<b:includable> requires a non-empty 'id' attribute.`,
              severity: rule.severity,
              tagName: token.tagName,
              tagStart: idAttr.start,
              tagEnd: idAttr.end,
            })
          }
        }
        else if (container) {
          let idSet = containerIncludableIds.get(container)
          if (!idSet) {
            idSet = new Set()
            containerIncludableIds.set(container, idSet)
          }
          if (idSet.has(idVal)) {
            const rule = catalog.getDiagnostic('BX1036')
            if (rule) {
              diagnostics.push({
                code: rule.code,
                rule,
                message: `Duplicate includable identifier '${idVal}' in <${container.tagName}>.`,
                severity: rule.severity,
                tagName: token.tagName,
                tagStart: idAttr.start,
                tagEnd: idAttr.end,
              })
            }
          }
          else {
            idSet.add(idVal)
          }
        }
      }
    }

    // 4. Validate <Variable type="..."> attributes
    if (token.tagName === 'Variable') {
      const typeAttr = token.attributes.type
      if (typeAttr && typeAttr.value) {
        const varType = typeAttr.value.toLowerCase()
        const presentAttrs = Object.keys(token.attributes)
        const varValidation = catalog.validateVariableAttributes(varType, presentAttrs)
        if (!varValidation.valid && varValidation.invalidAttributes.length > 0) {
          const rule = catalog.getDiagnostic('BX1040')
          if (rule) {
            diagnostics.push({
              code: rule.code,
              rule,
              message: `Attribute(s) '${varValidation.invalidAttributes.join(', ')}' not supported for <Variable type="${varType}">.`,
              severity: rule.severity,
              tagName: token.tagName,
              tagStart: token.tagStart,
              tagEnd: token.tagEnd,
            })
          }
        }
      }
    }

    if (!token.isSelfClosing) {
      tagStack.push(token)
    }
  }

  return diagnostics
}
