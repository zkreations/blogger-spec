import type { BloggerDirectiveNode, BloggerDocumentNode, BloggerTemplateNode } from '../ast.js'
import type { SpecCatalog } from '../catalogs/index.js'
import type { DiscoveredWidget } from './types.js'
import { getSpecCatalog } from '../catalogs/index.js'
import { parseTemplate } from '../parser/template-parser.js'

/**
 * Strict canonical widget ID pattern in Blogger (BX1047).
 * Format: declared widget type followed by an integer from 1 to 999.
 * e.g., 'PageList1', 'Blog1', 'Header1', 'HTML999'.
 */
export const CANONICAL_WIDGET_ID_REGEX = /^([A-Z][a-zA-Z0-9]*?)([1-9]\d{0,2})$/

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
  const pattern = new RegExp(`^${escaped}[1-9]\\d{0,2}$`)
  return pattern.test(id)
}

/**
 * Normalizes a navigation link item supporting canonical shape ({ title, href })
 * as well as shorthand format ({ "Title": "/url" }).
 */
export function normalizeLinkItem(item: any): { title: string, href: string, isCurrentPage?: boolean } {
  if (!item || typeof item !== 'object') {
    return { title: String(item ?? ''), href: '' }
  }
  if ('title' in item || 'href' in item || 'name' in item || 'target' in item) {
    return {
      title: String(item.title ?? item.name ?? ''),
      href: String(item.href ?? item.target ?? ''),
      ...(item.isCurrentPage !== undefined ? { isCurrentPage: Boolean(item.isCurrentPage) } : {}),
    }
  }
  // Shorthand syntax: { "Home": "/" } or { "Contact": "/p/contact.html" }
  const entries = Object.entries(item)
  if (entries.length > 0) {
    const [title, href] = entries[0]!
    return {
      title: String(title),
      href: String(href),
    }
  }
  return { title: '', href: '' }
}

/**
 * Parses and deserializes `pageListJson` widget setting.
 * Supports both JSON arrays and Blogger dictionary objects.
 */
export function parsePageListJson(rawJson: string): Array<{ title: string, href: string, position?: number }> {
  try {
    const parsed = JSON.parse(rawJson)
    if (Array.isArray(parsed)) {
      return parsed
        .map(item => normalizeLinkItem(item))
        .filter(item => item.title || item.href)
    }
    if (parsed && typeof parsed === 'object') {
      const items = Object.values(parsed) as any[]
      return items
        .map(item => ({
          title: String(item.title ?? item.name ?? ''),
          href: String(item.href ?? item.target ?? ''),
          position: typeof item.position === 'number' ? item.position : undefined,
        }))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .filter(item => item.title || item.href)
    }
  }
  catch {
    // Silently fallback if JSON is invalid or malformed
  }
  return []
}

/**
 * Extracts and deserializes widget settings from a <b:widget-settings> element.
 */
