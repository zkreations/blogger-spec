import type {
  BloggerAttributeNode,
  BloggerDirectiveNode,
  BloggerDocumentNode,
  BloggerElementNode,
  BloggerExpressionNode,
  BloggerSourceLocation,
  BloggerSourcePosition,
  BloggerTemplateDiagnostic,
  BloggerTemplateNode,
} from '../ast.js'
import type { SpecCatalog } from '../catalogs/index.js'
import type { BloggerDirectiveName } from '../types.js'
import { getSpecCatalog } from '../catalogs/index.js'
import { parseAttributes } from './directive-scanner.js'
import { parseExpression } from './expr-parser.js'

export class BloggerTemplateSyntaxError extends Error {
  readonly line: number
  readonly column: number
  readonly offset: number

  constructor(message: string, position: BloggerSourcePosition) {
    super(`${message} (at line ${position.line}, column ${position.column})`)
    this.name = 'BloggerTemplateSyntaxError'
    this.line = position.line
    this.column = position.column
    this.offset = position.offset ?? 0
  }
}

export interface BloggerParseTemplateOptions {
  /**
   * Spec catalog instance (defaults to canonical catalog).
   */
  catalog?: SpecCatalog
  /**
   * Whether to parse expression attributes (`expr:*`, `cond`, `values`, etc.) into Expression AST.
   * Defaults to true.
   */
  parseExpressions?: boolean
  /**
   * If true, syntax errors do not throw immediately; instead diagnostics are recorded on BloggerDocumentNode.
   * Defaults to false (strict canonical Blogger XML mode).
   */
  tolerant?: boolean
}

function computeLineOffsets(text: string): number[] {
  const offsets = [0]
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10 /* '\n' */) {
      offsets.push(i + 1)
    }
  }
  return offsets
}

function getPositionAt(offset: number, lineOffsets: number[]): BloggerSourcePosition {
  let low = 0
  let high = lineOffsets.length - 1
  while (low <= high) {
    const mid = (low + high) >> 1
    if (lineOffsets[mid]! <= offset) {
      low = mid + 1
    }
    else {
      high = mid - 1
    }
  }
  const line = high + 1
  const lineStart = lineOffsets[high]!
  const column = offset - lineStart + 1
  return { line, column, offset }
}

