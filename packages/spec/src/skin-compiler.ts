import type { SpecCatalog } from './catalogs/index.js'
import type { BloggerSkinVariableSymbol } from './data-path.js'
import { getSpecCatalog } from './catalogs/index.js'
import { toSkinVarIdentifier } from './data-path.js'

export const SKIN_VALUE_SYMBOL = Symbol.for('blogger-spec.skin-value')

export function isSkinValue(value: unknown): boolean {
  return typeof value === 'object' && value !== null && Boolean((value as any)[SKIN_VALUE_SYMBOL])
}

export interface BloggerSkinScalarValue {
  readonly [SKIN_VALUE_SYMBOL]: true
  toString: () => string
  valueOf: () => string
}

export interface BloggerSkinColorValue extends BloggerSkinScalarValue {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly transparent: string
  readonly inverse: string
}

export interface BloggerSkinBackgroundValue extends BloggerSkinScalarValue {
  readonly color: BloggerSkinColorValue
  readonly image?: string
}

export interface BloggerSkinFontValue extends BloggerSkinScalarValue {
  readonly size: string
  readonly family: string
}

export interface BloggerParsedFont {
  readonly style?: string
  readonly weight?: string
  readonly size?: string
  readonly family?: string
  readonly raw: string
}

export interface BloggerParsedColor {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly transparent: string
  readonly inverse: string
  readonly raw: string
}

export interface BloggerParsedBackground {
  readonly color: BloggerParsedColor
  readonly image: string
  readonly raw: string
}

export interface BloggerParsedSkinVariable {
  readonly name: string
  readonly type: string
  readonly default: string
  readonly value?: string
  readonly description?: string
  readonly group?: string
}

export type BloggerSkinCssChunk
  = | { readonly kind: 'text', readonly value: string }
    | { readonly kind: 'variable', readonly variable: string }

export interface BloggerParsedSkinSource {
  readonly isTemplateSkin: boolean
  readonly variables: readonly BloggerParsedSkinVariable[]
  readonly symbols: Record<string, BloggerSkinVariableSymbol>
  readonly chunks: readonly BloggerSkinCssChunk[]
}

export interface CompileSkinOptions {
  readonly overrides?: Record<string, string>
  readonly skinVariables?: Record<string, string | BloggerSkinVariableSymbol>
  readonly wrap?: 'page-skin' | 'template-skin' | 'none' | boolean
  readonly stripMetadataTags?: boolean
  readonly catalog?: SpecCatalog
}

export interface BloggerCompiledSkinResult {
  readonly css: string
  readonly variables: Record<string, string>
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
const FONT_SIZE_TOKEN_REGEX = /^([\d.]+(?:px|em|rem|%|pt|vh|vw|ex|ch))(?:\s*\/\s*[\w.%-]+)?$/i

const NAMED_COLORS: Readonly<Record<string, readonly [number, number, number, number]>> = {
  transparent: [0, 0, 0, 0],
  black: [0, 0, 0, 1],
  white: [255, 255, 255, 1],
  red: [255, 0, 0, 1],
  green: [0, 128, 0, 1],
  blue: [0, 0, 255, 1],
  gray: [128, 128, 128, 1],
  grey: [128, 128, 128, 1],
  silver: [192, 192, 192, 1],
  maroon: [128, 0, 0, 1],
  olive: [128, 128, 0, 1],
  lime: [0, 255, 0, 1],
  aqua: [0, 255, 255, 1],
  cyan: [0, 255, 255, 1],
  teal: [0, 128, 128, 1],
  navy: [0, 0, 128, 1],
  fuchsia: [255, 0, 255, 1],
  magenta: [255, 0, 255, 1],
  purple: [128, 0, 128, 1],
  yellow: [255, 255, 0, 1],
  orange: [255, 165, 0, 1],
}

const GENERIC_FONT_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'inherit',
  'initial',
  'unset',
  'arial',
  'helvetica',
  'helvetica neue',
  'times',
  'times new roman',
  'courier',
  'courier new',
  'verdana',
  'georgia',
  'palatino',
  'garamond',
  'bookman',
  'tahoma',
  'trebuchet ms',
  'impact',
  'apple-system',
  '-apple-system',
  'blinkmacsystemfont',
  'segoe ui',
])

