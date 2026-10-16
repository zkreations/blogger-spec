/* eslint-disable import/no-mutable-exports */
import type { BloggerAttributeNode, BloggerDirectiveNode } from '../ast.js'
import type { SpecCatalog } from '../catalogs/index.js'
import type {
  BloggerDirectiveAttributeToken,
  BloggerDirectiveName,
  BloggerDirectiveToken,
  ScanDirectiveOptions,
} from '../types.js'

import { getSpecCatalog, registerCacheResetListener } from '../catalogs/index.js'

export type {
  BloggerDirectiveAttributeToken,
  BloggerDirectiveToken,
  ScanDirectiveOptions,
}

function getCanonicalSelfClosingTags(catalog: SpecCatalog = getSpecCatalog()): Set<string> {
  const result = new Set<string>()
  const directives = catalog.getAllDirectives()
  for (const [name, def] of Object.entries(directives)) {
    if (def.self_closing || def.closure_mode === 'self_closing' || (def as any).grammar?.self_closing) {
      if (name !== 'data:*') {
        result.add(name)
      }
    }
  }
  return result
}

function getCanonicalHtmlVoidElements(catalog: SpecCatalog = getSpecCatalog()): ReadonlySet<string> {
  return catalog.getHtmlVoidElements()
}

export let BLOGGER_STRICTLY_SELF_CLOSING_TAGS: ReadonlySet<string> = getCanonicalSelfClosingTags()

export let STRICTLY_SELF_CLOSING_TAGS = BLOGGER_STRICTLY_SELF_CLOSING_TAGS
export let STRICTLY_SELF_CLOSING_BLOGGER_TAGS = BLOGGER_STRICTLY_SELF_CLOSING_TAGS

export let HTML_VOID_ELEMENTS: ReadonlySet<string> = getCanonicalHtmlVoidElements()

registerCacheResetListener(() => {
  try {
    const spec = getSpecCatalog()
    BLOGGER_STRICTLY_SELF_CLOSING_TAGS = getCanonicalSelfClosingTags(spec)
    STRICTLY_SELF_CLOSING_TAGS = BLOGGER_STRICTLY_SELF_CLOSING_TAGS
    STRICTLY_SELF_CLOSING_BLOGGER_TAGS = BLOGGER_STRICTLY_SELF_CLOSING_TAGS
    HTML_VOID_ELEMENTS = getCanonicalHtmlVoidElements(spec)
  }
  catch {
    // Retain defaults if the active store does not have directives
  }
})

export function isStrictlySelfClosingTag(tagName: string, catalog: SpecCatalog = getSpecCatalog()): boolean {
  const lower = tagName.toLowerCase()
  if (lower === 'data:' || lower.startsWith('data:')) {
    return true
  }
  if (catalog.isSelfClosingDirective(tagName) || catalog.isSelfClosingDirective(lower)) {
    return true
  }
  const voidElements = catalog.getHtmlVoidElements()
  if (voidElements.has(lower)) {
    return true
  }
  return BLOGGER_STRICTLY_SELF_CLOSING_TAGS.has(tagName)
    || BLOGGER_STRICTLY_SELF_CLOSING_TAGS.has(lower)
    || HTML_VOID_ELEMENTS.has(lower)
}

export function maskCdataBlock(match: string, catalog: SpecCatalog = getSpecCatalog()): string {
  const cdataTags = catalog.getCdataDirectives()
  const hasTag = cdataTags.some(tag => match.includes(`<${tag}`) || match.includes(`</${tag}`))
  if (!hasTag) {
    return match.replace(/[^\r\n]/g, ' ')
  }

  const prefixLen = '<![CDATA['.length
  const suffixLen = ']]>'.length
  const inner = match.slice(prefixLen, match.length - suffixLen)

  const prefixSpaces = ' '.repeat(prefixLen)
  const suffixSpaces = ' '.repeat(suffixLen)

  const pattern = cdataTags.join('|')
  const tagRegex = new RegExp(`<\\/?(?:${pattern})\\b(?:"[^"]*"|'[^']*'|[^"'/>])*\\/?>`, 'gi')
  let maskedInner = ''
  let lastIndex = 0

  for (const tagMatch of inner.matchAll(tagRegex)) {
    const matchIndex = tagMatch.index ?? 0
    const gap = inner.slice(lastIndex, matchIndex)
    maskedInner += gap.replace(/[^\r\n]/g, ' ')
    maskedInner += tagMatch[0]
    lastIndex = matchIndex + tagMatch[0].length
  }

  const trailing = inner.slice(lastIndex)
  maskedInner += trailing.replace(/[^\r\n]/g, ' ')

  return prefixSpaces + maskedInner + suffixSpaces
}

