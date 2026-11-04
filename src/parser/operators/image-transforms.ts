import type { BloggerBinaryExpressionNode } from '../../ast.js'
import type { OperatorContext } from './types.js'

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
    const sortedSizes = [...size].sort((a, b) => Number(a) - Number(b))
    return sortedSizes.map(s => ({
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

export function evaluateBinaryImageTransform(
  node: BloggerBinaryExpressionNode,
  ctx: OperatorContext,
): any {
  const op = node.operator

  if (op === 'resizeImage') {
    if (node.left.type === 'BinaryExpression' && node.left.operator === 'resizeImage') {
      const imgVal = ctx.evaluate(node.left.left, ctx.locals)
      const sizeVal = ctx.evaluate(node.left.right, ctx.locals)
      const ratioVal = ctx.evaluate(node.right, ctx.locals)
      return resizeImage(imgVal, sizeVal, ratioVal != null ? String(ratioVal) : undefined)
    }
    const leftVal = ctx.evaluate(node.left, ctx.locals)
    const rightVal = ctx.evaluate(node.right, ctx.locals)
    return resizeImage(leftVal, rightVal)
  }

  if (op === 'sourceSet') {
    if (node.left.type === 'BinaryExpression' && node.left.operator === 'sourceSet') {
      const imgVal = ctx.evaluate(node.left.left, ctx.locals)
      const sizesVal = ctx.evaluate(node.left.right, ctx.locals)
      const ratioVal = ctx.evaluate(node.right, ctx.locals)
      return sourceSet(imgVal, sizesVal, ratioVal != null ? String(ratioVal) : undefined)
    }
    const leftVal = ctx.evaluate(node.left, ctx.locals)
    const rightVal = ctx.evaluate(node.right, ctx.locals)
    return sourceSet(leftVal, rightVal)
  }

  return undefined
}

export function evaluateCallImageTransform(fn: string, args: any[]): any {
  if (fn === 'resizeImage') {
    return resizeImage(args[0], args[1], args[2])
  }
  if (fn === 'sourceSet') {
    return sourceSet(args[0], args[1], args[2])
  }
  return undefined
}
