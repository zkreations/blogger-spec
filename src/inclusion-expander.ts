/**
 * Blogger Server Inclusion Expander
 * Macro expansion and inlining engine for platform backend inclusions.
 */

import type { SpecCatalog } from './catalogs/spec-catalog.js'
import type {
  BloggerInclusionParameter,
  BloggerInclusionSafety,
  BloggerStructureDiagnostic,
} from './types.js'
import { getSpecCatalog } from './catalogs/spec-catalog.js'

export interface BloggerInclusionExpansionOptions {
  readonly data?: Record<string, any>
  readonly catalog?: SpecCatalog
  readonly unwrap?: boolean
  readonly recursive?: boolean
  readonly maxDepth?: number
  readonly useLocalStub?: boolean
}

export interface BloggerInclusionExpansionResult {
  readonly name: string
  readonly markup: string
  readonly safety: BloggerInclusionSafety
  readonly isServerInclusion: boolean
  readonly isPortable: boolean
  readonly diagnostics: readonly BloggerStructureDiagnostic[]
}

const INCLUDABLE_OPEN_REGEX = /^<b:includable\b[^>]*>/i
const INCLUDABLE_CLOSE_REGEX = /<\/b:includable>\s*$/i
const INCLUDE_TAG_REGEX = /<b:include\s([^>]*?)(?:\/>|>[\s\S]*?<\/b:include>)/gi
const ATTR_REGEX = /([\w:-]+)\s*=\s*(?:'([^']*)'|"([^"]*)")/g

/**
 * Extracts inner body from a <b:includable id='...'> ... </b:includable> block.
 */
export function extractIncludableBody(markup: string): string {
  const trimmed = markup.trim()
  const withoutOpen = trimmed.replace(INCLUDABLE_OPEN_REGEX, '').trim()
  return withoutOpen.replace(INCLUDABLE_CLOSE_REGEX, '').trim()
}

function parseAttributes(attrString: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const match of attrString.matchAll(ATTR_REGEX)) {
    const key = match[1]!
    const val = match[2] ?? match[3] ?? ''
    result[key] = val
  }
  return result
}

/**
 * Expands a Blogger platform server inclusion into inlinable template markup.
 */
export function expandServerInclusion(
  name: string,
  options?: BloggerInclusionExpansionOptions,
): BloggerInclusionExpansionResult {
  const catalog = options?.catalog ?? getSpecCatalog()
  const unwrap = options?.unwrap ?? true
  const recursive = options?.recursive ?? false
  const maxDepth = options?.maxDepth ?? 5
  const diagnostics: BloggerStructureDiagnostic[] = []

  const isSuper = name.startsWith('super.')
  const baseName = isSuper ? name.slice('super.'.length) : name
  const incDef = catalog.getInclusion(baseName)

  if (isSuper) {
    const diagCode = 'BX1058'
    const diagRule = catalog.getDiagnostic(diagCode)
    if (diagRule) {
      diagnostics.push({
        code: diagCode,
        rule: diagRule,
        message: diagRule.message,
        severity: diagRule.severity,
        tagName: 'b:include',
        attribute: 'name',
      })
    }
  }

  if (!incDef && !isSuper) {
    const diagCode = 'BX1037'
    const diagRule = catalog.getDiagnostic(diagCode)
    if (diagRule) {
      diagnostics.push({
        code: diagCode,
        rule: diagRule,
        message: `Unresolved inclusion: referenced server inclusion '${name}' does not exist in catalog.`,
        severity: diagRule.severity,
        tagName: 'b:include',
        attribute: 'name',
      })
    }
    return {
      name,
      markup: '',
      safety: 'deprecated',
      isServerInclusion: false,
      isPortable: false,
      diagnostics,
    }
  }

  const safety: BloggerInclusionSafety = incDef?.safety ?? (isSuper ? 'internal' : 'portable')
  const isPortable = safety === 'portable'

  if (safety === 'theme_bound') {
    const diagCode = 'BX1059'
    const diagRule = catalog.getDiagnostic(diagCode)
    if (diagRule) {
      const depMsg = incDef?.theme_dependency ? ` (${incDef.theme_dependency.failure_reason})` : ''
      diagnostics.push({
        code: diagCode,
        rule: diagRule,
        message: `${diagRule.message}${depMsg}`.trim(),
        severity: diagRule.severity,
        tagName: 'b:include',
        attribute: 'name',
      })
    }
  }

  if (incDef?.deprecated || safety === 'deprecated') {
    const diagCode = 'BX1024'
    const diagRule = catalog.getDiagnostic(diagCode)
    if (diagRule) {
      diagnostics.push({
        code: diagCode,
        rule: diagRule,
        message: `Server inclusion '${baseName}' is deprecated. ${incDef?.deprecated?.reason ?? ''}`.trim(),
        severity: diagRule.severity,
        tagName: 'b:include',
        attribute: 'name',
      })
    }
  }

  const rawMarkup = (options?.useLocalStub && (incDef as any)?.local_stub_markup)
    ? (incDef as any).local_stub_markup
    : (incDef?.server_markup ?? '')
  let expandedMarkup = unwrap && rawMarkup ? extractIncludableBody(rawMarkup) : rawMarkup

  // Handle recursive inclusion inlining (e.g. openGraphMetaData inside all-head-content)
  if (recursive && expandedMarkup && maxDepth > 0) {
    expandedMarkup = expandedMarkup.replace(INCLUDE_TAG_REGEX, (fullMatch: string, attrString: string) => {
      const attrs = parseAttributes(attrString)
      const childName = attrs.name?.trim()
      if (childName && catalog.getInclusion(childName)) {
        const childResult = expandServerInclusion(childName, {
          ...options,
          maxDepth: maxDepth - 1,
          unwrap: true,
        })
        diagnostics.push(...childResult.diagnostics)
        return childResult.markup || fullMatch
      }
      return fullMatch
    })
  }

  return {
    name,
    markup: expandedMarkup,
    safety,
    isServerInclusion: true,
    isPortable,
    diagnostics,
  }
}

/**
 * Returns formal parameter specification contracts for an inclusion if defined.
 */
export function getInclusionParameterContracts(
  name: string,
  catalog: SpecCatalog = getSpecCatalog(),
): Record<string, BloggerInclusionParameter> | undefined {
  const inc = catalog.getInclusion(name)
  return inc?.parameters
}

/**
 * Returns normalized lightweight template markup for offline local compilation if defined.
 */
export function getLocalStubInclusion(
  name: string,
  catalog: SpecCatalog = getSpecCatalog(),
  options?: { unwrap?: boolean },
): string | undefined {
  const inc = catalog.getInclusion(name)
  const stubMarkup = (inc as any)?.local_stub_markup
  if (!stubMarkup)
    return undefined

  const unwrap = options?.unwrap ?? true
  return unwrap ? extractIncludableBody(stubMarkup) : stubMarkup
}
