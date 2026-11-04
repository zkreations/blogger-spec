import type { SpecCatalog } from '../../../catalogs/index.js'
import type { BloggerDirectiveToken, BloggerStructureDiagnostic } from '../../../types.js'
import { pushDiagnostic } from '../helpers.js'

export function validateWidgetElement(
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
        const idDiagCode = catalog.getDirective('b:widget')?.attributes?.id?.diagnostic ?? 'BX1047'
        pushDiagnostic(diagnostics, catalog, idDiagCode, token, {
          end: idAttr.end,
          message: `Widget id '${id}' is invalid for type '${type}'. Expected '${type}' followed by a number between 1 and 999 (e.g. '${type}1').`,
          start: idAttr.start,
        })
      }

      const widgetDef = catalog.getWidget(type)
      if (widgetDef?.warning_diagnostic) {
        const diagCode = widgetDef.warning_diagnostic
        const rule = catalog.getDiagnostic(diagCode)
        pushDiagnostic(diagnostics, catalog, diagCode, token, {
          message: rule?.message,
          rule,
          severity: rule?.severity ?? 'warning',
        })
      }
    }
  }
}

export function validateWidgetSettingElement(
  token: BloggerDirectiveToken,
  widgetToken: BloggerDirectiveToken | undefined,
  tokensOrXml: readonly BloggerDirectiveToken[] | string,
  catalog: SpecCatalog,
  diagnostics: BloggerStructureDiagnostic[],
): void {
  if (token.tagName !== 'b:widget-setting' || !widgetToken) {
    return
  }

  const widgetType = widgetToken.attributes.type?.value?.trim()
  const widgetId = widgetToken.attributes.id?.value?.trim() ?? widgetType ?? 'widget'
  const settingName = token.attributes.name?.value?.trim()

  if (!widgetType || !settingName) {
    return
  }

  const widgetSettingsDef = catalog.getWidgetSettings(widgetType)
  if (!widgetSettingsDef) {
    return
  }

  const invalidSettingDiag = catalog.getStandardDiagnostic('invalid_widget_setting')

  const dep = widgetSettingsDef.deprecated?.[settingName]
  if (dep) {
    if (settingName.startsWith('style.')) {
      pushDiagnostic(diagnostics, catalog, invalidSettingDiag, token, {
        message: `The widget settings in widget with id ${widgetId} is not valid. ${dep.reason || 'Unknown ad unit type'}`,
      })
      return
    }
    else {
      pushDiagnostic(diagnostics, catalog, catalog.getStandardDiagnostic('deprecated_data_property'), token, {
        message: `Widget setting '${settingName}' is deprecated for widget type '${widgetType}'. ${dep.reason || ''}`.trim(),
        severity: 'warning',
      })
    }
  }

  let rawContent: string | undefined
  if (typeof tokensOrXml === 'string') {
    const endTag = '</b:widget-setting>'
    const closeIdx = tokensOrXml.indexOf(endTag, token.tagEnd)
    if (closeIdx !== -1) {
      rawContent = tokensOrXml.slice(token.tagEnd, closeIdx)
    }
  }

  const canonical = (widgetSettingsDef.canonical as Record<string, any>)?.[settingName]
  if (canonical && rawContent !== undefined) {
    let content = rawContent.trim()
    if (content.startsWith('<![CDATA[') && content.endsWith(']]>')) {
      content = content.slice(9, -3).trim()
    }

    if (canonical.allowed_values && canonical.allowed_values.length > 0) {
      if (!canonical.allowed_values.includes(content)) {
        const msg = widgetType === 'BloggerButton'
          ? `The widget settings in widget with id ${widgetId} is not valid. The specified logo URL is not allowed.`
          : `The widget settings in widget with id ${widgetId} is not valid. That is not one of the acceptable values`
        pushDiagnostic(diagnostics, catalog, invalidSettingDiag, token, { message: msg })
        return
      }
    }

    if (canonical.minimum !== undefined) {
      const num = Number(content)
      if (!Number.isNaN(num) && num < canonical.minimum) {
        pushDiagnostic(diagnostics, catalog, invalidSettingDiag, token, {
          message: `The widget settings in widget with id ${widgetId} is not valid. Must be at least ${canonical.minimum}`,
        })
        return
      }
    }

    if (canonical.serialization_format === 'json') {
      if (rawContent.includes('&lt;![CDATA[')) {
        pushDiagnostic(diagnostics, catalog, invalidSettingDiag, token, {
          message: `The widget settings in widget with id ${widgetId} is not valid. Page title is invalid.`,
        })
        return
      }
      try {
        JSON.parse(content)
      }
      catch {
        pushDiagnostic(diagnostics, catalog, invalidSettingDiag, token, {
          message: `The widget settings in widget with id ${widgetId} is not valid. Page title is invalid.`,
        })
      }
    }
  }
}

export function validateIdentifierUniqueness(
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
            end: idAttr.end,
            message: `Duplicate element identifier '${idVal}' detected. Blogger requires all <b:section> and <b:widget> elements to have unique 'id' attributes.`,
            start: idAttr.start,
          })
        }
        else {
          globalSectionWidgetIds.set(idVal, token)
        }
      }
    }
  }

  if (isIncludable) {
    const idAttr = token.attributes.id
    const idVal = idAttr?.value ? idAttr.value.trim() : ''

    if (idVal && idVal.startsWith('super.')) {
      const diagCode = catalog.getInclusionDiagnostic('prohibited_super_includable_override')
      const diagRule = catalog.getDiagnostic(diagCode)
      pushDiagnostic(diagnostics, catalog, diagCode, token, {
        attribute: 'id',
        end: idAttr.end,
        message: diagRule?.message ?? 'Defining or overriding an includable with a \'super.\' prefix is prohibited. Platform super delegators are immutable and cannot be declared via <b:includable>.',
        start: idAttr.start,
      })
    }

    let container: BloggerDirectiveToken | undefined
    for (let i = tagStack.length - 1; i >= 0; i--) {
      if (tagStack[i]!.tagName === 'b:widget' || tagStack[i]!.tagName === 'b:defaultmarkup') {
        container = tagStack[i]
        break
      }
    }

    if (idVal && container) {
      let idSet = containerIncludableIds.get(container)
      if (!idSet) {
        idSet = new Set()
        containerIncludableIds.set(container, idSet)
      }
      if (idSet.has(idVal)) {
        const dupIncDiag = catalog.getStandardDiagnostic('duplicate_includable_id')
        pushDiagnostic(diagnostics, catalog, dupIncDiag, token, {
          end: idAttr?.end,
          message: `Duplicate includable identifier '${idVal}' in <${container.tagName}>.`,
          start: idAttr?.start,
        })
      }
      else {
        idSet.add(idVal)
      }
    }
  }
}