const ENTITY_REF_REGEX = /^&([a-z_:][\w.:-]*|#\d+|#x[\da-f]+);/i

function checkEntities(
  text: string,
  baseOffset: number,
  lineOffsets: number[],
  diagnostics: BloggerTemplateDiagnostic[],
  tolerant: boolean,
): void {
  let idx = text.indexOf('&')
  while (idx !== -1) {
    const slice = text.slice(idx)
    const match = slice.match(ENTITY_REF_REGEX)
    if (!match) {
      const pos = getPositionAt(baseOffset + idx, lineOffsets)
      const msg = 'The entity name must immediately follow the \'&\' in the entity reference.'
      if (tolerant) {
        diagnostics.push({ message: msg, line: pos.line, column: pos.column, offset: pos.offset ?? 0 })
      }
      else {
        throw new BloggerTemplateSyntaxError(msg, pos)
      }
    }
    const step = match ? match[0].length : 1
    idx = text.indexOf('&', idx + step)
  }
}

export function parseTemplate(
  xml: string,
  options?: BloggerParseTemplateOptions,
): BloggerDocumentNode {
  const catalog = options?.catalog ?? getSpecCatalog()
  const parseExpressions = options?.parseExpressions ?? true
  const tolerant = options?.tolerant ?? false

  const lineOffsets = computeLineOffsets(xml)
  const len = xml.length
  let cursor = 0

  const rootChildren: BloggerTemplateNode[] = []
  const elementStack: Array<BloggerDirectiveNode | BloggerElementNode> = []
  const diagnostics: BloggerTemplateDiagnostic[] = []
  let xmlDeclaration: string | undefined
  let doctype: string | undefined

  function appendChild(node: BloggerTemplateNode): void {
    if (elementStack.length > 0) {
      (elementStack[elementStack.length - 1]!.children as BloggerTemplateNode[]).push(node)
    }
    else {
      rootChildren.push(node)
    }
  }

  while (cursor < len) {
    const nextLt = xml.indexOf('<', cursor)
    if (nextLt === -1) {
      if (cursor < len) {
        const textVal = xml.slice(cursor)
        checkEntities(textVal, cursor, lineOffsets, diagnostics, tolerant)
        appendChild({
          type: 'Text',
          value: textVal,
          loc: {
            start: getPositionAt(cursor, lineOffsets),
            end: getPositionAt(len, lineOffsets),
          },
        })
      }
      break
    }

    if (nextLt > cursor) {
      const textVal = xml.slice(cursor, nextLt)
      checkEntities(textVal, cursor, lineOffsets, diagnostics, tolerant)
      appendChild({
        type: 'Text',
        value: textVal,
        loc: {
          start: getPositionAt(cursor, lineOffsets),
          end: getPositionAt(nextLt, lineOffsets),
        },
      })
      cursor = nextLt
    }

    // 1. Comments: <!-- ... -->
    if (xml.startsWith('<!--', cursor)) {
      const end = xml.indexOf('-->', cursor + 4)
      if (end === -1) {
        const pos = getPositionAt(cursor, lineOffsets)
        const msg = 'Unclosed XML comment.'
        if (tolerant) {
          diagnostics.push({ message: msg, line: pos.line, column: pos.column, offset: pos.offset ?? 0 })
          appendChild({
            type: 'Comment',
            value: xml.slice(cursor + 4),
            loc: { start: pos, end: getPositionAt(len, lineOffsets) },
          })
          break
        }
        throw new BloggerTemplateSyntaxError(msg, pos)
      }
      appendChild({
        type: 'Comment',
        value: xml.slice(cursor + 4, end),
        loc: {
          start: getPositionAt(cursor, lineOffsets),
          end: getPositionAt(end + 3, lineOffsets),
        },
      })
      cursor = end + 3
      continue
    }

    // 2. CDATA: <![CDATA[ ... ]]>
    if (xml.startsWith('<![CDATA[', cursor)) {
      const end = xml.indexOf(']]>', cursor + 9)
      if (end === -1) {
        const pos = getPositionAt(cursor, lineOffsets)
        const msg = 'Unclosed CDATA section.'
        if (tolerant) {
          diagnostics.push({ message: msg, line: pos.line, column: pos.column, offset: pos.offset ?? 0 })
          appendChild({
            type: 'CData',
            value: xml.slice(cursor + 9),
            loc: { start: pos, end: getPositionAt(len, lineOffsets) },
          })
          break
        }
        throw new BloggerTemplateSyntaxError(msg, pos)
      }
      appendChild({
        type: 'CData',
        value: xml.slice(cursor + 9, end),
        loc: {
          start: getPositionAt(cursor, lineOffsets),
          end: getPositionAt(end + 3, lineOffsets),
        },
      })
      cursor = end + 3
      continue
    }

    // 3. Processing instructions: <? ... ?>
    if (xml.startsWith('<?', cursor)) {
      const end = xml.indexOf('?>', cursor + 2)
      if (end === -1) {
        const pos = getPositionAt(cursor, lineOffsets)
        const msg = 'Unclosed XML processing instruction.'
        if (tolerant) {
          diagnostics.push({ message: msg, line: pos.line, column: pos.column, offset: pos.offset ?? 0 })
          break
        }
        throw new BloggerTemplateSyntaxError(msg, pos)
      }
      const pi = xml.slice(cursor, end + 2)
      if (pi.startsWith('<?xml')) {
        xmlDeclaration = pi
      }
      cursor = end + 2
      continue
    }

    // 4. DOCTYPE: <!DOCTYPE ...> or <!doctype ...>
    if (xml.startsWith('<!DOCTYPE', cursor) || xml.startsWith('<!doctype', cursor)) {
      let end = cursor + 9
      let hasSubset = false
      while (end < len) {
        const ch = xml[end]
        if (ch === '[') {
          hasSubset = true
        }
        else if (ch === ']' && hasSubset) {
          hasSubset = false
        }
        else if (ch === '>' && !hasSubset) {
          break
        }
        end++
      }
      if (end >= len) {
        const pos = getPositionAt(cursor, lineOffsets)
        const msg = 'Unclosed DOCTYPE declaration.'
        if (tolerant) {
          diagnostics.push({ message: msg, line: pos.line, column: pos.column, offset: pos.offset ?? 0 })
          break
        }
        throw new BloggerTemplateSyntaxError(msg, pos)
      }
      doctype = xml.slice(cursor, end + 1)
      cursor = end + 1
      continue
    }

    // 5. Closing tag: </tagName>
    if (xml.startsWith('</', cursor)) {
      const closeGt = xml.indexOf('>', cursor + 2)
      if (closeGt === -1) {
        const pos = getPositionAt(cursor, lineOffsets)
        const msg = 'Unclosed end tag.'
        if (tolerant) {
          diagnostics.push({ message: msg, line: pos.line, column: pos.column, offset: pos.offset ?? 0 })
          break
        }
        throw new BloggerTemplateSyntaxError(msg, pos)
      }
      const closeTagName = xml.slice(cursor + 2, closeGt).trim()
      const tagEnd = closeGt + 1
      const pos = getPositionAt(cursor, lineOffsets)

      if (elementStack.length === 0) {
        const msg = `Unexpected closing tag '</${closeTagName}>'.`
        if (tolerant) {
          diagnostics.push({ message: msg, line: pos.line, column: pos.column, offset: pos.offset ?? 0 })
          cursor = tagEnd
          continue
        }
        throw new BloggerTemplateSyntaxError(msg, pos)
      }

      const top = elementStack[elementStack.length - 1]!
      const topFullName = top.type === 'Directive'
        ? top.name
        : (top.namespace ? `${top.namespace}:${top.name}` : top.name)

      if (topFullName !== closeTagName) {
        const msg = `The element type '${topFullName}' must be terminated by the matching end-tag '</${topFullName}>'.`
        if (tolerant) {
          diagnostics.push({ message: msg, line: pos.line, column: pos.column, offset: pos.offset ?? 0 })
          let matchIndex = -1
          for (let s = elementStack.length - 2; s >= 0; s--) {
            const ancestor = elementStack[s]!
            const ancFullName = ancestor.type === 'Directive'
              ? ancestor.name
              : (ancestor.namespace ? `${ancestor.namespace}:${ancestor.name}` : ancestor.name)
            if (ancFullName === closeTagName) {
              matchIndex = s
              break
            }
          }
          if (matchIndex !== -1) {
            elementStack.splice(matchIndex)
          }
          cursor = tagEnd
          continue
        }
        throw new BloggerTemplateSyntaxError(msg, pos)
      }

      elementStack.pop()
      ;(top as any).loc = {
        start: top.loc?.start ?? pos,
        end: getPositionAt(tagEnd, lineOffsets),
      }
      cursor = tagEnd
      continue
    }

    // 6. Open or Self-closing tag: <tagName ...>
    let nameEnd = cursor + 1
    while (nameEnd < len && /[\w:.-]/.test(xml[nameEnd]!)) {
      nameEnd++
    }

    if (nameEnd === cursor + 1) {
      const pos = getPositionAt(cursor, lineOffsets)
      const msg = 'Invalid XML character \'<\'.'
      if (tolerant) {
        diagnostics.push({ message: msg, line: pos.line, column: pos.column, offset: pos.offset ?? 0 })
        cursor++
        continue
      }
      throw new BloggerTemplateSyntaxError(msg, pos)
    }

    const tagName = xml.slice(cursor + 1, nameEnd)

    let inQuote: '"' | '\'' | null = null
    let tagEnd = -1
    for (let j = nameEnd; j < len; j++) {
      const c = xml[j]
      if (inQuote) {
        if (c === inQuote) {
          inQuote = null
        }
      }
      else {
        if (c === '"' || c === '\'') {
          inQuote = c
        }
        else if (c === '>') {
          tagEnd = j
          break
        }
      }
    }

    if (tagEnd === -1) {
      const pos = getPositionAt(cursor, lineOffsets)
      const msg = `Unclosed opening tag '<${tagName}'.`
      if (tolerant) {
        diagnostics.push({ message: msg, line: pos.line, column: pos.column, offset: pos.offset ?? 0 })
        break
      }
      throw new BloggerTemplateSyntaxError(msg, pos)
    }

    const rawAttrsContent = xml.slice(nameEnd, tagEnd)
    const hasSlash = rawAttrsContent.trimEnd().endsWith('/')
    const isVoidElement = catalog.getHtmlVoidElements().has(tagName.toLowerCase())

    if (isVoidElement && !hasSlash) {
      const afterTag = xml.slice(tagEnd + 1)
      const expectedEndTag = `</${tagName}>`
      const trimmedAfter = afterTag.trimStart()
      if (!trimmedAfter.toLowerCase().startsWith(expectedEndTag.toLowerCase())) {
        const pos = getPositionAt(cursor, lineOffsets)
        const msg = `The element type '${tagName}' must be terminated by the matching end-tag '</${tagName}>'.`
        if (tolerant) {
          diagnostics.push({ message: msg, line: pos.line, column: pos.column, offset: pos.offset ?? 0 })
        }
        else {
          throw new BloggerTemplateSyntaxError(msg, pos)
        }
      }
    }

    const cleanAttrsText = hasSlash
      ? rawAttrsContent.slice(0, rawAttrsContent.lastIndexOf('/'))
      : rawAttrsContent

    const parsedAttrs = parseAttributes(cleanAttrsText, nameEnd)
    const attributes: BloggerAttributeNode[] = []

    for (const attr of Object.values(parsedAttrs)) {
      checkEntities(attr.value, attr.valueStart, lineOffsets, diagnostics, tolerant)
      const isExpr = attr.name.startsWith('expr:') || catalog.isDirectiveExpressionAttribute(tagName, attr.name)
      let attrVal: string | BloggerExpressionNode = attr.value
      if (isExpr && parseExpressions) {
        try {
          attrVal = parseExpression(attr.value, { catalog, tolerant })
        }
        catch (err) {
          if (tolerant) {
            attrVal = attr.value
          }
          else {
            throw err
          }
        }
      }
      attributes.push({
        type: 'Attribute',
        name: attr.name,
        value: attrVal,
        isExpression: isExpr,
        quote: attr.quote,
        loc: {
          start: getPositionAt(attr.start, lineOffsets),
          end: getPositionAt(attr.end, lineOffsets),
        },
      })
    }

    const isDirective = tagName.startsWith('b:') || tagName.startsWith('data:')
    const loc: BloggerSourceLocation = {
      start: getPositionAt(cursor, lineOffsets),
      end: getPositionAt(tagEnd + 1, lineOffsets),
    }

    if (isDirective) {
      const node: BloggerDirectiveNode = {
        type: 'Directive',
        name: tagName as BloggerDirectiveName,
        attributes,
        children: [],
        selfClosing: hasSlash,
        loc,
      }
      appendChild(node)
      if (!hasSlash) {
        elementStack.push(node)
      }
    }
    else {
      let namespace: string | undefined
      let localName = tagName
      if (tagName.includes(':')) {
        const colonIdx = tagName.indexOf(':')
        namespace = tagName.slice(0, colonIdx)
        localName = tagName.slice(colonIdx + 1)
      }
      const node: BloggerElementNode = {
        type: 'Element',
        name: localName,
        namespace,
        attributes,
        children: [],
        selfClosing: hasSlash,
        loc,
      }
      appendChild(node)
      if (!hasSlash) {
        elementStack.push(node)
      }
    }

    cursor = tagEnd + 1
  }

  if (elementStack.length > 0) {
    const top = elementStack[elementStack.length - 1]!
    const topFullName = top.type === 'Directive'
      ? top.name
      : (top.namespace ? `${top.namespace}:${top.name}` : top.name)
    const pos = top.loc?.start ?? getPositionAt(len, lineOffsets)
    const msg = `The element type '${topFullName}' must be terminated by the matching end-tag '</${topFullName}>'.`
    if (tolerant) {
      diagnostics.push({ message: msg, line: pos.line, column: pos.column, offset: pos.offset ?? 0 })
    }
    else {
      throw new BloggerTemplateSyntaxError(msg, pos)
    }
  }

  return {
    type: 'Document',
    children: rootChildren,
    xmlDeclaration,
    doctype,
    diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    loc: {
      start: getPositionAt(0, lineOffsets),
      end: getPositionAt(len, lineOffsets),
    },
  }
}
