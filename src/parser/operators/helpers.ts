import { isSkinValue } from '../../skin-compiler.js'

export class BloggerDivisionByZeroError extends Error {
  constructor(message: string = 'Division by zero') {
    super(message)
    this.name = 'BloggerDivisionByZeroError'
  }
}

export function unboxScalar(val: any): any {
  if (Object.prototype.toString.call(val) === '[object String]' || isSkinValue(val)) {
    return String(val)
  }
  return val
}

export function compareRelational(left: any, right: any): { l: any, r: any } {
  const l = unboxScalar(left)
  const r = unboxScalar(right)
  if (typeof l === 'number' && typeof r === 'string' && r.trim() !== '' && !Number.isNaN(Number(r))) {
    return { l, r: Number(r) }
  }
  if (typeof r === 'number' && typeof l === 'string' && l.trim() !== '' && !Number.isNaN(Number(l))) {
    return { l: Number(l), r }
  }
  return { l, r }
}

export function isEqual(left: any, right: any): boolean {
  if (left === right)
    return true

  const l = unboxScalar(left)
  const r = unboxScalar(right)

  if (l === r)
    return true

  // Missing / nullish equality with empty string
  if ((l === null || l === undefined) && r === '')
    return true
  if ((r === null || r === undefined) && l === '')
    return true
  if ((l === null || l === undefined) && (r === null || r === undefined))
    return true

  // Strict type rejection for array vs boolean
  if (Array.isArray(l) && typeof r === 'boolean')
    return false
  if (Array.isArray(r) && typeof l === 'boolean')
    return false

  // Strict type rejection for boolean vs number
  if (typeof l === 'boolean' && typeof r === 'number')
    return false
  if (typeof r === 'boolean' && typeof l === 'number')
    return false

  // Canonical boolean string equality
  if (typeof l === 'boolean' && typeof r === 'string') {
    if (l === true && (r === 'true' || r === 'yes'))
      return true
    if (l === false && (r === 'false' || r === 'no'))
      return true
    return false
  }
  if (typeof r === 'boolean' && typeof l === 'string') {
    if (r === true && (l === 'true' || l === 'yes'))
      return true
    if (r === false && (l === 'false' || l === 'no'))
      return true
    return false
  }

  // Canonical numeric string equality
  if (typeof l === 'number' && typeof r === 'string') {
    const num = Number(r)
    if (!Number.isNaN(num) && String(num) === r && l === num)
      return true
    return false
  }
  if (typeof r === 'number' && typeof l === 'string') {
    const num = Number(l)
    if (!Number.isNaN(num) && String(num) === l && r === num)
      return true
    return false
  }

  return false
}

export function isStringLike(val: any): boolean {
  return typeof val === 'string' || Object.prototype.toString.call(val) === '[object String]'
}

export function isMemberOf(item: any, collection: any): boolean {
  if (collection === null || collection === undefined)
    return false

  if (isStringLike(collection) || isSkinValue(collection)) {
    const target = item === null || item === undefined ? '' : String(item)
    return String(collection).includes(target)
  }

  if (Array.isArray(collection)) {
    return collection.some(el => isEqual(item, el))
  }

  return false
}

export function extractYouTubeVideoId(url: string): string | null {
  const ytImg = /ytimg\.com\/vi(?:_webp)?\/([\w-]{6,})/i.exec(url)
  if (ytImg)
    return ytImg[1]!
  const ytEmbed = /youtube\.com\/(?:embed|v|shorts)\/([\w-]{6,})/i.exec(url)
  if (ytEmbed)
    return ytEmbed[1]!
  if (/youtube\.com/i.test(url)) {
    const watchParam = /[?&]v=([\w-]{6,})/.exec(url)
    if (watchParam)
      return watchParam[1]!
  }
  const ytShort = /youtu\.be\/([\w-]{6,})/i.exec(url)
  if (ytShort)
    return ytShort[1]!
  return null
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function escapeJs(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, '\\\'')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
}

export function escapeJson(str: string): string {
  const json = JSON.stringify(str)
  return json.slice(1, -1)
}

export function escapeCss(str: string): string {
  return str.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1')
}

