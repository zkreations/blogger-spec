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

export function evaluateBinarySnippet(leftVal: any, rightVal: any): string {
  return snippet(leftVal, rightVal)
}

export function evaluateCallSnippet(args: any[]): string {
  return snippet(args[0], args[1])
}
