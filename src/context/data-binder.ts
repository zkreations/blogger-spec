import type { SpecCatalog } from '../catalogs/index.js'
import {
  getDeepProperty,
  parseBloggerDataPath,
  setDeepProperty,
} from '../core/common.js'

/**
 * Normalizes a Blogger data path into individual dot-separated property segments.
 * Delegates to canonical core utility `parseBloggerDataPath`.
 */
export const parseDataPathSegments = parseBloggerDataPath

/**
 * Traverses a nested target object or array and sets a deep property value.
 * Delegates to canonical core utility `setDeepProperty`.
 */
export const setDeepDataProperty = setDeepProperty

/**
 * Safely reads a value from a nested data structure using a Blogger data path.
 * Delegates to canonical core utility `getDeepProperty`.
 */
export const getDeepDataProperty = getDeepProperty

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

    const boundPath = def?.bound_runtime_data
    const boundKey = typeof boundPath === 'string' ? parseDataPathSegments(boundPath)[0] : undefined

    const userVal = rawSettings[key] !== undefined
      ? rawSettings[key]
      : (boundKey && rawSettings[boundKey] !== undefined ? rawSettings[boundKey] : undefined)

    let effectiveVal = userVal !== undefined ? userVal : def?.default

    if (def?.value_transform === 'lowercase' && typeof effectiveVal === 'string') {
      effectiveVal = effectiveVal.toLowerCase()
    }

    if (effectiveVal !== undefined) {
      result[key] = effectiveVal
      if (typeof def?.bound_runtime_data === 'string' && !(widgetType === 'FeaturedPost' && key === 'postId')) {
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
      showAuthor: rawSettings.showAuthor !== undefined
        ? Boolean(rawSettings.showAuthor)
        : (rawPostDisplay.showAuthor ?? result.postDisplay?.showAuthor ?? true),
      showDate: rawSettings.showDate !== undefined
        ? Boolean(rawSettings.showDate)
        : (rawPostDisplay.showDate ?? result.postDisplay?.showDate ?? true),
      ...result.postDisplay,
    }
  }

  return result
}
