import { getSpecCatalog } from '../../catalogs/index.js'

function normalizeSnippetWhitespace(str: string, linebreaks: boolean): string {
  const normalizedBreaks = str.replace(/\r\n?/g, '\n')
  if (!linebreaks) {
    return normalizedBreaks.replace(/[ \t]*\n+[ \t]*/g, ' ')
  }
  return normalizedBreaks
}

export function snippet(text: any, options?: any): string {
  const snippetsConfig = getSpecCatalog().getBlogSnippets()
  const maxLen = snippetsConfig?.longLengthMax ?? 1000
  const hasExplicitLen = options?.length !== undefined
  const rawLen = hasExplicitLen ? Number(options.length) : Infinity
  const len = Number.isFinite(rawLen) ? Math.min(maxLen, Math.max(50, Math.floor(rawLen))) : Infinity
  const links = options?.links !== undefined ? Boolean(options.links) : true
  const linebreaks = options?.linebreaks !== undefined ? Boolean(options.linebreaks) : true
  const ellipsis = options?.ellipsis !== undefined ? Boolean(options.ellipsis) : true

  const source = String(text ?? '').replace(/<br\s*\/?>/gi, '\n')

  if (!links) {
    const clean = normalizeSnippetWhitespace(source.replace(/<[^>]+>/g, ''), linebreaks).trim()
    if (clean.length > len) {
      return ellipsis ? `${clean.slice(0, Math.max(0, len - 1))}\u2026` : clean.slice(0, len)
    }
    return clean
  }

  const stripRegex = /<(?!(\/)?(strong|em|[abiu])\b)[^>]+>/gi
  const tokenRegex = /(<(\/)?(strong|em|[abiu])\b[^>]*>)/gi

  const strippedOtherTags = source.replace(stripRegex, '')
  const trimmed = normalizeSnippetWhitespace(strippedOtherTags, linebreaks).trim()

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
  const openTags: string[] = []
  let out = ''
  for (const seg of segments) {
    if (seg.isTag) {
      const tagMatch = /^<(\/)?([a-z0-9]+)/i.exec(seg.value)
      if (tagMatch) {
        const isClosing = Boolean(tagMatch[1])
        const tagName = tagMatch[2]!.toLowerCase()
        if (isClosing) {
          const idx = openTags.lastIndexOf(tagName)
          if (idx !== -1) {
            out += seg.value
            openTags.splice(idx, 1)
          }
        }
        else if (remaining > 0) {
          out += seg.value
          openTags.push(tagName)
        }
      }
    }
    else if (remaining > 0) {
      const slice = seg.value.slice(0, remaining)
      out += slice
      remaining -= slice.length
    }
  }
  while (openTags.length > 0) {
    const tag = openTags.pop()
    out += `</${tag}>`
  }
  return ellipsis ? `${out}\u2026` : out
}

export function evaluateBinarySnippet(leftVal: any, rightVal: any): string {
  return snippet(leftVal, rightVal)
}

export function evaluateCallSnippet(args: any[]): string {
  return snippet(args[0], args[1])
}
