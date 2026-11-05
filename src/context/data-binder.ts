import type { SpecCatalog } from '../catalogs/index.js'

/**
 * Normalizes a Blogger data path into individual dot-separated property segments,
 * stripping the leading 'data:' namespace prefix and converting bracket indexers (e.g. `links[0].title` -> `['links', '0', 'title']`).
 */
export function parseDataPathSegments(path: string): string[] {
  const clean = path.startsWith('data:') ? path.slice(5) : path
  const normalized = clean.replace(/\[['"]?([^'"\]]+)['"]?\]/g, '.$1')
  return normalized.split('.').map(s => s.trim()).filter(Boolean)
}

/**
 * Traverses a nested target object or array and sets a deep property value,
 * automatically instantiating intermediate objects or arrays as needed.
 */
export function setDeepDataProperty(target: Record<string, any>, path: string, value: any): void {
  const segments = parseDataPathSegments(path)
  if (segments.length === 0) {
    return
  }

  let current = target
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!
    const nextSeg = segments[i + 1]!
    const isNextNumeric = /^\d+$/.test(nextSeg)

    if (current[seg] === null || current[seg] === undefined || typeof current[seg] !== 'object') {
      current[seg] = isNextNumeric ? [] : {}
    }
    current = current[seg]
  }

  const leafSeg = segments[segments.length - 1]!
  if (Array.isArray(current)) {
    const idx = Number(leafSeg)
    if (!Number.isNaN(idx)) {
      current[idx] = value
    }
  }
  else {
    current[leafSeg] = value
  }
}

/**
 * Safely reads a value from a nested data structure using a Blogger data path.
 */
export function getDeepDataProperty(target: Record<string, any>, path: string): any {
  const segments = parseDataPathSegments(path)
  if (segments.length === 0) {
    return undefined
  }

  let current: any = target
  for (const seg of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = current[seg]
  }

  return current
}

/**
 * Binds widget configuration settings into the canonical Blogger runtime data model
 * according to `catalogs/settings.json` declarations and `bound_runtime_data` path bindings.
 */
export function bindWidgetSettingsToData(
  rawSettings: Record<string, any>,
  widgetType: string,
  spec: SpecCatalog,
): Record<string, any> {
  const widgetSpec = spec.getWidgetSettings(widgetType)
  const canonicalDefs = (widgetSpec?.canonical ?? {}) as Record<string, any>
  const result: Record<string, any> = { ...rawSettings }

  for (const [key, def] of Object.entries(canonicalDefs)) {
    if (key === 'shownum' || (widgetType === 'PageList' && key === 'homeTitle')) {
      continue
    }

    const userVal = rawSettings[key]
    let effectiveVal = userVal !== undefined ? userVal : def?.default

    if (def?.value_transform === 'lowercase' && typeof effectiveVal === 'string') {
      effectiveVal = effectiveVal.toLowerCase()
    }

    if (effectiveVal !== undefined) {
      result[key] = effectiveVal
      if (typeof def?.bound_runtime_data === 'string') {
        setDeepDataProperty(result, def.bound_runtime_data, effectiveVal)
      }
    }
  }

  // Canonical composite projections
  if (widgetType === 'PopularPosts') {
    const rawPostDisplay = rawSettings.postDisplay || {}
    result.postDisplay = {
      showTitle: rawSettings.showTitle ?? rawPostDisplay.showTitle ?? true,
      showAuthor: rawSettings.showAuthor ?? rawPostDisplay.showAuthor ?? true,
      showSnippet: rawSettings.showSnippets !== undefined
        ? Boolean(rawSettings.showSnippets)
        : (rawPostDisplay.showSnippet ?? result.postDisplay?.showSnippet ?? true),
      showFeaturedImage: rawSettings.showThumbnails !== undefined
        ? Boolean(rawSettings.showThumbnails)
        : (rawPostDisplay.showFeaturedImage ?? result.postDisplay?.showFeaturedImage ?? true),
    }
  }
  else if (widgetType === 'FeaturedPost') {
    const rawPostDisplay = rawSettings.postDisplay || {}
    result.postDisplay = {
      showTitle: rawSettings.showPostTitle !== undefined
        ? Boolean(rawSettings.showPostTitle)
        : (rawPostDisplay.showTitle ?? result.postDisplay?.showTitle ?? true),
      showSnippet: rawSettings.showSnippet !== undefined
        ? Boolean(rawSettings.showSnippet)
        : (rawPostDisplay.showSnippet ?? result.postDisplay?.showSnippet ?? true),
      showFeaturedImage: rawSettings.showFirstImage !== undefined
        ? Boolean(rawSettings.showFirstImage)
        : (rawPostDisplay.showFeaturedImage ?? result.postDisplay?.showFeaturedImage ?? true),
      ...result.postDisplay,
    }
  }

  return result
}
