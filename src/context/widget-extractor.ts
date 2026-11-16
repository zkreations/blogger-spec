import type { BloggerDocumentNode, BloggerTemplateNode } from '../ast.js'
import type { SpecCatalog } from '../catalogs/index.js'
import type { DiscoveredWidget } from './types.js'
import { getSpecCatalog } from '../catalogs/index.js'
import { isBloggerTruthy as isTruthyAttr } from '../core/common.js'
import { unescapeXmlEntities } from '../parser/lexer.js'
import { parseTemplate } from '../parser/template-parser.js'
import { deserializeWidgetSettings } from '../widget-settings.js'

export { normalizeLinkItem, parsePageListJson } from '../widget-settings.js'

/**
 * Strict canonical widget ID pattern in Blogger (BX1047).
 * Format: declared widget type followed by an integer from 1 to 1000.
 * e.g., 'PageList1', 'Blog1', 'Header1', 'HTML1000'.
 */
export const CANONICAL_WIDGET_ID_REGEX = /^([A-Z][a-zA-Z]*)([1-9]\d{0,2}|1000)$/

export function parseCanonicalWidgetId(id: string): { type: string, index: number } | undefined {
  const match = CANONICAL_WIDGET_ID_REGEX.exec(id)
  if (!match) {
    return undefined
  }
  return {
    type: match[1]!,
    index: Number.parseInt(match[2]!, 10),
  }
}

export function isValidWidgetIdForType(id: string, type: string): boolean {
  if (!type || !id) {
    return false
  }
  const escaped = type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const canonicalPattern = new RegExp(`^${escaped}(?:[1-9]\\d{0,2}|1000)$`)
  if (canonicalPattern.test(id)) {
    return true
  }
  const suffixMatch = new RegExp(`^${escaped}([+-]?[0-9]+)$`).exec(id)
  if (suffixMatch) {
    const num = Number.parseInt(suffixMatch[1]!, 10)
    return !Number.isNaN(num) && num >= -2147483648 && num <= 1000
  }
  return false
}

/**
 * Extracts and deserializes widget settings from a <b:widget-settings> element.
 */
export function extractWidgetSettingsFromNode(
  children: readonly BloggerTemplateNode[],
  widgetType: string,
  catalog: SpecCatalog = getSpecCatalog(),
): Record<string, unknown> | undefined {
  return deserializeWidgetSettings(children, widgetType, catalog)
}

/**
 * Traverses template AST or XML to discover all `<b:widget>` elements.
 */
export function extractTemplateWidgets(
  source: BloggerDocumentNode | string,
  catalog: SpecCatalog = getSpecCatalog(),
): DiscoveredWidget[] {
  const ast: BloggerDocumentNode = typeof source === 'string'
    ? parseTemplate(source, { catalog, tolerant: true })
    : source

  const widgets: DiscoveredWidget[] = []

  function walk(nodes: readonly BloggerTemplateNode[], currentSectionId?: string): void {
    for (const node of nodes) {
      let nextSectionId = currentSectionId
      if (node.type === 'Directive' && node.name === 'b:section') {
        const sectionIdAttr = node.attributes.find(a => a.name === 'id')
        if (sectionIdAttr?.value) {
          nextSectionId = String(sectionIdAttr.value).trim()
        }
      }

      if (node.type === 'Directive' && node.name === 'b:widget') {
        const idAttr = node.attributes.find(a => a.name === 'id')
        const typeAttr = node.attributes.find(a => a.name === 'type')
        const titleAttr = node.attributes.find(a => a.name === 'title')
        const versionAttr = node.attributes.find(a => a.name === 'version')
        const visibleAttr = node.attributes.find(a => a.name === 'visible')

        const id = idAttr?.value ? String(idAttr.value).trim() : ''
        const type = typeAttr?.value ? String(typeAttr.value).trim() : ''
        const title = titleAttr?.value ? unescapeXmlEntities(String(titleAttr.value)) : undefined
        const version = versionAttr?.value ? Number(versionAttr.value) : undefined
        const visible = visibleAttr !== undefined ? isTruthyAttr(visibleAttr.value) : undefined

        if (id && type) {
          const settings = extractWidgetSettingsFromNode(node.children, type, catalog)
          widgets.push({
            id,
            type,
            title,
            version,
            ...(visible !== undefined ? { visible } : {}),
            ...(currentSectionId ? { sectionId: currentSectionId } : {}),
            ...(settings ? { settings } : {}),
          })
        }
      }
      if ('children' in node && Array.isArray(node.children)) {
        walk(node.children, nextSectionId)
      }
    }
  }

  walk(ast.children)
  return widgets
}
