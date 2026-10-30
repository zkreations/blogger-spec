import type { BloggerSkinVariableSymbol } from './data-path.js'
import { toSkinVarIdentifier } from './data-path.js'

export interface BloggerParsedFont {
  readonly style?: string
  readonly weight?: string
  readonly size?: string
  readonly family?: string
  readonly raw: string
}

export interface CompileSkinOptions {
  /**
   * Additional or overriding skin variable values.
   * Can be supplied using the original variable name (e.g. `body.background`)
   * or the normalized identifier (`body_background`).
   */
  readonly overrides?: Record<string, string>
  /**
   * Pre-extracted skin variable symbols dictionary.
   */
  readonly skinVariables?: Record<string, string | BloggerSkinVariableSymbol>
  /**
   * Output style tag wrapping mode:
   * - `'page-skin'`: `<style id='page-skin-1' type='text/css'><!-- ... --></style>`
   * - `'template-skin'`: `<style id='template-skin-1' type='text/css'><!-- ... --></style>`
   * - `'none'` | `false`: Returns raw compiled CSS without HTML `<style>` wrapper.
   * Defaults to `'page-skin'` (or `'template-skin'` if input is `<b:template-skin>`).
   */
  readonly wrap?: 'page-skin' | 'template-skin' | 'none' | boolean
  /**
   * Whether to strip Theme Designer `<Variable>` and `<Group>` metadata tags from output CSS.
   * Defaults to true.
   */
  readonly stripMetadataTags?: boolean
}

export interface BloggerCompiledSkinResult {
  /**
   * The processed CSS or wrapped `<style>` tag string.
   */
  readonly css: string
  /**
   * Dictionary of all resolved variable values mapped by both canonical name and normalized identifier.
   */
  readonly variables: Record<string, string>
  /**
   * Dictionary of extracted Theme Designer variable definitions.
   */
  readonly symbols: Record<string, BloggerSkinVariableSymbol>
}

const FONT_STYLES = new Set(['normal', 'italic', 'oblique'])
const FONT_WEIGHTS = new Set([
  'normal',
  'bold',
  'bolder',
  'lighter',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
])
const FONT_SIZE_REGEX = /^[\d.]+(?:px|em|rem|%|pt|vh|vw|ex|ch)$/i

export function parseThemeDesignerFont(fontValue: string): BloggerParsedFont {
  const trimmed = fontValue.trim()
  if (!trimmed) {
    return { raw: fontValue }
  }

  const tokens = trimmed.split(/\s+/)
  let style: string | undefined
  let weight: string | undefined
  let size: string | undefined
  let idx = 0

  if (idx < tokens.length && FONT_STYLES.has(tokens[idx]!.toLowerCase())) {
    style = tokens[idx]
    idx++
  }
  if (idx < tokens.length && FONT_WEIGHTS.has(tokens[idx]!.toLowerCase())) {
    weight = tokens[idx]
    idx++
  }
  if (idx < tokens.length && FONT_SIZE_REGEX.test(tokens[idx]!)) {
    size = tokens[idx]
    idx++
  }

  const family = idx < tokens.length ? tokens.slice(idx).join(' ') : undefined

  return {
    style,
    weight,
    size,
    family,
    raw: fontValue,
  }
}

