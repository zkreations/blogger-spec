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

/**
 * Detects the Blogger template layout version (v1, v2, v3) from raw XML.
 *
 * Evaluation order:
 * 1. Explicit declaration attributes: `b:layoutsVersion` or `b:version` on <html> or root elements.
 * 2. Inferred Layouts v3 via modern structural directives: `<b:defaultmarkups>`, `<b:template-script>`, `<b:with>`, `<b:section tag=...>`.
 * 3. Inferred Layouts v1 via deprecated constraints: `<b:section growth=...>`, `<b:section maxwidgets=...>`.
 * 4. Fallback to Layouts v3 as the canonical modern platform standard.
 */
export function detectTemplateVersion(xmlText: string): TemplateVersionResult {
  if (!xmlText || typeof xmlText !== 'string') {
    return {
      version: 3,
      confidence: 'inferred',
      detectedFeatures: [],
      summary: 'Default modern standard (Layouts v3)',
    }
  }

  // Strip XML comments and XML prolog to avoid false positives (e.g. <?xml version="1.0"?>)
  const sanitized = xmlText
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\?xml[\s\S]*?\?>/i, '')

  // 1. Check for explicit version declaration attribute
  const explicitMatch = sanitized.match(/\b(?:b:layoutsVersion|b:version|layoutsVersion)\s*=\s*(['"])(.*?)\1/i)
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

  // Detect structural markers
  const structuralFeatures: string[] = []

  // Layouts v3 structural markers
  if (/<b:defaultmarkups\b/i.test(sanitized)) {
    structuralFeatures.push('b:defaultmarkups')
  }
  else if (/<b:defaultmarkup\b/i.test(sanitized)) {
    structuralFeatures.push('b:defaultmarkup')
  }

  if (/<b:template-script\b/i.test(sanitized)) {
    structuralFeatures.push('b:template-script')
  }

  if (/<b:with\b/i.test(sanitized)) {
    structuralFeatures.push('b:with')
  }

  if (/<b:section\s[^>]*\btag\s*=/i.test(sanitized)) {
    structuralFeatures.push('b:section tag=')
  }

  // Layouts v1 structural markers
  const v1Markers: string[] = []
  if (/<b:section\s[^>]*\bgrowth\s*=/i.test(sanitized)) {
    v1Markers.push('growth')
  }
  if (/<b:section\s[^>]*\bmaxwidgets\s*=/i.test(sanitized)) {
    v1Markers.push('maxwidgets')
  }

  // Resolution
  if (explicitVersion !== null && explicitFeature !== null) {
    const detectedFeatures = [explicitFeature, ...structuralFeatures, ...v1Markers]
    return {
      version: explicitVersion,
      confidence: 'explicit',
      detectedFeatures,
      summary: `Explicitly declared Layouts v${explicitVersion} via ${explicitFeature}`,
    }
  }

  if (structuralFeatures.length > 0) {
    return {
      version: 3,
      confidence: 'inferred',
      detectedFeatures: structuralFeatures,
      summary: `Inferred Layouts v3 from modern structural markers: ${structuralFeatures.join(', ')}`,
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
    version: 3,
    confidence: 'inferred',
    detectedFeatures: [],
    summary: 'Default modern standard (Layouts v3)',
  }
}
