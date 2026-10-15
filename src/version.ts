import type {
  BloggerLayoutVersion,
  BloggerLayoutVersionsCatalog,
  TemplateVersionResult,
} from './types.js'
import { getDirectives } from './catalogs/index.js'

export type {
  BloggerLayoutVersion,
  BloggerLayoutVersionsCatalog,
  TemplateVersionResult,
}

export function getLayoutVersionsSpec(): BloggerLayoutVersionsCatalog | undefined {
  return getDirectives().domain_metadata?.layout_versions
}

function testStructuralMarker(marker: string, xml: string): boolean {
  if (marker === 'b:section tag=') {
    return /<b:section\s[^>]*\btag\s*=/i.test(xml)
  }
  if (marker.startsWith('b:')) {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`<${escaped}\\b`, 'i').test(xml)
  }
  if (marker.endsWith('=')) {
    const attrName = marker.slice(0, -1).trim()
    const escaped = attrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${escaped}\\s*=`, 'i').test(xml)
  }
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:<b:section\\s[^>]*\\b${escaped}\\s*=|\\b${escaped}\\s*=)`, 'i').test(xml)
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
export function detectTemplateVersion(xmlText: string): TemplateVersionResult {
  const spec = getLayoutVersionsSpec()
  const defaultVersion = (spec?.default_version ?? 3) as BloggerLayoutVersion

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
  const explicitAttrs = spec?.explicit_attributes ?? ['b:layoutsVersion', 'b:version']
  const explicitPattern = new RegExp(`\\b(?:${explicitAttrs.join('|')}|layoutsVersion)\\s*=\\s*(['"])(.*?)\\1`, 'i')
  const explicitMatch = sanitized.match(explicitPattern)

  let explicitVersion: BloggerLayoutVersion | null = null
  let explicitFeature: string | null = null

  if (explicitMatch) {
    const rawVal = explicitMatch[2].trim()
    const major = Number.parseInt(rawVal.split('.')[0], 10)
    if (major === 1 || major === 2 || major === 3) {
      explicitVersion = major as BloggerLayoutVersion
      explicitFeature = explicitMatch[0]
    }
  }

  // Detect structural markers dynamically from catalog definitions
  const v3Markers = collectMarkersForVersion(spec?.versions['3']?.structural_markers, sanitized)
  const v2Markers = collectMarkersForVersion(spec?.versions['2']?.structural_markers, sanitized)
  const v1Markers = collectMarkersForVersion(spec?.versions['1']?.structural_markers, sanitized)

  // Resolution
  if (explicitVersion !== null && explicitFeature !== null) {
    const detectedFeatures = [explicitFeature, ...v3Markers, ...v2Markers, ...v1Markers]
    return {
      version: explicitVersion,
      confidence: 'explicit',
      detectedFeatures,
      summary: `Explicitly declared Layouts v${explicitVersion} via ${explicitFeature}`,
    }
  }

  if (v3Markers.length > 0) {
    return {
      version: 3,
      confidence: 'inferred',
      detectedFeatures: v3Markers,
      summary: `Inferred Layouts v3 from modern structural markers: ${v3Markers.join(', ')}`,
    }
  }

  if (v2Markers.length > 0) {
    return {
      version: 2,
      confidence: 'inferred',
      detectedFeatures: v2Markers,
      summary: `Inferred Layouts v2 from transitional structural markers: ${v2Markers.join(', ')}`,
    }
  }

  if (v1Markers.length > 0) {
    return {
      version: 1,
      confidence: 'inferred',
      detectedFeatures: v1Markers,
      summary: `Inferred Layouts v1 from legacy structural markers: ${v1Markers.join(', ')}`,
    }
  }

  return {
    version: defaultVersion,
    confidence: 'inferred',
    detectedFeatures: [],
    summary: `Default modern standard (Layouts v${defaultVersion})`,
  }
}