export function extractWidgetSettingsFromNode(
  children: readonly BloggerTemplateNode[],
  widgetType: string,
  catalog: SpecCatalog = getSpecCatalog(),
): Record<string, unknown> | undefined {
  const settingsNode = children.find(
    (c): c is BloggerDirectiveNode => c.type === 'Directive' && c.name === 'b:widget-settings',
  )
  if (!settingsNode) {
    return undefined
  }

  const widgetSpec = widgetType ? catalog.getWidgetSettings(widgetType) : undefined
  const canonicalDefs = (widgetSpec?.canonical ?? {}) as Record<string, any>
  const result: Record<string, unknown> = {}

  for (const child of settingsNode.children) {
    if (child.type !== 'Directive' || child.name !== 'b:widget-setting') {
      continue
    }
    const nameAttr = child.attributes.find(a => a.name === 'name')
    const settingName = String(nameAttr?.value ?? '').trim()
    if (!settingName) {
      continue
    }

    let rawText = ''
    for (const sub of child.children) {
      if (sub.type === 'CData' || sub.type === 'Text') {
        rawText += sub.value
      }
    }

    const def = canonicalDefs[settingName]
    const trimmed = rawText.trim()
    let coerced: unknown = rawText

    if (def?.type === 'boolean' || (!def && (trimmed === 'true' || trimmed === 'false' || trimmed === 'yes' || trimmed === 'no'))) {
      const lower = trimmed.toLowerCase()
      coerced = lower === 'true' || lower === 'yes'
    }
    else if (def?.type === 'number' || (!def && settingName !== 'content' && /^-?\d+(?:\.\d+)?$/.test(trimmed))) {
      coerced = Number(trimmed)
    }
    else if (def?.value_transform === 'lowercase') {
      coerced = trimmed.toLowerCase()
    }

    result[settingName] = coerced

    // Handle JSON serialization (e.g. PageList pageListJson)
    if (def?.serialization_format === 'json' || settingName === 'pageListJson') {
      const parsedLinks = parsePageListJson(trimmed)
      if (parsedLinks.length > 0) {
        result.links = parsedLinks
      }
    }

    // Handle bound runtime data
    const boundPath: unknown = def?.bound_runtime_data
    if (typeof boundPath === 'string' && boundPath.startsWith('data:')) {
      const cleanBound = boundPath.slice(5)
      if (cleanBound === 'links[0].title') {
        result.homeTitle = coerced
        if (Array.isArray(result.links) && result.links.length > 0 && result.links[0]) {
          result.links[0] = { ...result.links[0], title: String(coerced) }
        }
      }
      else if (cleanBound && !cleanBound.includes('.') && !(cleanBound in result)) {
        result[cleanBound] = coerced
      }
      else if (cleanBound && cleanBound.includes('.')) {
        // Deep property binding (e.g. allBylineItems.author.label)
        const parts = cleanBound.split('.')
        let curr: any = result
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i]!
          curr[part] = curr[part] || {}
          curr = curr[part]
        }
        curr[parts[parts.length - 1]!] = coerced
      }
    }
  }

  // Handle patterns (LinkList/TextList link-{index} and text-{index})
  const patterns = (widgetSpec as any)?.patterns as Array<{ template?: string, paired_with?: string }> | undefined
  if (Array.isArray(patterns)) {
    const hasLinkPairs = patterns.some(p => p.template === 'link-{index}')
    if (hasLinkPairs && !('links' in result)) {
      const indices = new Set<number>()
      for (const key of Object.keys(result)) {
        const match = /^(?:link|text)-(\d+)$/.exec(key)
        if (match) {
          indices.add(Number(match[1]))
        }
      }
      if (indices.size > 0) {
        let links = Array.from(indices)
          .sort((a, b) => a - b)
          .map(idx => ({
            name: String(result[`text-${idx}`] ?? ''),
            target: String(result[`link-${idx}`] ?? ''),
          }))
        if (result.sorting === 'alphabetical') {
          links = [...links].sort((a, b) => a.name.localeCompare(b.name))
        }
        else if (result.sorting === 'reverse_alphabetical') {
          links = [...links].sort((a, b) => b.name.localeCompare(a.name))
        }
        if (typeof result.shownum === 'number' && result.shownum > 0) {
          links = links.slice(0, result.shownum)
        }
        result.links = links
      }
    }

    const hasItemSeries = patterns.some(p => p.template === 'item-{index}')
    if (hasItemSeries && !('items' in result)) {
      const indices = new Set<number>()
      for (const key of Object.keys(result)) {
        const match = /^item-(\d+)$/.exec(key)
        if (match) {
          indices.add(Number(match[1]))
        }
      }
      if (indices.size > 0) {
        let items = Array.from(indices)
          .sort((a, b) => a - b)
          .map(idx => String(result[`item-${idx}`] ?? ''))
        if (result.sorting === 'alphabetical') {
          items = [...items].sort((a, b) => a.localeCompare(b))
        }
        else if (result.sorting === 'reverse_alphabetical') {
          items = [...items].sort((a, b) => b.localeCompare(a))
        }
        if (typeof result.shownum === 'number' && result.shownum > 0) {
          items = items.slice(0, result.shownum)
        }
        result.items = items
      }
    }
  }

  if (result.homeTitle && Array.isArray(result.links) && result.links.length > 0 && result.links[0]) {
    result.links[0] = { ...result.links[0], title: String(result.homeTitle) }
  }

  return result
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

  function walk(nodes: readonly BloggerTemplateNode[]): void {
    for (const node of nodes) {
      if (node.type === 'Directive' && node.name === 'b:widget') {
        const idAttr = node.attributes.find(a => a.name === 'id')
        const typeAttr = node.attributes.find(a => a.name === 'type')
        const titleAttr = node.attributes.find(a => a.name === 'title')
        const versionAttr = node.attributes.find(a => a.name === 'version')

        const id = idAttr?.value ? String(idAttr.value).trim() : ''
        const type = typeAttr?.value ? String(typeAttr.value).trim() : ''
        const title = titleAttr?.value ? String(titleAttr.value) : undefined
        const version = versionAttr?.value ? Number(versionAttr.value) : undefined

        if (id && type) {
          const settings = extractWidgetSettingsFromNode(node.children, type, catalog)
          widgets.push({
            id,
            type,
            title,
            version,
            ...(settings ? { settings } : {}),
          })
        }
      }
      if ('children' in node && Array.isArray(node.children)) {
        walk(node.children)
      }
    }
  }

  walk(ast.children)
  return widgets
}
