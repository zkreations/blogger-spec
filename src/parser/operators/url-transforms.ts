export function appendParams(url: any, paramsMap: any): string {
  const urlStr = String(url ?? '')
  const [baseAndQuery, hash] = urlStr.split('#')
  const [base, existingQuery] = baseAndQuery.split('?')

  const existingOrder: string[] = []
  const paramsMapInternal = new Map<string, string>()

  if (existingQuery) {
    for (const part of existingQuery.split('&')) {
      if (!part)
        continue
      const [k, v] = part.split('=')
      const decodedKey = decodeURIComponent(k)
      if (!paramsMapInternal.has(decodedKey)) {
        existingOrder.push(decodedKey)
      }
      paramsMapInternal.set(decodedKey, decodeURIComponent(v || ''))
    }
  }

  const newKeys: string[] = []
  for (const [k, v] of Object.entries(paramsMap || {})) {
    if (paramsMapInternal.has(k)) {
      paramsMapInternal.set(k, String(v))
    }
    else {
      newKeys.push(k)
      paramsMapInternal.set(k, String(v))
    }
  }

  newKeys.sort()

  const finalKeys = [...existingOrder, ...newKeys]
  const query = finalKeys
    .map((k) => {
      const val = paramsMapInternal.get(k) || ''
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

export function evaluateBinaryUrlTransform(op: string, leftVal: any, rightVal: any): string | undefined {
  if (op === 'params') {
    return params(leftVal, rightVal)
  }
  if (op === 'appendParams') {
    return appendParams(leftVal, rightVal)
  }
  if (op === 'fragment') {
    return fragment(leftVal, rightVal)
  }
  if (op === 'path') {
    return path(leftVal, rightVal)
  }
  return undefined
}

export function evaluateCallUrlTransform(fn: string, args: any[]): string | undefined {
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
  return undefined
}