function attachSkinScalar(obj: Record<string, any>, raw: string): any {
  Object.defineProperties(obj, {
    [SKIN_VALUE_SYMBOL]: { value: true, enumerable: false },
    toString: { value: () => raw, enumerable: false },
    valueOf: { value: () => raw, enumerable: false },
    [Symbol.toPrimitive]: { value: () => raw, enumerable: false },
  })
  return obj
}

export function createSkinScalarValue(raw: string): BloggerSkinScalarValue {
  return attachSkinScalar({}, raw)
}

function clampByte(n: number): number {
  if (Number.isNaN(n))
    return 0
  return Math.max(0, Math.min(255, Math.round(n)))
}

function clampAlpha(n: number): number {
  if (Number.isNaN(n))
    return 1
  return Number(Math.max(0, Math.min(1, n)).toFixed(4))
}

export function parseThemeDesignerColor(colorValue: string): BloggerParsedColor {
  const trimmed = colorValue.trim()
  let r = 0
  let g = 0
  let b = 0
  let a = 1

  const lower = trimmed.toLowerCase()
  if (NAMED_COLORS[lower]) {
    ;[r, g, b, a] = NAMED_COLORS[lower]!
  }
  else if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1)
    if (hex.length === 3 || hex.length === 4) {
      r = clampByte(Number.parseInt(hex[0]! + hex[0]!, 16))
      g = clampByte(Number.parseInt(hex[1]! + hex[1]!, 16))
      b = clampByte(Number.parseInt(hex[2]! + hex[2]!, 16))
      if (hex.length === 4) {
        a = clampAlpha(Number.parseInt(hex[3]! + hex[3]!, 16) / 255)
      }
    }
    else if (hex.length === 6 || hex.length === 8) {
      r = clampByte(Number.parseInt(hex.slice(0, 2), 16))
      g = clampByte(Number.parseInt(hex.slice(2, 4), 16))
      b = clampByte(Number.parseInt(hex.slice(4, 6), 16))
      if (hex.length === 8) {
        a = clampAlpha(Number.parseInt(hex.slice(6, 8), 16) / 255)
      }
    }
  }
  else {
    const rgbOuter = /^rgba?\(([^)]+)\)$/i.exec(trimmed)
    if (rgbOuter) {
      const parts = rgbOuter[1]!.trim().split(/[\s,/]+/).filter(Boolean)
      if (parts.length >= 3) {
        const parseChannel = (token: string) => token.endsWith('%')
          ? clampByte((Number.parseFloat(token) / 100) * 255)
          : clampByte(Number.parseFloat(token))
        r = parseChannel(parts[0]!)
        g = parseChannel(parts[1]!)
        b = parseChannel(parts[2]!)
        if (parts[3] !== undefined) {
          const rawA = parts[3]!
          a = rawA.endsWith('%')
            ? clampAlpha(Number.parseFloat(rawA) / 100)
            : clampAlpha(Number.parseFloat(rawA))
        }
      }
    }
  }

  return {
    red: r,
    green: g,
    blue: b,
    alpha: a,
    transparent: `rgba(${r}, ${g}, ${b}, 0)`,
    inverse: `rgba(${255 - r}, ${255 - g}, ${255 - b}, ${a})`,
    raw: colorValue,
  }
}

export function createSkinColorValue(raw: string): BloggerSkinColorValue {
  const parsed = parseThemeDesignerColor(raw)
  return attachSkinScalar(
    {
      red: parsed.red,
      green: parsed.green,
      blue: parsed.blue,
      alpha: parsed.alpha,
      transparent: parsed.transparent,
      inverse: parsed.inverse,
    },
    raw,
  )
}

