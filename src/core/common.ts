/**
 * Blogger Spec Core Utilities
 * Universal, zero-dependency helper functions for deep merging, truthiness coercion, and data path traversal.
 */

/**
 * Normalizes a Blogger data path into individual dot-separated property segments,
 * stripping bracket indexers (e.g. `links[0].title` -> `['links', '0', 'title']`).
 *
 * @param path Single path string or array of path segments.
 * @param options Configuration options.
 * @param options.preserveDataNamespace If true, preserves leading `data:property` as a unified segment.
 */
export function parseBloggerDataPath(
  path: string | readonly string[],
  options?: { preserveDataNamespace?: boolean },
): string[] {
  const preserve = options?.preserveDataNamespace ?? false

  if (typeof path !== 'string') {
    const result: string[] = []
    for (const item of path) {
      if (!item)
        continue
      const parts = String(item)
        .replace(/\[['"]?([^'"\]]+)['"]?\]/g, '.$1')
        .split('.')
        .map(s => s.trim())
        .filter(Boolean)
      result.push(...parts)
    }
    if (preserve && result.length > 1 && result[0] === 'data') {
      result.splice(0, 2, `data:${result[1]}`)
    }
    else if (!preserve && result.length > 0 && result[0]!.startsWith('data:')) {
      const rest = result[0]!.slice(5)
      if (rest) {
        result[0] = rest
      }
      else {
        result.shift()
      }
    }
    return result
  }

  const raw = path.trim()
  if (!raw) {
    return []
  }

  const clean = !preserve && raw.startsWith('data:') ? raw.slice(5) : raw
  const normalized = clean.replace(/\[['"]?([^'"\]]+)['"]?\]/g, '.$1')
  const segments = normalized.split('.').map(s => s.trim()).filter(Boolean)

  if (preserve && segments.length > 1 && segments[0] === 'data') {
    segments.splice(0, 2, `data:${segments[1]}`)
  }

  return segments
}

/**
 * Safely reads a value from a nested data structure using a Blogger data path.
 */
export function getDeepProperty<T = unknown>(target: unknown, path: string | readonly string[]): T | undefined {
  if (target === null || target === undefined || typeof target !== 'object') {
    return undefined
  }

  const segments = parseBloggerDataPath(path)
  if (segments.length === 0) {
    return undefined
  }

  let current: any = target
  for (const seg of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = current[seg]
  }

  return current as T
}

/**
 * Traverses a nested target object or array and sets a deep property value,
 * automatically instantiating intermediate objects or arrays as needed.
 */
export function setDeepProperty(target: Record<string, any>, path: string | readonly string[], value: unknown): void {
  if (!target || typeof target !== 'object') {
    return
  }

  const segments = parseBloggerDataPath(path)
  if (segments.length === 0) {
    return
  }

  let current: any = target
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!
    const nextSeg = segments[i + 1]!
    const isNextNumeric = /^\d+$/.test(nextSeg)

    if (current[seg] === null || current[seg] === undefined || typeof current[seg] !== 'object') {
      current[seg] = isNextNumeric ? [] : {}
    }
    current = current[seg]
  }

  const leafSeg = segments[segments.length - 1]!
  if (Array.isArray(current)) {
    const idx = Number(leafSeg)
    if (!Number.isNaN(idx)) {
      current[idx] = value
    }
  }
  else {
    current[leafSeg] = value
  }
}

/**
 * Canonical Blogger truthiness evaluation for attributes and directives.
 * Blogger boolean attributes accept exactly 4 values: yes, no, true, false.
 * Only `true`, `'true'`, and `'yes'` (or objects unwrapping to them) are considered truthy.
 */
export function isBloggerTruthy(val: unknown): boolean {
  if (val === true || val === 'true' || val === 'yes') {
    return true
  }
  if (typeof val === 'object' && val !== null && 'value' in val) {
    const inner = (val as any).value
    return inner === true || inner === 'true' || inner === 'yes'
  }
  return false
}

/**
 * Recursively merges source properties into target producing a new object without mutating inputs.
 * Arrays and nested objects are cloned cleanly.
 */
export function pureDeepMerge<T>(target: T[], source: unknown): any[]
export function pureDeepMerge<T>(target: T, source: unknown): T
export function pureDeepMerge(target: any, source: unknown): any {
  if (!source || typeof source !== 'object') {
    return target
  }
  if (!target || typeof target !== 'object') {
    return Array.isArray(source) ? source.slice() : { ...source }
  }

  const result: any = Array.isArray(target) ? target.slice() : { ...target }

  for (const key of Object.keys(source as Record<string, any>)) {
    const val = (source as any)[key]
    if (val === undefined)
      continue

    if (Array.isArray(val)) {
      result[key] = val.slice()
    }
    else if (val && typeof val === 'object') {
      result[key] = pureDeepMerge(result[key] || {}, val)
    }
    else {
      result[key] = val
    }
  }

  return result
}
