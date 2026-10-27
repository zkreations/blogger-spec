import type { SpecCatalog } from './catalogs/index.js'
import type {
  BloggerLayoutVersion,
  BloggerLayoutVersionsCatalog,
  BloggerTemplateVersionResult,
} from './types.js'
import { getSpecCatalog } from './catalogs/index.js'

export type {
  BloggerLayoutVersion,
  BloggerLayoutVersionsCatalog,
  BloggerTemplateVersionResult,
}

export function getLayoutVersionsSpec(catalog: SpecCatalog = getSpecCatalog()): BloggerLayoutVersionsCatalog | undefined {
  return catalog.getLayoutVersions()
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function testStructuralMarker(marker: string, xml: string): boolean {
  const trimmed = marker.trim()
  if (trimmed.includes(' ')) {
    const [tagPart, ...attrParts] = trimmed.split(/\s+/)
    const attrPart = attrParts.join(' ')
    const cleanAttr = attrPart.replace(/=$/, '')
    return new RegExp(`<${escapeRegex(tagPart)}\\s[^>]*\\b${escapeRegex(cleanAttr)}\\s*=`, 'i').test(xml)
  }
  if (trimmed.startsWith('b:')) {
    return new RegExp(`<${escapeRegex(trimmed)}\\b`, 'i').test(xml)
  }
  if (trimmed.endsWith('=')) {
    const attrName = trimmed.slice(0, -1).trim()
    return new RegExp(`\\b${escapeRegex(attrName)}\\s*=`, 'i').test(xml)
  }
  return new RegExp(`(?:<b:section\\s[^>]*\\b${escapeRegex(trimmed)}\\s*=|\\b${escapeRegex(trimmed)}\\s*=)`, 'i').test(xml)
}

function collectMarkersForVersion(
  markers: readonly string[] | undefined,
  sanitizedXml: string,
): string[] {
  if (!markers || markers.length === 0) {
    return []
  }
  const detected: string[] = []
  for (const marker of markers) {
    if (testStructuralMarker(marker, sanitizedXml)) {
      detected.push(marker)
    }
  }
  return detected
}

/**
 * Detects the Blogger template layout version (v1, v2, v3) from raw XML.
 *
 * Evaluation order:
 * 1. Explicit declaration attributes from catalog: `b:layoutsVersion`, `b:version`, `layoutsVersion`.
 * 2. Inferred Layouts v3 via modern structural directives (b:defaultmarkups, b:template-script, b:with, etc.).
 * 3. Inferred Layouts v2 via transitional structural markers (b:template-skin, mobile=).
 * 4. Inferred Layouts v1 via deprecated constraints (growth, maxwidgets).
 * 5. Fallback to default platform standard defined in catalog (Layouts v3).
 */
export function detectTemplateVersion(
  xmlText: string,
  catalog: SpecCatalog = getSpecCatalog(),
): BloggerTemplateVersionResult {
  const spec = getLayoutVersionsSpec(catalog)
  if (!spec) {
    throw new Error('Missing layout_versions in directives catalog domain_metadata')
  }
  const defaultVersion = spec.default_version

  if (!xmlText || typeof xmlText !== 'string') {
    return {
      version: defaultVersion,
      confidence: 'inferred',
      detectedFeatures: [],
      summary: `Default modern standard (Layouts v${defaultVersion})`,
    }
  }

  // Strip XML comments and XML prolog to avoid false positives (e.g. <?xml version="1.0"?>)
  const sanitized = xmlText
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\?xml[\s\S]*?\?>/i, '')

  // 1. Check for explicit version declaration attribute derived from catalog
  const explicitAttrs = spec.explicit_attributes
  const explicitPattern = new RegExp(`\\b(?:${explicitAttrs.map(escapeRegex).join('|')})\\s*=\\s*(['"])(.*?)\\1`, 'i')
  const explicitMatch = sanitized.match(explicitPattern)

  let explicitVersion: BloggerLayoutVersion | null = null
  let explicitFeature: string | null = null

  if (explicitMatch) {
    const rawVal = explicitMatch[2].trim()
    const major = Number.parseInt(rawVal.split('.')[0], 10)
    const supported = spec.supported_versions
    if ((supported as readonly number[]).includes(major)) {
      explicitVersion = major as BloggerLayoutVersion
      explicitFeature = explicitMatch[0]
    }
  }

  // Detect structural markers dynamically from catalog definitions
  const versionKeys: number[] = Object.keys(spec.versions)
    .map(v => Number.parseInt(v, 10))
    .sort((a, b) => b - a)

  const versionMarkers = new Map<number, string[]>()
  for (const v of versionKeys) {
    const markers = spec?.versions[String(v) as '1' | '2' | '3']?.structural_markers
    versionMarkers.set(v, collectMarkersForVersion(markers, sanitized))
  }

  // Resolution
  if (explicitVersion !== null && explicitFeature !== null) {
    const detectedFeatures = [explicitFeature]
    for (const v of versionKeys) {
      detectedFeatures.push(...(versionMarkers.get(v) ?? []))
    }
    return {
      version: explicitVersion,
      confidence: 'explicit',
      detectedFeatures,
      summary: `Explicitly declared Layouts v${explicitVersion} via ${explicitFeature}`,
    }
  }

  for (const v of versionKeys) {
    const markers = versionMarkers.get(v) ?? []
    if (markers.length > 0) {
      const descriptor = v >= 3
        ? 'modern structural markers'
        : v === 2
          ? 'transitional structural markers'
          : 'legacy structural markers'
      return {
        version: v as BloggerLayoutVersion,
        confidence: 'inferred',
        detectedFeatures: markers,
        summary: `Inferred Layouts v${v} from ${descriptor}: ${markers.join(', ')}`,
      }
    }
  }

  return {
    version: defaultVersion,
    confidence: 'inferred',
    detectedFeatures: [],
    summary: `Default modern standard (Layouts v${defaultVersion})`,
  }
}