function parseXmlTagAttributes(rawAttrs: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const attrRegex = /([a-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi
  for (const match of rawAttrs.matchAll(attrRegex)) {
    const attrName = match[1]!
    const attrVal = match[2] ?? match[3] ?? ''
    attrs[attrName] = attrVal
  }
  return attrs
}

function unwrapCData(text: string): string {
  const cdataStart = text.indexOf('<![CDATA[')
  if (cdataStart !== -1) {
    const cdataEnd = text.indexOf(']]>', cdataStart)
    if (cdataEnd !== -1) {
      return text.slice(cdataStart + 9, cdataEnd)
    }
    return text.slice(cdataStart + 9)
  }
  return text
}

function extractSkinContent(input: string): { content: string, isTemplateSkin: boolean } {
  const templateSkinMatch = /<b:template-skin\b[^>]*>([\s\S]*?)<\/b:template-skin>/i.exec(input)
  if (templateSkinMatch) {
    return { content: unwrapCData(templateSkinMatch[1]!), isTemplateSkin: true }
  }
  const pageSkinMatch = /<b:skin\b[^>]*>([\s\S]*?)<\/b:skin>/i.exec(input)
  if (pageSkinMatch) {
    return { content: unwrapCData(pageSkinMatch[1]!), isTemplateSkin: false }
  }
  return { content: unwrapCData(input), isTemplateSkin: false }
}

export function compileSkinCss(
  skinXmlOrCdata: string,
  options?: CompileSkinOptions,
): BloggerCompiledSkinResult {
  const { content, isTemplateSkin } = extractSkinContent(skinXmlOrCdata)
  const symbols: Record<string, BloggerSkinVariableSymbol> = {}

  if (options?.skinVariables) {
    for (const [k, v] of Object.entries(options.skinVariables)) {
      if (typeof v === 'string') {
        symbols[k] = { name: k, type: 'string', value: v }
      }
      else {
        symbols[k] = v
      }
    }
  }

  const varRegex = /<Variable\b([^>]*?)(?:\/>|>[\s\S]*?<\/Variable>)/gi
  for (const match of content.matchAll(varRegex)) {
    const rawAttrs = match[1] ?? ''
    const attrs = parseXmlTagAttributes(rawAttrs)
    const name = attrs.name?.trim()
    if (name) {
      const type = attrs.type?.trim() || 'string'
      const description = attrs.description?.trim()
      const defaultVal = attrs.default?.trim()
      const value = attrs.value?.trim()
      symbols[name] = {
        name,
        type,
        description,
        default: defaultVal,
        value,
      }
    }
  }

  const resolvedVariables: Record<string, string> = {}
  const parsedFonts: Record<string, BloggerParsedFont> = {}

  for (const [name, sym] of Object.entries(symbols)) {
    let effectiveVal = sym.value && sym.value.length > 0 ? sym.value : (sym.default ?? '')
    const normalizedName = toSkinVarIdentifier(name)

    if (options?.overrides) {
      if (options.overrides[name] !== undefined) {
        effectiveVal = options.overrides[name]!
      }
      else if (options.overrides[normalizedName] !== undefined) {
        effectiveVal = options.overrides[normalizedName]!
      }
    }

    resolvedVariables[name] = effectiveVal
    resolvedVariables[normalizedName] = effectiveVal

    if (sym.type === 'font') {
      const parsed = parseThemeDesignerFont(effectiveVal)
      parsedFonts[name] = parsed
      parsedFonts[normalizedName] = parsed
    }
  }

  // Handle overrides for variables not formally defined in <Variable>
  if (options?.overrides) {
    for (const [k, v] of Object.entries(options.overrides)) {
      if (resolvedVariables[k] === undefined) {
        resolvedVariables[k] = v
        resolvedVariables[toSkinVarIdentifier(k)] = v
      }
    }
  }

  let processedCss = content
  if (options?.stripMetadataTags !== false) {
    // In Blogger, CSS comments enclosing Theme Designer <Variable> or <Group> declarations
    // are completely stripped from the final render along with all internal text.
    processedCss = processedCss.replace(/\/\*[\s\S]*?\*\//g, (comment) => {
      if (/<(?:Variable|Group)\b/i.test(comment)) {
        return ''
      }
      return comment
    })
    processedCss = processedCss
      .replace(/<Group\b[^>]*>/gi, '')
      .replace(/<\/Group>/gi, '')
      .replace(/<Variable\b[^>]*?(?:\/>|>[\s\S]*?<\/Variable>)/gi, '')
  }

  // Substitute $(...) variables including font sub-properties (.family, .size, .style, .weight)
  const parenRegex = /\$\(([a-z_][\w.-]*)\)/gi
  processedCss = processedCss.replace(parenRegex, (fullMatch, rawVar: string) => {
    if (resolvedVariables[rawVar] !== undefined) {
      return resolvedVariables[rawVar]!
    }

    if (rawVar.includes('.')) {
      const lastDot = rawVar.lastIndexOf('.')
      const prefix = rawVar.slice(0, lastDot)
      const subProp = rawVar.slice(lastDot + 1).toLowerCase()

      const fontDef = parsedFonts[prefix] ?? parsedFonts[toSkinVarIdentifier(prefix)]
      if (fontDef) {
        if (subProp === 'family' && fontDef.family !== undefined) {
          return fontDef.family
        }
        if (subProp === 'size' && fontDef.size !== undefined) {
          return fontDef.size
        }
        if (subProp === 'style' && fontDef.style !== undefined) {
          return fontDef.style
        }
        if (subProp === 'weight' && fontDef.weight !== undefined) {
          return fontDef.weight
        }
      }
    }

    const normalized = toSkinVarIdentifier(rawVar)
    if (resolvedVariables[normalized] !== undefined) {
      return resolvedVariables[normalized]!
    }

    return fullMatch
  })

  // Substitute standalone $varName without dots
  const standaloneRegex = /(?<![\w$])\$([a-z_]\w*)\b(?!\.)/gi
  processedCss = processedCss.replace(standaloneRegex, (fullMatch, rawVar: string) => {
    if (resolvedVariables[rawVar] !== undefined) {
      return resolvedVariables[rawVar]!
    }
    const normalized = toSkinVarIdentifier(rawVar)
    if (resolvedVariables[normalized] !== undefined) {
      return resolvedVariables[normalized]!
    }
    return fullMatch
  })

  let wrapMode = options?.wrap
  if (wrapMode === undefined) {
    wrapMode = isTemplateSkin ? 'template-skin' : 'page-skin'
  }

  let finalCss = processedCss.trim()
  if (wrapMode === 'page-skin' || wrapMode === true) {
    finalCss = `<style id='page-skin-1' type='text/css'><!--\n${finalCss}\n--></style>`
  }
  else if (wrapMode === 'template-skin') {
    finalCss = `<style id='template-skin-1' type='text/css'><!--\n${finalCss}\n--></style>`
  }

  return {
    css: finalCss,
    variables: resolvedVariables,
    symbols,
  }
}
