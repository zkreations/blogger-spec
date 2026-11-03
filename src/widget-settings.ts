import type { BloggerDirectiveNode, BloggerTemplateNode } from './ast.js'
import type { SpecCatalog } from './catalogs/index.js'
import { getSpecCatalog } from './catalogs/index.js'

/**
 * Normalizes a navigation link item supporting canonical shape ({ title, href }),
 * alternative LinkList shape ({ name, target }), and shorthand syntax ({ "Title": "/url" }).
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
 * Supports JSON arrays (standard and shorthand) and Blogger dictionary objects.
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
 * Finds the <b:widget-settings> directive inside a list of template nodes or within a <b:widget> directive.
 */
export function findWidgetSettingsNode(
  target: BloggerDirectiveNode | readonly BloggerTemplateNode[],
): BloggerDirectiveNode | undefined {
  if (Array.isArray(target)) {
    return (target as readonly BloggerTemplateNode[]).find(
      (c): c is BloggerDirectiveNode => c.type === 'Directive' && c.name === 'b:widget-settings',
    )
  }
  const node = target as BloggerDirectiveNode
  if (node && node.type === 'Directive') {
    if (node.name === 'b:widget-settings') {
      return node
    }
    if (node.name === 'b:widget' && Array.isArray(node.children)) {
      return node.children.find(
        (c): c is BloggerDirectiveNode => c.type === 'Directive' && c.name === 'b:widget-settings',
      )
    }
  }
  return undefined
}

/**
 * Hydrates and coerces raw key-value widget settings according to canonical specifications,
 * pattern definitions (LinkList/TextList link/item pairs), and bound runtime data paths.
 */
export function hydrateWidgetSettings(
  rawSettings: Record<string, string>,
  widgetType: string | undefined,
  catalog: SpecCatalog = getSpecCatalog(),
): Record<string, unknown> | undefined {
  const widgetSpec = widgetType ? catalog.getWidgetSettings(widgetType) : undefined
  const canonicalDefs = (widgetSpec?.canonical ?? {}) as Record<string, any>
  const result: Record<string, unknown> = {}

  for (const [settingName, rawText] of Object.entries(rawSettings)) {
    const trimmed = rawText.trim()
    const def = canonicalDefs[settingName]
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

  return Object.keys(result).length > 0 ? result : undefined
}

/**
 * Extracts and deserializes widget settings from a <b:widget-settings> element or widget children.
 */
export function deserializeWidgetSettings(
  target: BloggerDirectiveNode | readonly BloggerTemplateNode[],
  widgetType: string | undefined,
  catalog: SpecCatalog = getSpecCatalog(),
): Record<string, unknown> | undefined {
  const settingsNode = findWidgetSettingsNode(target)
  if (!settingsNode) {
    return undefined
  }

  const rawSettings: Record<string, string> = {}
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
    rawSettings[settingName] = rawText
  }

  return hydrateWidgetSettings(rawSettings, widgetType, catalog)
}