export function parseThemeDesignerBackground(bgValue: string): BloggerParsedBackground {
  const trimmed = bgValue.trim()
  let image = ''
  const urlMatch = /url\(([^)]*)\)/i.exec(trimmed)
  if (urlMatch) {
    const candidate = urlMatch[1]!.trim().replace(/^["']|["']$/g, '').trim()
    if (candidate && candidate.toLowerCase() !== 'none') {
      image = candidate
    }
  }

  const withoutUrl = trimmed.replace(/url\([^)]*\)/gi, ' ')
  let colorStr = 'transparent'
  const rgbaMatch = /rgba?\([^)]+\)/i.exec(withoutUrl)
  if (rgbaMatch) {
    colorStr = rgbaMatch[0]
  }
  else {
    const hexMatch = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})\b/i.exec(withoutUrl)
    if (hexMatch) {
      colorStr = hexMatch[0]
    }
    else {
      for (const token of withoutUrl.split(/\s+/)) {
        const lower = token.toLowerCase()
        if (NAMED_COLORS[lower]) {
          colorStr = token
          break
        }
      }
    }
  }

  return {
    color: parseThemeDesignerColor(colorStr),
    image,
    raw: bgValue,
  }
}

export function createSkinBackgroundValue(
  raw: string,
  options?: { readonly includeImage?: boolean },
): BloggerSkinBackgroundValue {
  const parsed = parseThemeDesignerBackground(raw)
  const colorObj = createSkinColorValue(parsed.color.raw)
  const props: Record<string, any> = {
    color: colorObj,
  }
  if (options?.includeImage !== false) {
    props.image = parsed.image
  }
  return attachSkinScalar(props, raw)
}

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
  if (idx < tokens.length) {
    const sizeMatch = FONT_SIZE_TOKEN_REGEX.exec(tokens[idx]!)
    if (sizeMatch) {
      size = sizeMatch[1]!
      idx++
    }
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

export function createSkinFontValue(raw: string): BloggerSkinFontValue {
  const parsed = parseThemeDesignerFont(raw)
  return attachSkinScalar(
    {
      size: parsed.size ?? '',
      family: parsed.family ?? '',
    },
    raw,
  )
}

export function createSkinRuntimeValue(
  type: string,
  raw: string,
  options?: { readonly includeBackgroundImage?: boolean },
): BloggerSkinScalarValue {
  const normalizedType = type.trim().toLowerCase()
  if (normalizedType === 'color') {
    return createSkinColorValue(raw)
  }
  if (normalizedType === 'background') {
    return createSkinBackgroundValue(raw, { includeImage: options?.includeBackgroundImage ?? true })
  }
  if (normalizedType === 'font') {
    return createSkinFontValue(raw)
  }
  return createSkinScalarValue(raw)
}

export function extractGoogleFontsCssUrl(
  variables: ReadonlyArray<{ readonly type: string, readonly default?: string, readonly value?: string }>,
): string | null {
  const fontSpecs = new Map<string, Set<string>>()

  for (const v of variables) {
    if (v.type.trim().toLowerCase() !== 'font') {
      continue
    }
    const raw = (v.value && v.value.length > 0 ? v.value : v.default) ?? ''
    if (!raw || raw.includes('var(')) {
      continue
    }
    const parsed = parseThemeDesignerFont(raw)
    if (!parsed.family) {
      continue
    }
    const firstFamily = parsed.family
      .split(',')[0]!
      .trim()
      .replace(/^["']|["']$/g, '')
      .trim()
    if (!firstFamily || GENERIC_FONT_FAMILIES.has(firstFamily.toLowerCase())) {
      continue
    }
    const weight = parsed.weight && /^\d+$/.test(parsed.weight)
      ? parsed.weight
      : (parsed.weight?.toLowerCase() === 'bold' ? '700' : '400')
    const suffix = parsed.style?.toLowerCase() === 'italic' ? `${weight}i` : weight
    let weights = fontSpecs.get(firstFamily)
    if (!weights) {
      weights = new Set<string>()
      fontSpecs.set(firstFamily, weights)
    }
    weights.add(suffix)
  }

  if (fontSpecs.size === 0) {
    return null
  }

  const familiesParam = Array.from(fontSpecs.entries())
    .map(([fam, weights]) => {
      const encodedName = fam.replace(/\s+/g, '+')
      const sortedWeights = Array.from(weights).sort().join(',')
      return `${encodedName}:${sortedWeights}`
    })
    .join('|')

  return `https://fonts.googleapis.com/css?family=${familiesParam}&display=swap`
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

function tokenizeSkinCssChunks(css: string): BloggerSkinCssChunk[] {
  const chunks: BloggerSkinCssChunk[] = []
  const tokenRegex = /\$\(([a-z_][\w.-]*)\)|(?<![\w$])\$([a-z_]\w*)\b(?!\.)/gi
  let lastIndex = 0
  for (const match of css.matchAll(tokenRegex)) {
    const idx = match.index!
    if (idx > lastIndex) {
      chunks.push({ kind: 'text', value: css.slice(lastIndex, idx) })
    }
    const varRef = (match[1] ?? match[2])!
    chunks.push({ kind: 'variable', variable: varRef })
    lastIndex = idx + match[0].length
  }
  if (lastIndex < css.length) {
    chunks.push({ kind: 'text', value: css.slice(lastIndex) })
  }
  return chunks
}

interface RawVariableDeclaration {
  readonly name: string
  readonly type: string
  readonly description?: string
  readonly group?: string
  readonly default?: string
  readonly value?: string
  readonly attrs: Record<string, string>
}

export function parseSkinSource(
  skinXmlOrCdata: string,
  options?: { readonly stripMetadataTags?: boolean },
): BloggerParsedSkinSource {
  const { content, isTemplateSkin } = extractSkinContent(skinXmlOrCdata)
  const rawDeclarations: RawVariableDeclaration[] = []

  const tagScanRegex = /<Group\b([^>]*)>|<\/Group>|<Variable\b([^>]*?)(?:\/>|>[\s\S]*?<\/Variable>)/gi
  let currentGroup: string | undefined

  for (const match of content.matchAll(tagScanRegex)) {
    const full = match[0]
    if (/^<Group\b/i.test(full)) {
      const groupAttrs = parseXmlTagAttributes(match[1] ?? '')
      currentGroup = groupAttrs.description?.trim() || undefined
    }
    else if (/^<\/Group>/i.test(full)) {
      currentGroup = undefined
    }
    else {
      const attrs = parseXmlTagAttributes(match[2] ?? '')
      const name = attrs.name?.trim()
      if (name) {
        rawDeclarations.push({
          name,
          type: attrs.type?.trim() || 'string',
          description: attrs.description?.trim(),
          group: currentGroup,
          default: attrs.default?.trim(),
          value: attrs.value?.trim(),
          attrs,
        })
      }
    }
  }

  const baseValues = new Map<string, string>()
  for (const decl of rawDeclarations) {
    const eff = decl.value && decl.value.length > 0 ? decl.value : (decl.default ?? '')
    baseValues.set(decl.name, eff)
    baseValues.set(toSkinVarIdentifier(decl.name), eff)
  }

  const interpolateDeclarationValue = (rawVal: string | undefined, attrs: Record<string, string>): string | undefined => {
    if (rawVal === undefined) {
      return undefined
    }
    return rawVal.replace(/\$\(([a-z_][\w.-]*)\)/gi, (full, refName: string) => {
      if (attrs[refName] !== undefined && refName !== 'value' && refName !== 'default' && refName !== 'name') {
        const helperAttr = attrs[refName]!.replace(/\$\(([a-z_][\w.-]*)\)/gi, (hFull, hRef: string) => {
          return baseValues.get(hRef) ?? baseValues.get(toSkinVarIdentifier(hRef)) ?? hFull
        })
        return helperAttr
      }
      return baseValues.get(refName) ?? baseValues.get(toSkinVarIdentifier(refName)) ?? full
    })
  }

  const variables: BloggerParsedSkinVariable[] = []
  const symbols: Record<string, BloggerSkinVariableSymbol> = {}

  for (const decl of rawDeclarations) {
    const resolvedDefault = interpolateDeclarationValue(decl.default, decl.attrs)
    const resolvedValue = interpolateDeclarationValue(decl.value, decl.attrs)
    const effectiveDefault = resolvedDefault ?? resolvedValue ?? ''

    variables.push({
      name: decl.name,
      type: decl.type,
      default: effectiveDefault,
      ...(resolvedValue !== undefined ? { value: resolvedValue } : {}),
      ...(decl.description !== undefined ? { description: decl.description } : {}),
      ...(decl.group !== undefined ? { group: decl.group } : {}),
    })

    symbols[decl.name] = {
      name: decl.name,
      type: decl.type,
      description: decl.description,
      default: resolvedDefault,
      value: resolvedValue,
    }
  }

  let cleanedCss = content
  if (options?.stripMetadataTags !== false) {
    cleanedCss = cleanedCss.replace(/\/\*[\s\S]*?\*\//g, (comment) => {
      if (/<(?:Variable|Group)\b/i.test(comment)) {
        return ''
      }
      return comment
    })
    cleanedCss = cleanedCss
      .replace(/<Group\b[^>]*>/gi, '')
      .replace(/<\/Group>/gi, '')
      .replace(/<Variable\b[^>]*?(?:\/>|>[\s\S]*?<\/Variable>)/gi, '')
  }

  return {
    isTemplateSkin,
    variables,
    symbols,
    chunks: tokenizeSkinCssChunks(cleanedCss),
  }
}

export function resolveSkinCssVariable(
  rawVar: string,
  resolvedVariables: Readonly<Record<string, string>>,
  variableTypes: Readonly<Record<string, string>>,
): string | undefined {
  if (resolvedVariables[rawVar] !== undefined) {
    return resolvedVariables[rawVar]!
  }

  const lookupBase = (prefix: string): { value: string, type: string } | undefined => {
    const norm = toSkinVarIdentifier(prefix)
    const val = resolvedVariables[prefix] ?? resolvedVariables[norm]
    if (val === undefined) {
      return undefined
    }
    const type = (variableTypes[prefix] ?? variableTypes[norm] ?? 'string').toLowerCase()
    return { value: val, type }
  }

  if (rawVar.includes('.')) {
    const parts = rawVar.split('.')
    if (parts.length >= 3) {
      const lastTwo = parts.slice(-2).map(p => p.toLowerCase())
      if (lastTwo[0] === 'color') {
        const bgPrefix = parts.slice(0, -2).join('.')
        const bgBase = lookupBase(bgPrefix)
        if (bgBase && bgBase.type === 'background') {
          const parsedBg = parseThemeDesignerBackground(bgBase.value)
          const channel = lastTwo[1]!
          if (channel === 'red')
            return String(parsedBg.color.red)
          if (channel === 'green')
            return String(parsedBg.color.green)
          if (channel === 'blue')
            return String(parsedBg.color.blue)
          if (channel === 'alpha')
            return String(parsedBg.color.alpha)
          if (channel === 'transparent')
            return parsedBg.color.transparent
          if (channel === 'inverse')
            return parsedBg.color.inverse
        }
      }
    }

    const lastDot = rawVar.lastIndexOf('.')
    const prefix = rawVar.slice(0, lastDot)
    const subProp = rawVar.slice(lastDot + 1).toLowerCase()
    const base = lookupBase(prefix)

    if (base) {
      if (base.type === 'font') {
        const fontDef = parseThemeDesignerFont(base.value)
        if (subProp === 'family' && fontDef.family !== undefined)
          return fontDef.family
        if (subProp === 'size' && fontDef.size !== undefined)
          return fontDef.size
        if (subProp === 'style' && fontDef.style !== undefined)
          return fontDef.style
        if (subProp === 'weight' && fontDef.weight !== undefined)
          return fontDef.weight
      }
      else if (base.type === 'color') {
        const colorDef = parseThemeDesignerColor(base.value)
        if (subProp === 'red')
          return String(colorDef.red)
        if (subProp === 'green')
          return String(colorDef.green)
        if (subProp === 'blue')
          return String(colorDef.blue)
        if (subProp === 'alpha')
          return String(colorDef.alpha)
        if (subProp === 'transparent')
          return colorDef.transparent
        if (subProp === 'inverse')
          return colorDef.inverse
      }
      else if (base.type === 'background') {
        if (subProp === 'color') {
          const bgDef = parseThemeDesignerBackground(base.value)
          return bgDef.color.raw
        }
      }
    }
  }

  const normalized = toSkinVarIdentifier(rawVar)
  if (resolvedVariables[normalized] !== undefined) {
    return resolvedVariables[normalized]!
  }

  return undefined
}

export function compileSkinCss(
  skinXmlOrCdata: string,
  options?: CompileSkinOptions,
): BloggerCompiledSkinResult {
  const parsedSource = parseSkinSource(skinXmlOrCdata, {
    stripMetadataTags: options?.stripMetadataTags,
  })

  const symbols: Record<string, BloggerSkinVariableSymbol> = {}
  const variableTypes: Record<string, string> = {}

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

  for (const [k, sym] of Object.entries(parsedSource.symbols)) {
    symbols[k] = sym
  }

  const resolvedVariables: Record<string, string> = {}
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
    variableTypes[name] = sym.type
    variableTypes[normalizedName] = sym.type
  }

  if (options?.overrides) {
    for (const [k, v] of Object.entries(options.overrides)) {
      if (resolvedVariables[k] === undefined) {
        const norm = toSkinVarIdentifier(k)
        resolvedVariables[k] = v
        resolvedVariables[norm] = v
      }
    }
  }

  let processedCss = ''
  const rawCleaned = extractSkinContent(skinXmlOrCdata)
  let fallbackSource = rawCleaned.content
  if (options?.stripMetadataTags !== false) {
    fallbackSource = fallbackSource.replace(/\/\*[\s\S]*?\*\//g, c => /<(?:Variable|Group)\b/i.test(c) ? '' : c)
      .replace(/<Group\b[^>]*>/gi, '')
      .replace(/<\/Group>/gi, '')
      .replace(/<Variable\b[^>]*?(?:\/>|>[\s\S]*?<\/Variable>)/gi, '')
  }

  // Reconstruct preserving original token syntax ($var vs $(var)) when unresolved
  const tokenRegex = /\$\(([a-z_][\w.-]*)\)|(?<![\w$])\$([a-z_]\w*)\b(?!\.)/gi
  processedCss = fallbackSource.replace(tokenRegex, (fullMatch, parenVar?: string, standaloneVar?: string) => {
    const varRef = (parenVar ?? standaloneVar)!
    const resolved = resolveSkinCssVariable(varRef, resolvedVariables, variableTypes)
    return resolved !== undefined ? resolved : fullMatch
  })

  let wrapMode = options?.wrap
  if (wrapMode === undefined) {
    wrapMode = parsedSource.isTemplateSkin ? 'template-skin' : 'page-skin'
  }

  const catalog = options?.catalog ?? getSpecCatalog()
  const skinCompilation = catalog.getSkinCompilation()

  let finalCss = processedCss.trim()
  if (wrapMode === 'page-skin' || wrapMode === true) {
    const wrapper = skinCompilation?.page_skin?.output_wrapper ?? '<style id=\'page-skin-1\' type=\'text/css\'><!--\n{content}\n--></style>'
    finalCss = wrapper.replace('{content}', finalCss)
  }
  else if (wrapMode === 'template-skin') {
    const wrapper = skinCompilation?.template_skin?.output_wrapper ?? '<style id=\'template-skin-1\' type=\'text/css\'><!--\n{content}\n--></style>'
    finalCss = wrapper.replace('{content}', finalCss)
  }

  return {
    css: finalCss,
    variables: resolvedVariables,
    symbols,
  }
}
