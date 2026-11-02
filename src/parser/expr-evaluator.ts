import type {
  BloggerBinaryExpressionNode,
  BloggerCallExpressionNode,
  BloggerDataPathNode,
  BloggerExpressionNode,
  BloggerIdentifierNode,
  BloggerLiteralNode,
} from '../ast.js'
import { formatIcuDate } from '../context/date-formatter.js'
import { isSkinValue } from '../skin-compiler.js'
import { isTruthy } from '../type-system.js'
import { parseExpression } from './expr-parser.js'

export class BloggerDivisionByZeroError extends Error {
  constructor(message: string = 'Division by zero') {
    super(message)
    this.name = 'BloggerDivisionByZeroError'
  }
}

function unboxScalar(val: any): any {
  if (Object.prototype.toString.call(val) === '[object String]' || isSkinValue(val)) {
    return String(val)
  }
  return val
}

function compareRelational(left: any, right: any): { l: any, r: any } {
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

function isStringLike(val: any): boolean {
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

function extractYouTubeVideoId(url: string): string | null {
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeJs(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, '\\\'')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
}

function escapeJson(str: string): string {
  const json = JSON.stringify(str)
  return json.slice(1, -1)
}

function escapeCss(str: string): string {
  return str.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1')
}

function hasDataProperty(target: object, key: PropertyKey): boolean {
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

export function resizeImage(url: any, size: any, ratio?: any): any {
  if (url === null || url === undefined)
    return undefined

  let urlStr = String(url)
  if (urlStr.startsWith('//')) {
    urlStr = `https:${urlStr}`
  }
  const isGoogleHost = /googleusercontent\.com|blogspot\.com|ggpht\.com/i.test(urlStr)
  if (!isGoogleHost) {
    return urlStr
  }

  if (Array.isArray(size)) {
    return size.map(s => ({
      url: resizeImage(url, s, ratio),
      size: s,
    }))
  }

  const dim = Number(size)
  let param: string
  const targetWidth = dim
  let targetHeight = dim

  const ratioStr = ratio != null ? String(ratio) : ''
  if (ratioStr) {
    const parts = ratioStr.split(':').map(Number)
    const rw = parts[0]
    const rh = parts[1]
    targetHeight = rw && rh ? Math.floor((dim * rh) / rw) : dim
    param = `w${targetWidth}-h${targetHeight}-p-k-no-nu`
  }
  else {
    param = `w${dim}`
  }

  let resultUrl = urlStr
  if (/=[^/]+$/.test(urlStr)) {
    resultUrl = urlStr.replace(/=[^/]+$/, `=${param}`)
  }
  else if (/\/s\d[^/]*\//.test(urlStr)) {
    resultUrl = urlStr.replace(/\/s\d[^/]*\//, `/${param}/`)
  }
  else if (/\/w\d[^/]*\//.test(urlStr)) {
    resultUrl = urlStr.replace(/\/w\d[^/]*\//, `/${param}/`)
  }
  else {
    resultUrl = `${urlStr}=${param}`
  }

  // Create a String wrapper carrying .width and .height metadata
  // eslint-disable-next-line no-new-wrappers, unicorn/new-for-builtins
  const res = new String(resultUrl) as any
  res.width = targetWidth
  res.height = targetHeight
  return res
}

export function sourceSet(url: any, sizes: any, ratio?: any): string {
  if (!Array.isArray(sizes) || url === null || url === undefined)
    return ''
  return sizes
    .map(w => `${String(resizeImage(url, w, ratio))} ${w}w`)
    .join(', ')
}

export function appendParams(url: any, paramsMap: any): string {
  const urlStr = String(url ?? '')
  const [baseAndQuery, hash] = urlStr.split('#')
  const [base, existingQuery] = baseAndQuery.split('?')

  const existingOrder: string[] = []
  const params = new Map<string, string>()

  if (existingQuery) {
    for (const part of existingQuery.split('&')) {
      if (!part)
        continue
      const [k, v] = part.split('=')
      const decodedKey = decodeURIComponent(k)
      if (!params.has(decodedKey)) {
        existingOrder.push(decodedKey)
      }
      params.set(decodedKey, decodeURIComponent(v || ''))
    }
  }

  const newKeys: string[] = []
  for (const [k, v] of Object.entries(paramsMap || {})) {
    if (params.has(k)) {
      params.set(k, String(v))
    }
    else {
      newKeys.push(k)
      params.set(k, String(v))
    }
  }

  newKeys.sort()

  const finalKeys = [...existingOrder, ...newKeys]
  const query = finalKeys
    .map((k) => {
      const val = params.get(k) || ''
      const encodedVal = val.startsWith('http://') || val.startsWith('https://')
        ? encodeURI(val)
        : encodeURIComponent(val)
      return `${encodeURIComponent(k)}=${encodedVal}`
    })
    .join('&')

  const result = query ? `${base}?${query}` : base
  return hash ? `${result}#${hash}` : result
}

export function params(url: any, paramsMap: any): string {
  return appendParams(url, paramsMap)
}

export function fragment(url: any, frag: any): string {
  const base = String(url ?? '').split('#')[0]
  return `${base}#${String(frag ?? '')}`
}

export function path(url: any, newPath: any): string {
  const urlStr = String(url ?? '')
  try {
    const parsed = new URL(urlStr)
    parsed.pathname = String(newPath ?? '')
    return parsed.toString()
  }
  catch {
    const base = urlStr.replace(/(https?:\/\/[^/]+).*/, '$1')
    return `${base}${String(newPath ?? '')}`
  }
}

function normalizeSnippetWhitespace(str: string, linebreaks: boolean): string {
  const normalizedBreaks = str.replace(/\r\n?/g, '\n')
  if (!linebreaks) {
    return normalizedBreaks.replace(/[ \t]*\n+[ \t]*/g, ' ')
  }
  return normalizedBreaks
}

export function snippet(text: any, options?: any): string {
  const rawLen = options?.length !== undefined ? Number(options.length) : 1000
  const len = Number.isFinite(rawLen) ? Math.min(1000, Math.max(50, Math.floor(rawLen))) : 1000
  const links = options?.links !== undefined ? Boolean(options.links) : true
  const linebreaks = options?.linebreaks !== undefined ? Boolean(options.linebreaks) : true
  const ellipsis = options?.ellipsis !== undefined ? Boolean(options.ellipsis) : true

  const source = String(text ?? '').replace(/<br\s*\/?>/gi, '\n')

  if (!links || !/<a\b/i.test(source)) {
    const clean = normalizeSnippetWhitespace(source.replace(/<[^>]+>/g, ''), linebreaks).trim()
    if (clean.length > len) {
      if (ellipsis) {
        const cut = clean.slice(0, Math.max(0, len - 1))
        return `${cut}\u2026`
      }
      return clean.slice(0, len)
    }
    return clean
  }

  // Preserve <a ...>...</a> markup while counting and truncating strictly by visible characters
  const strippedOtherTags = source.replace(/<(?!\/?a\b)[^>]+>/gi, '')
  const trimmed = normalizeSnippetWhitespace(strippedOtherTags, linebreaks).trim()
  const tokenRegex = /(<\/?a\b[^>]*>)/gi
  const segments: Array<{ isTag: boolean, value: string }> = []
  let lastIndex = 0
  let totalVisible = 0
  let match: RegExpExecArray | null = tokenRegex.exec(trimmed)
  while (match !== null) {
    if (match.index > lastIndex) {
      const chunk = trimmed.slice(lastIndex, match.index)
      segments.push({ isTag: false, value: chunk })
      totalVisible += chunk.length
    }
    segments.push({ isTag: true, value: match[1]! })
    lastIndex = match.index + match[0].length
    match = tokenRegex.exec(trimmed)
  }
  if (lastIndex < trimmed.length) {
    const tail = trimmed.slice(lastIndex)
    segments.push({ isTag: false, value: tail })
    totalVisible += tail.length
  }

  if (totalVisible <= len) {
    return segments.map(s => s.value).join('')
  }

  let remaining = ellipsis ? Math.max(0, len - 1) : len
  let openAnchors = 0
  let out = ''
  for (const seg of segments) {
    if (seg.isTag) {
      const isClosing = /^<\/a\b/i.test(seg.value)
      if (isClosing) {
        if (openAnchors > 0) {
          out += seg.value
          openAnchors--
        }
      }
      else if (remaining > 0) {
        out += seg.value
        openAnchors++
      }
    }
    else if (remaining > 0) {
      const slice = seg.value.slice(0, remaining)
      out += slice
      remaining -= slice.length
    }
  }
  while (openAnchors > 0) {
    out += '</a>'
    openAnchors--
  }
  return ellipsis ? `${out}\u2026` : out
}

export function format(dateVal: any, pattern: string, locale = 'en', timeZone?: string): string {
  if (dateVal === null || dateVal === undefined)
    return ''
  return formatIcuDate(dateVal, String(pattern), locale, timeZone)
}

export class ExpressionEvaluator {
  evaluate(
    node: BloggerExpressionNode,
    context: Record<string, any> = {},
    locals: Record<string, any> = {},
  ): any {
    switch (node.type) {
      case 'Literal':
        return node.value

      case 'Identifier': {
        const name = node.name
        if (name === 'true')
          return true
        if (name === 'false')
          return false
        if (name === 'null')
          return null
        if (name in locals)
          return locals[name]
        if (name in context)
          return context[name]
        return undefined
      }

      case 'DataPath': {
        return this.evaluateDataPath(node, context, locals)
      }

      case 'MemberExpression': {
        const obj = this.evaluate(node.object, context, locals)
        if (obj === null || obj === undefined)
          return undefined

        let propName: any
        if (node.computed) {
          propName = this.evaluate(node.property as BloggerExpressionNode, context, locals)
        }
        else {
          propName = (node.property as BloggerIdentifierNode).name
        }

        if (typeof obj === 'object' && hasDataProperty(obj, propName)) {
          return obj[propName]
        }
        return applyModifier(obj, String(propName))
      }

      case 'UnaryExpression': {
        const arg = this.evaluate(node.argument, context, locals)
        switch (node.operator) {
          case 'not':
          case '!':
            return !isTruthy(arg)
          case '-':
            return -Number(arg)
          case '+':
            return +Number(arg)
          default:
            return undefined
        }
      }

      case 'BinaryExpression': {
        return this.evaluateBinary(node, context, locals)
      }

      case 'LogicalExpression': {
        const left = this.evaluate(node.left, context, locals)
        const op = node.operator
        if (op === '&&' || op === 'and') {
          return isTruthy(left) ? this.evaluate(node.right, context, locals) : left
        }
        if (op === '||' || op === 'or') {
          return isTruthy(left) ? left : this.evaluate(node.right, context, locals)
        }
        return undefined
      }

      case 'ConditionalExpression': {
        const testVal = this.evaluate(node.test, context, locals)
        if (node.isElvis) {
          // Elvis: triggers fallback only when target is nullish (null / undefined)
          return testVal ?? this.evaluate(node.consequent, context, locals)
        }
        if (isTruthy(testVal)) {
          return this.evaluate(node.consequent, context, locals)
        }
        return node.alternate ? this.evaluate(node.alternate, context, locals) : undefined
      }

      case 'LambdaExpression': {
        const collection = this.evaluate(node.callee, context, locals)
        const items = Array.isArray(collection) ? collection : []
        const param = node.parameter

        switch (node.operator) {
          case 'filter':
          case 'where':
            return items.filter(item => isTruthy(this.evaluate(node.body, context, { ...locals, [param]: item })))

          case 'map':
          case 'select':
            return items.map(item => this.evaluate(node.body, context, { ...locals, [param]: item }))

          case 'count':
            return items.filter(item => isTruthy(this.evaluate(node.body, context, { ...locals, [param]: item }))).length

          case 'any':
            return items.some(item => isTruthy(this.evaluate(node.body, context, { ...locals, [param]: item })))

          case 'all':
            return items.every(item => isTruthy(this.evaluate(node.body, context, { ...locals, [param]: item })))

          case 'none':
            return items.every(item => !isTruthy(this.evaluate(node.body, context, { ...locals, [param]: item })))

          case 'first':
            return items.find(item => isTruthy(this.evaluate(node.body, context, { ...locals, [param]: item })))

          default:
            return undefined
        }
      }

      case 'CallExpression': {
        return this.evaluateCall(node, context, locals)
      }

      case 'ArrayExpression':
        return node.elements.map(el => this.evaluate(el, context, locals))

      case 'ObjectExpression': {
        const obj: Record<string, any> = {}
        for (const prop of node.properties) {
          obj[prop.key] = this.evaluate(prop.value, context, locals)
        }
        return obj
      }

      default:
        return undefined
    }
  }

  private evaluateDataPath(
    node: BloggerDataPathNode,
    context: Record<string, any>,
    locals: Record<string, any>,
  ): any {
    const raw = node.raw || ''
    const cleanPath = raw.startsWith('data:') ? raw.slice(5) : raw
    const members = node.members || []

    let current: any
    let startIndex = 0

    if (members.length > 0) {
      const firstProp = members[0].property
      if (firstProp in locals) {
        current = locals[firstProp]
        startIndex = 1
      }
      else if (context.data && typeof context.data === 'object' && firstProp in context.data) {
        current = context.data[firstProp]
        startIndex = 1
      }
      else if (context.this && typeof context.this === 'object' && firstProp in context.this) {
        current = context.this[firstProp]
        startIndex = 1
      }
      else if (firstProp in context) {
        current = context[firstProp]
        startIndex = 1
      }
      else if (`data:${firstProp}` in context) {
        current = context[`data:${firstProp}`]
        startIndex = 1
      }
      else if (cleanPath in context) {
        return context[cleanPath]
      }
      else if (raw in context) {
        return context[raw]
      }
      else {
        return undefined
      }
    }
    else {
      if ('data' in locals) {
        return locals.data
      }
      if ('data' in context) {
        return context.data
      }
      if ('data:' in context) {
        return context['data:']
      }
      if (cleanPath && cleanPath in context) {
        return context[cleanPath]
      }
      if (raw in context) {
        return context[raw]
      }
      return undefined
    }

    for (let i = startIndex; i < members.length; i++) {
      if (current === null || current === undefined)
        return undefined

      const m = members[i]
      const propKey = m.computed
        ? this.evaluate(m.expression as BloggerExpressionNode, context, locals)
        : m.property

      if (typeof current === 'object' && hasDataProperty(current, propKey)) {
        current = current[propKey]
      }
      else {
        current = applyModifier(current, String(propKey))
      }
    }

    return current
  }

  private evaluateBinary(
    node: BloggerBinaryExpressionNode,
    context: Record<string, any>,
    locals: Record<string, any>,
  ): any {
    const op = node.operator

    if (op === '+') {
      const isLeftLiteralString = node.left.type === 'Literal' && typeof (node.left as BloggerLiteralNode).value === 'string'
      const isRightLiteralString = node.right.type === 'Literal' && typeof (node.right as BloggerLiteralNode).value === 'string'

      const leftVal = this.evaluate(node.left, context, locals)
      const rightVal = this.evaluate(node.right, context, locals)

      // Literal string forces concatenation
      if (isLeftLiteralString || isRightLiteralString) {
        return String(leftVal ?? '') + String(rightVal ?? '')
      }

      // Check if both are numeric (either numbers or numeric strings from variables)
      const leftNum = leftVal !== null && leftVal !== '' && !Number.isNaN(Number(leftVal)) ? Number(leftVal) : null
      const rightNum = rightVal !== null && rightVal !== '' && !Number.isNaN(Number(rightVal)) ? Number(rightVal) : null

      if (leftNum !== null && rightNum !== null && typeof leftVal !== 'boolean' && typeof rightVal !== 'boolean') {
        return leftNum + rightNum
      }

      return String(leftVal ?? '') + String(rightVal ?? '')
    }

    if (op === '-' || op === '*' || op === '/' || op === '%') {
      const leftVal = Number(this.evaluate(node.left, context, locals))
      const rightVal = Number(this.evaluate(node.right, context, locals))

      if (op === '-')
        return leftVal - rightVal
      if (op === '*')
        return leftVal * rightVal
      if (op === '/') {
        if (rightVal === 0) {
          throw new BloggerDivisionByZeroError('Division by zero in expression evaluation')
        }
        return leftVal / rightVal
      }
      if (op === '%') {
        if (rightVal === 0) {
          throw new BloggerDivisionByZeroError('Modulo by zero in expression evaluation')
        }
        return leftVal % rightVal
      }
    }

    if (op === '==' || op === '!=' || op === 'eq' || op === 'neq') {
      const leftVal = this.evaluate(node.left, context, locals)
      const rightVal = this.evaluate(node.right, context, locals)
      const eq = isEqual(leftVal, rightVal)
      return (op === '==' || op === 'eq') ? eq : !eq
    }

    if (op === '===' || op === '!==') {
      const leftVal = this.evaluate(node.left, context, locals)
      const rightVal = this.evaluate(node.right, context, locals)
      return op === '===' ? leftVal === rightVal : leftVal !== rightVal
    }

    if (op === '<' || op === 'lt' || op === '>' || op === 'gt' || op === '<=' || op === 'lte' || op === '>=' || op === 'gte') {
      const { l, r } = compareRelational(this.evaluate(node.left, context, locals), this.evaluate(node.right, context, locals))
      if (op === '<' || op === 'lt')
        return l < r
      if (op === '>' || op === 'gt')
        return l > r
      if (op === '<=' || op === 'lte')
        return l <= r
      if (op === '>=' || op === 'gte')
        return l >= r
    }

    if (op === 'in' || op === 'not in') {
      const leftVal = this.evaluate(node.left, context, locals)
      const rightVal = this.evaluate(node.right, context, locals)
      const inside = isMemberOf(leftVal, rightVal)
      return op === 'in' ? inside : !inside
    }

    if (op === 'contains' || op === 'not contains') {
      const leftVal = this.evaluate(node.left, context, locals)
      const rightVal = this.evaluate(node.right, context, locals)
      const inside = isMemberOf(rightVal, leftVal)
      return op === 'contains' ? inside : !inside
    }

    if (op === 'take') {
      const leftVal = this.evaluate(node.left, context, locals)
      const count = Number(this.evaluate(node.right, context, locals))
      return Array.isArray(leftVal) ? leftVal.slice(0, count) : []
    }

    if (op === 'skip') {
      const leftVal = this.evaluate(node.left, context, locals)
      const count = Number(this.evaluate(node.right, context, locals))
      return Array.isArray(leftVal) ? leftVal.slice(count) : []
    }

    if (op === 'to') {
      const start = Number(this.evaluate(node.left, context, locals))
      const end = Number(this.evaluate(node.right, context, locals))
      const result: number[] = []
      if (start <= end) {
        for (let i = start; i <= end; i++) result.push(i)
      }
      else {
        for (let i = start; i >= end; i--) result.push(i)
      }
      return result
    }

    if (op === 'params') {
      const leftVal = this.evaluate(node.left, context, locals)
      const rightVal = this.evaluate(node.right, context, locals)
      return params(leftVal, rightVal)
    }

    if (op === 'appendParams') {
      const leftVal = this.evaluate(node.left, context, locals)
      const rightVal = this.evaluate(node.right, context, locals)
      return appendParams(leftVal, rightVal)
    }

    if (op === 'fragment') {
      const leftVal = this.evaluate(node.left, context, locals)
      const rightVal = this.evaluate(node.right, context, locals)
      return fragment(leftVal, rightVal)
    }

    if (op === 'path') {
      const leftVal = this.evaluate(node.left, context, locals)
      const rightVal = this.evaluate(node.right, context, locals)
      return path(leftVal, rightVal)
    }

    if (op === 'resizeImage') {
      if (node.left.type === 'BinaryExpression' && node.left.operator === 'resizeImage') {
        const imgVal = this.evaluate(node.left.left, context, locals)
        const sizeVal = this.evaluate(node.left.right, context, locals)
        const ratioVal = this.evaluate(node.right, context, locals)
        return resizeImage(imgVal, sizeVal, ratioVal != null ? String(ratioVal) : undefined)
      }
      const leftVal = this.evaluate(node.left, context, locals)
      const rightVal = this.evaluate(node.right, context, locals)
      return resizeImage(leftVal, rightVal)
    }

    if (op === 'sourceSet') {
      if (node.left.type === 'BinaryExpression' && node.left.operator === 'sourceSet') {
        const imgVal = this.evaluate(node.left.left, context, locals)
        const sizesVal = this.evaluate(node.left.right, context, locals)
        const ratioVal = this.evaluate(node.right, context, locals)
        return sourceSet(imgVal, sizesVal, ratioVal != null ? String(ratioVal) : undefined)
      }
      const leftVal = this.evaluate(node.left, context, locals)
      const rightVal = this.evaluate(node.right, context, locals)
      return sourceSet(leftVal, rightVal)
    }

    if (op === 'format') {
      const leftVal = this.evaluate(node.left, context, locals)
      const rightVal = this.evaluate(node.right, context, locals)
      const locale = context.blog?.locale || (context as any)?.locale || 'en'
      const timeZone = context.blog?.timeZone || (context as any)?.timeZone
      return format(leftVal, String(rightVal), locale, timeZone)
    }

    if (op === 'snippet') {
      const leftVal = this.evaluate(node.left, context, locals)
      const rightVal = this.evaluate(node.right, context, locals)
      return snippet(leftVal, rightVal)
    }

    return undefined
  }

  private evaluateCall(
    node: BloggerCallExpressionNode,
    context: Record<string, any>,
    locals: Record<string, any>,
  ): any {
    const fn = node.callee
    const args = node.arguments.map(arg => this.evaluate(arg, context, locals))

    if (fn === '$') {
      // Theme Designer skin variable reference: $(accent.red) -> returns evaluated argument
      return args[0]
    }

    if (fn === 'not') {
      return !isTruthy(args[0])
    }

    if (fn === 'and') {
      return args.every(a => isTruthy(a))
    }

    if (fn === 'or') {
      return args.some(a => isTruthy(a))
    }

    if (fn === 'eq') {
      return isEqual(args[0], args[1])
    }

    if (fn === 'neq') {
      return !isEqual(args[0], args[1])
    }

    if (fn === 'lt') {
      const { l, r } = compareRelational(args[0], args[1])
      return l < r
    }

    if (fn === 'gt') {
      const { l, r } = compareRelational(args[0], args[1])
      return l > r
    }

    if (fn === 'lte') {
      const { l, r } = compareRelational(args[0], args[1])
      return l <= r
    }

    if (fn === 'gte') {
      const { l, r } = compareRelational(args[0], args[1])
      return l >= r
    }

    if (fn === 'in') {
      return isMemberOf(args[0], args[1])
    }

    if (fn === 'contains') {
      return isMemberOf(args[1], args[0])
    }

    if (fn === '?') {
      return isTruthy(args[0]) ? args[1] : args[2]
    }

    if (fn === '?:') {
      return args.find(a => a !== null && a !== undefined) ?? args[args.length - 1]
    }

    if (fn === '%') {
      const d = Number(args[1])
      if (d === 0)
        throw new BloggerDivisionByZeroError('Division by zero in functional operator %')
      return Number(args[0]) % d
    }

    if (fn === 'take' || fn === 'limit') {
      return Array.isArray(args[0]) ? args[0].slice(0, Number(args[1])) : []
    }

    if (fn === 'skip' || fn === 'offset') {
      return Array.isArray(args[0]) ? args[0].slice(Number(args[1])) : []
    }

    if (fn === '-') {
      if (args.length === 1)
        return -Number(args[0])
      return args.slice(1).reduce((acc, curr) => acc - Number(curr), Number(args[0]))
    }

    if (fn === '+') {
      if (args.length === 0)
        return 0
      const hasString = args.some(a => isStringLike(a))
      if (hasString) {
        return args.map(a => String(a ?? '')).join('')
      }
      return args.reduce((acc, curr) => acc + Number(curr), 0)
    }

    if (fn === '*') {
      return args.reduce((acc, curr) => acc * Number(curr), 1)
    }

    if (fn === '/') {
      return args.slice(1).reduce((acc, curr) => {
        const d = Number(curr)
        if (d === 0)
          throw new BloggerDivisionByZeroError('Division by zero in functional operator /')
        return acc / d
      }, Number(args[0]))
    }

    if (fn === 'resizeImage') {
      return resizeImage(args[0], args[1], args[2])
    }

    if (fn === 'sourceSet') {
      return sourceSet(args[0], args[1], args[2])
    }

    if (fn === 'params') {
      return params(args[0], args[1])
    }

    if (fn === 'appendParams') {
      return appendParams(args[0], args[1])
    }

    if (fn === 'fragment') {
      return fragment(args[0], args[1])
    }

    if (fn === 'path') {
      return path(args[0], args[1])
    }

    if (fn === 'format') {
      const locale = context.blog?.locale || (context as any)?.locale || 'en'
      const timeZone = context.blog?.timeZone || (context as any)?.timeZone
      return format(args[0], args[1], locale, timeZone)
    }

    if (fn === 'snippet') {
      return snippet(args[0], args[1])
    }

    return undefined
  }
}

export function evaluateExpression(
  exprOrNode: string | BloggerExpressionNode,
  context?: Record<string, any>,
): any {
  const evaluator = new ExpressionEvaluator()
  if (typeof exprOrNode === 'string') {
    const ast = parseExpression(exprOrNode)
    return evaluator.evaluate(ast, context || {})
  }
  return evaluator.evaluate(exprOrNode, context || {})
}