export function hasDataProperty(target: object, key: PropertyKey): boolean {
  if (Object.prototype.propertyIsEnumerable.call(target, key)) {
    return true
  }
  return key in target && !(key in Object.prototype) && key !== 'toString' && key !== 'valueOf'
}

export function applyModifier(target: any, modifier: string): any {
  if (target === null || target === undefined)
    return undefined

  // Pre-configured custom property on object/array (e.g. mock objects in fixtures, resizeImage .width/.height, BloggerSkinValue fields)
  if (typeof target === 'object' && hasDataProperty(target, modifier)) {
    return target[modifier]
  }

  // Theme Designer skin:* root values have parent_type: null and never inherit string modifiers
  if (isSkinValue(target)) {
    return undefined
  }

  if (isStringLike(target)) {
    const str = String(target)
    switch (modifier) {
      case 'length':
      case 'size':
        return str.length
      case 'escaped':
        return escapeHtml(str)
      case 'jsEscaped':
        return escapeJs(str)
      case 'jsonEscaped':
        return escapeJson(str)
      case 'cssEscaped':
        return escapeCss(str)
      case 'canonical': {
        const base = str.split('#')[0]!
        try {
          const parsed = new URL(base)
          // Blogger strips temporal pagination (updated-max/min) and mobile parameters (m) from canonical URLs
          parsed.searchParams.delete('updated-max')
          parsed.searchParams.delete('updated-min')
          parsed.searchParams.delete('m')
          const query = parsed.searchParams.toString()
          return query ? `${parsed.origin}${parsed.pathname}?${query}` : `${parsed.origin}${parsed.pathname}`
        }
        catch {
          return base.split('?')[0]
        }
      }
      case 'http':
        return str.replace(/^https:/i, 'http:')
      case 'https':
        return str.replace(/^http:/i, 'https:')
      case 'isResizable':
        return /googleusercontent\.com|blogspot\.com|ggpht\.com/i.test(str)
      case 'isYouTube':
      case 'isYoutube':
        return /youtube\.com|youtu\.be|ytimg\.com/i.test(str)
      case 'youtubeMaxResDefaultUrl': {
        const videoId = extractYouTubeVideoId(str)
        return videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : false
      }
      case 'iso8601':
      case 'year':
      case 'month':
      case 'day': {
        const trimmed = str.trim()
        if (!trimmed) {
          return modifier === 'iso8601' ? '' : undefined
        }
        const hasTz = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)
        const rawDate = hasTz
          ? new Date(trimmed)
          : (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? new Date(`${trimmed}T00:00:00Z`) : new Date(`${trimmed} UTC`))
        if (Number.isNaN(rawDate.getTime())) {
          return undefined
        }
        if (modifier === 'iso8601') {
          return rawDate.toISOString()
        }
        let calDate = rawDate
        const offsetMatch = /([+-])(\d{2}):?(\d{2})$/.exec(trimmed)
        if (offsetMatch) {
          const sign = offsetMatch[1] === '-' ? -1 : 1
          const offsetMs = sign * (Number.parseInt(offsetMatch[2]!, 10) * 60 + Number.parseInt(offsetMatch[3]!, 10)) * 60000
          calDate = new Date(rawDate.getTime() + offsetMs)
        }
        if (modifier === 'year')
          return calDate.getUTCFullYear()
        if (modifier === 'month')
          return calDate.getUTCMonth() + 1
        return calDate.getUTCDate()
      }
    }
  }

  if (Array.isArray(target)) {
    switch (modifier) {
      case 'length':
      case 'size':
        return target.length
      case 'first':
        return target[0]
      case 'last':
        return target[target.length - 1]
      case 'empty':
        return target.length === 0
      case 'notEmpty':
      case 'any':
        return target.length > 0
    }
  }

  if (typeof target === 'object') {
    switch (modifier) {
      case 'variant':
        return target.variant ?? ''
      case 'script':
        return target.script ?? ''
      case 'first':
        return Array.isArray(target) ? target[0] : target
      case 'last':
        return Array.isArray(target) ? target[target.length - 1] : target
      case 'length':
      case 'size':
        return Array.isArray(target) ? target.length : target.size
      case 'url':
        return target.url
      case 'width':
        return target.width
      case 'height':
        return target.height
    }
  }

  return undefined
}
