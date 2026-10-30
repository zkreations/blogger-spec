import type {
  BloggerBinaryExpressionNode,
  BloggerCallExpressionNode,
  BloggerDataPathNode,
  BloggerExpressionNode,
  BloggerIdentifierNode,
  BloggerLiteralNode,
} from '../ast.js'
import { isTruthy } from '../type-system.js'
import { parseExpression } from './expr-parser.js'

export class BloggerDivisionByZeroError extends Error {
  constructor(message: string = 'Division by zero') {
    super(message)
    this.name = 'BloggerDivisionByZeroError'
  }
}

export function isEqual(left: any, right: any): boolean {
  if (left === right)
    return true

  // Missing / nullish equality with empty string
  if ((left === null || left === undefined) && right === '')
    return true
  if ((right === null || right === undefined) && left === '')
    return true
  if ((left === null || left === undefined) && (right === null || right === undefined))
    return true

  // Strict type rejection for array vs boolean
  if (Array.isArray(left) && typeof right === 'boolean')
    return false
  if (Array.isArray(right) && typeof left === 'boolean')
    return false

  // Strict type rejection for boolean vs number
  if (typeof left === 'boolean' && typeof right === 'number')
    return false
  if (typeof right === 'boolean' && typeof left === 'number')
    return false

  // Canonical boolean string equality
  if (typeof left === 'boolean' && typeof right === 'string') {
    if (left === true && (right === 'true' || right === 'yes'))
      return true
    if (left === false && (right === 'false' || right === 'no'))
      return true
    return false
  }
  if (typeof right === 'boolean' && typeof left === 'string') {
    if (right === true && (left === 'true' || left === 'yes'))
      return true
    if (right === false && (left === 'false' || left === 'no'))
      return true
    return false
  }

  // Canonical numeric string equality
  if (typeof left === 'number' && typeof right === 'string') {
    const num = Number(right)
    if (!Number.isNaN(num) && String(num) === right && left === num)
      return true
    return false
  }
  if (typeof right === 'number' && typeof left === 'string') {
    const num = Number(left)
    if (!Number.isNaN(num) && String(num) === left && right === num)
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

  if (isStringLike(collection)) {
    const target = item === null || item === undefined ? '' : String(item)
    return String(collection).includes(target)
  }

  if (Array.isArray(collection)) {
    return collection.some(el => isEqual(item, el))
  }

  return false
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

export function applyModifier(target: any, modifier: string): any {
  if (target === null || target === undefined)
    return undefined

  // Pre-configured custom property on object/array (e.g. mock objects in fixtures)
  if (typeof target === 'object' && modifier in target) {
    return target[modifier]
  }

  if (typeof target === 'string') {
    switch (modifier) {
      case 'length':
      case 'size':
        return target.length
      case 'escaped':
        return escapeHtml(target)
      case 'jsEscaped':
        return escapeJs(target)
      case 'jsonEscaped':
        return escapeJson(target)
      case 'cssEscaped':
        return escapeCss(target)
      case 'canonical': {
        const withoutQuery = target.split('?')[0]
        return withoutQuery.split('#')[0]
      }
      case 'http':
        return target.replace(/^https:/i, 'http:')
      case 'https':
        return target.replace(/^http:/i, 'https:')
      case 'isResizable':
        return /googleusercontent\.com|blogspot\.com|ggpht\.com/i.test(target)
      case 'isYouTube':
        return /youtube\.com|ytimg\.com/i.test(target)
      case 'youtubeMaxResDefaultUrl':
        return false
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

export function resizeImage(url: any, size: any, ratio?: string): any {
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

  if (ratio) {
    const parts = ratio.split(':').map(Number)
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

export function sourceSet(url: any, sizes: any, ratio?: string): string {
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

export function snippet(text: any, options?: any): string {
  const clean = String(text ?? '')
    .replace(/<[^>]+>/g, '')
    .trim()
  const len = options?.length ?? 100
  const ellipsis = options?.ellipsis ?? true

  if (clean.length > len) {
    if (ellipsis) {
      const cut = clean.slice(0, Math.max(0, len - 1))
      return `${cut}\u2026`
    }
    return clean.slice(0, len)
  }
  return clean
}

export function format(dateVal: any, pattern: string): string {
  if (dateVal === null || dateVal === undefined)
    return ''

  const str = String(dateVal)
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2}))?/)
  if (m) {
    const y = m[1]
    const mo = m[2]
    const d = m[3]
    if (pattern === 'yyyy')
      return y
    if (pattern === 'yyyy-MM-dd')
      return `${y}-${mo}-${d}`
    return pattern
      .replace(/yyyy/g, y)
      .replace(/MM/g, mo)
      .replace(/dd/g, d)
  }

  const d = new Date(dateVal)
  if (Number.isNaN(d.getTime()))
    return str
  const y = String(d.getUTCFullYear())
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
  const da = String(d.getUTCDate()).padStart(2, '0')

  if (pattern === 'yyyy')
    return y
  if (pattern === 'yyyy-MM-dd')
    return `${y}-${mo}-${da}`
  return pattern
    .replace(/yyyy/g, y)
    .replace(/MM/g, mo)
    .replace(/dd/g, da)
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

        if (typeof obj === 'object' && propName in obj) {
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

      if (typeof current === 'object' && propKey in current) {
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

    if (op === '==' || op === '!=' || op === 'eq' || op === 'ne') {
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

    if (op === '<' || op === 'lt' || op === '>' || op === 'gt' || op === '<=' || op === 'le' || op === 'lte' || op === '>=' || op === 'ge' || op === 'gte') {
      const leftVal = this.evaluate(node.left, context, locals)
      const rightVal = this.evaluate(node.right, context, locals)
      if (op === '<' || op === 'lt')
        return leftVal < rightVal
      if (op === '>' || op === 'gt')
        return leftVal > rightVal
      if (op === '<=' || op === 'le' || op === 'lte')
        return leftVal <= rightVal
      if (op === '>=' || op === 'ge' || op === 'gte')
        return leftVal >= rightVal
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
      const leftVal = this.evaluate(node.left, context, locals)
      const rightVal = this.evaluate(node.right, context, locals)
      return resizeImage(leftVal, rightVal)
    }

    if (op === 'sourceSet') {
      const leftVal = this.evaluate(node.left, context, locals)
      const rightVal = this.evaluate(node.right, context, locals)
      return sourceSet(leftVal, rightVal)
    }

    if (op === 'format') {
      const leftVal = this.evaluate(node.left, context, locals)
      const rightVal = this.evaluate(node.right, context, locals)
      return format(leftVal, String(rightVal))
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
      return args[0] < args[1]
    }

    if (fn === 'gt') {
      return args[0] > args[1]
    }

    if (fn === 'le' || fn === 'lte') {
      return args[0] <= args[1]
    }

    if (fn === 'ge' || fn === 'gte') {
      return args[0] >= args[1]
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
      return format(args[0], args[1])
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