export function maskXmlCommentsAndCdata(text: string, catalog: SpecCatalog = getSpecCatalog()): string {
  let masked = text

  if (masked.includes('<!--')) {
    masked = masked.replace(/<!--[\s\S]*?-->/g, match => match.replace(/[^\r\n]/g, ' '))
  }

  if (masked.includes('<![CDATA[')) {
    masked = masked.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, match => maskCdataBlock(match, catalog))
  }

  if (masked.includes('<b:comment')) {
    masked = masked.replace(/<b:comment\b[^>]*>[\s\S]*?<\/b:comment>/gi, match => match.replace(/[^\r\n]/g, ' '))
  }

  return masked
}

const ATTR_PARSER_REGEX = /([\w:-]+)(?:\s*=\s*(?:(")([\s\S]*?)(")|(')([\s\S]*?)(')|([^\s"'=<>`]+)))?/g

export function parseAttributes(
  attributesText: string,
  baseOffset: number,
): Record<string, BloggerDirectiveAttributeToken> {
  const result: Record<string, BloggerDirectiveAttributeToken> = {}
  if (!attributesText.trim()) {
    return result
  }

  ATTR_PARSER_REGEX.lastIndex = 0
  for (const match of attributesText.matchAll(ATTR_PARSER_REGEX)) {
    const attrName = match[1]
    if (!attrName || match.index === undefined) {
      continue
    }

    const start = baseOffset + match.index
    const end = start + match[0].length

    let value = ''
    let quote: '"' | '\'' | undefined
    let valueStart = end
    let valueEnd = end

    if (match[2] !== undefined && match[4] !== undefined) {
      quote = '"'
      value = match[3] ?? ''
      const quoteOffset = match[0].indexOf('"')
      valueStart = start + quoteOffset + 1
      valueEnd = valueStart + value.length
    }
    else if (match[5] !== undefined && match[7] !== undefined) {
      quote = '\''
      value = match[6] ?? ''
      const quoteOffset = match[0].indexOf('\'')
      valueStart = start + quoteOffset + 1
      valueEnd = valueStart + value.length
    }
    else if (match[8] !== undefined) {
      value = match[8]
      const eqOffset = match[0].indexOf('=')
      valueStart = start + eqOffset + 1
      valueEnd = end
    }

    result[attrName] = {
      name: attrName,
      value,
      quote,
      start,
      end,
      valueStart,
      valueEnd,
    }
  }

  return result
}

export function scanDirectiveTokens(
  text: string,
  options?: ScanDirectiveOptions,
): readonly BloggerDirectiveToken[] {
  const maxOffset = options?.stopAtOffset ?? text.length
  const catalog = options?.catalog ?? getSpecCatalog()
  const maskedText = maskXmlCommentsAndCdata(text, catalog)
  const tokens: BloggerDirectiveToken[] = []
  const len = Math.min(maskedText.length, maxOffset)

  let i = 0
  while (i < len) {
    const openIndex = maskedText.indexOf('<', i)
    if (openIndex === -1 || openIndex >= maxOffset) {
      break
    }

    const nextChar = maskedText[openIndex + 1]
    if (!nextChar || nextChar === '!' || nextChar === '?') {
      i = openIndex + 1
      continue
    }

    const isClosing = nextChar === '/'
    const nameStart = isClosing ? openIndex + 2 : openIndex + 1

    let nameEnd = nameStart
    while (nameEnd < len && /[\w:.-]/.test(maskedText[nameEnd]!)) {
      nameEnd++
    }

    if (nameEnd === nameStart) {
      i = openIndex + 1
      continue
    }

    const tagName = maskedText.slice(nameStart, nameEnd)
    const attributesOffset = nameEnd

    let inQuote: '"' | '\'' | null = null
    let tagEnd = -1
    let j = nameEnd

    while (j < len) {
      const c = maskedText[j]
      if (inQuote) {
        if (c === inQuote) {
          inQuote = null
        }
      }
      else {
        if (c === '"' || c === '\'') {
          inQuote = c
        }
        else if (c === '<') {
          break
        }
        else if (c === '>') {
          tagEnd = j
          break
        }
      }
      j++
    }

    if (tagEnd === -1) {
      i = openIndex + 1
      continue
    }

    const rawContent = maskedText.slice(attributesOffset, tagEnd)
    const hasSelfClosingSlash = rawContent.trimEnd().endsWith('/')
    const isSelfClosing = !isClosing && (hasSelfClosingSlash || isStrictlySelfClosingTag(tagName, catalog))

    const cleanAttrsText = hasSelfClosingSlash
      ? rawContent.slice(0, rawContent.lastIndexOf('/'))
      : rawContent

    const attributes = isClosing ? {} : parseAttributes(cleanAttrsText, attributesOffset)

    tokens.push({
      tagName,
      isClosing,
      isSelfClosing,
      hasSelfClosingSlash,
      tagStart: openIndex,
      tagEnd: tagEnd + 1,
      attributesText: cleanAttrsText,
      rawAttributesText: rawContent,
      attributesOffset,
      attributes,
    })

    i = tagEnd + 1
  }

  return tokens
}

export function getUnclosedDirectiveStack(text: string, offset?: number): readonly string[] {
  let targetText = offset !== undefined ? text.slice(0, offset) : text
  // Strip trailing incomplete closing tag if present (e.g. "</b:" or "</")
  targetText = targetText.replace(/<\/([a-z_][\w:-]*)?$/i, '')

  const tokens = scanDirectiveTokens(targetText)
  const stack: string[] = []

  for (const token of tokens) {
    if (token.isClosing) {
      const lower = token.tagName.toLowerCase()
      let matchIdx = -1
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i]!.toLowerCase() === lower) {
          matchIdx = i
          break
        }
      }
      if (matchIdx !== -1) {
        stack.splice(matchIdx)
      }
    }
    else if (!token.isSelfClosing) {
      stack.push(token.tagName)
    }
  }

  return stack
}

export function getNearestUnclosedDirective(text: string, offset?: number): string | undefined {
  const stack = getUnclosedDirectiveStack(text, offset)
  return stack.length > 0 ? stack[stack.length - 1] : undefined
}

export function getUnclosedTagStack(text: string, offset?: number): string[] {
  return [...getUnclosedDirectiveStack(text, offset)]
}

export function getNearestUnclosedTag(text: string, offset?: number): string | undefined {
  return getNearestUnclosedDirective(text, offset)
}

export function directiveTokenToAstNode(
  token: BloggerDirectiveToken,
  catalog: SpecCatalog = getSpecCatalog(),
): BloggerDirectiveNode {
  const attributes: BloggerAttributeNode[] = Object.values(token.attributes).map(attr => ({
    type: 'Attribute',
    name: attr.name,
    value: attr.value,
    isExpression: catalog.isDirectiveExpressionAttribute(token.tagName, attr.name),
    loc: {
      start: { line: 0, column: 0, offset: attr.start },
      end: { line: 0, column: 0, offset: attr.end },
    },
  }))

  return {
    type: 'Directive',
    name: token.tagName as BloggerDirectiveName,
    attributes,
    children: [],
    selfClosing: token.isSelfClosing,
    loc: {
      start: { line: 0, column: 0, offset: token.tagStart },
      end: { line: 0, column: 0, offset: token.tagEnd },
    },
  }
}
