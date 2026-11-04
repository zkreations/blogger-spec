/**
 * Blogger Intermediate Representation (BIR) Lowering Engine.
 * Transforms syntactic BloggerDocumentNode AST into normalized, language-agnostic BIR.
 */

import type {
  BloggerAttributeNode,
  BloggerDirectiveNode,
  BloggerDocumentNode,
  BloggerElementNode,
  BloggerExpressionNode,
  BloggerTemplateNode,
} from '../ast.js'
import type { SpecCatalog } from '../catalogs/index.js'
import type { BloggerLayoutVersion } from '../types.js'
import type { DirectiveLowerContext } from './directives/index.js'
import type {
  BirAttribute,
  BirAttrValue,
  BirClassMutation,
  BirElement,
  BirIncludable,
  BirNode,
  BirSkin,
  BloggerIRDocument,
} from './types.js'
import { parseExpression } from '../ast.js'
import { getSpecCatalog } from '../catalogs/index.js'
import { collectDefaultMarkups } from '../includable-resolver.js'
import { unescapeXmlEntities } from '../parser/lexer.js'
import { parseTemplate } from '../parser/template-parser.js'
import { parseSkinSource } from '../skin-compiler.js'
import { detectTemplateVersion } from '../version.js'
import {
  getFlowDirectiveHandler,
  isFlowDirective,
  lowerAttrDirective,
  lowerClassDirective,
  lowerCommentDirective,
  lowerDataOutput,
  lowerDefaultMarkup,
  lowerDefaultMarkups,
  lowerEvalDirective,
  lowerIncludableDirective,
  lowerIncludeDirective,
  lowerMessageDirective,
  lowerSectionDirective,
  lowerTagDirective,
  lowerWidgetDirective,
} from './directives/index.js'

export interface BloggerLowerOptions {
  readonly catalog?: SpecCatalog
  readonly layoutVersion?: BloggerLayoutVersion
  readonly sourceXml?: string
  readonly skinOverrides?: Record<string, string>
}

type LoweringContext = DirectiveLowerContext

function isWhitespaceOnly(node: BloggerTemplateNode): boolean {
  return node.type === 'Text' && /^\s*$/.test(node.value)
}

function filterContainerChildren(nodes: readonly BloggerTemplateNode[]): BloggerTemplateNode[] {
  return nodes.filter(n => !isWhitespaceOnly(n))
}

export function isTruthyValue(val: unknown): boolean {
  if (val === true || val === 'true' || val === 'yes') {
    return true
  }
  if (typeof val === 'object' && val !== null && 'value' in val) {
    const inner = (val as any).value
    return inner === true || inner === 'true' || inner === 'yes'
  }
  return false
}

export function ensureExpression(
  val: string | BloggerExpressionNode | undefined,
  catalog: SpecCatalog,
): BloggerExpressionNode {
  if (!val) {
    return { type: 'Literal', value: null }
  }
  if (typeof val === 'object' && val !== null && 'type' in val) {
    return val
  }
  return parseExpression(String(val), { catalog })
}

export function toBirAttrValue(
  attr: BloggerAttributeNode | undefined,
  catalog: SpecCatalog,
): BirAttrValue {
  if (!attr) {
    return { kind: 'static', value: '' }
  }
  if (attr.name.startsWith('expr:') || attr.isExpression) {
    const expr = typeof attr.value === 'string'
      ? parseExpression(attr.value, { catalog })
      : (attr.value as BloggerExpressionNode)
    return { kind: 'expr', expr }
  }
  if (typeof attr.value === 'object' && attr.value !== null && 'type' in attr.value) {
    return { kind: 'expr', expr: attr.value as BloggerExpressionNode }
  }
  if (typeof attr.value === 'string' && attr.value.startsWith('data:') && !attr.value.includes(' ')) {
    return { kind: 'expr', expr: parseExpression(attr.value, { catalog }) }
  }
  return { kind: 'static', value: String(attr.value) }
}

function extractSkin(doc: BloggerDocumentNode, skinOverrides?: Record<string, string>): BirSkin {
  let skinNode: BloggerDirectiveNode | undefined
  let templateSkinNode: BloggerDirectiveNode | undefined

  const findSkinNodes = (nodes: readonly BloggerTemplateNode[]) => {
    for (const node of nodes) {
      if (node.type === 'Directive') {
        if (node.name === 'b:skin') {
          skinNode = node
        }
        else if (node.name === 'b:template-skin') {
          templateSkinNode = node
        }
      }
      if ('children' in node && Array.isArray(node.children)) {
        findSkinNodes(node.children)
      }
    }
  }
  findSkinNodes(doc.children)

  let variables: BirSkin['variables'] = []
  let css: BirSkin['css'] = []
  let templateSkinCss: BirSkin['templateSkinCss']

  if (skinNode) {
    let cdataContent = ''
    for (const child of skinNode.children) {
      if (child.type === 'CData' || child.type === 'Text') {
        cdataContent += child.value
      }
    }
    try {
      const parsed = parseSkinSource(cdataContent)
      variables = parsed.variables.map((v) => {
        const override = skinOverrides?.[v.name] ?? skinOverrides?.[v.name.replace(/\./g, '_')]
        const effectiveValue = override ?? v.value
        return {
          name: v.name,
          type: v.type,
          default: v.default,
          ...(effectiveValue !== undefined ? { value: effectiveValue } : {}),
          ...(v.group !== undefined ? { group: v.group } : {}),
          ...(v.description !== undefined ? { description: v.description } : {}),
        }
      })
      css = parsed.chunks
    }
    catch {
      css = [{ kind: 'text', value: cdataContent }]
    }
  }

  if (templateSkinNode) {
    let cdataContent = ''
    for (const child of templateSkinNode.children) {
      if (child.type === 'CData' || child.type === 'Text') {
        cdataContent += child.value
      }
    }
    try {
      const parsed = parseSkinSource(cdataContent)
      templateSkinCss = parsed.chunks
    }
    catch {
      templateSkinCss = [{ kind: 'text', value: cdataContent }]
    }
  }

  return {
    variables,
    css,
    ...(templateSkinCss ? { templateSkinCss } : {}),
  }
}

interface MutationExtractResult {
  classes: BirClassMutation[]
  attributes: BirAttribute[]
  retainedChildren: BloggerTemplateNode[]
  whitespaceRemove: boolean
}

function extractElementMutations(
  children: readonly BloggerTemplateNode[],
  isVoid: boolean,
  context: LoweringContext,
): MutationExtractResult {
  const classes: BirClassMutation[] = []
  const attributes: BirAttribute[] = []
  const retainedChildren: BloggerTemplateNode[] = []
  let whitespaceRemove = false
  let hadDirectives = false

  for (const child of children) {
    if (child.type === 'Directive') {
      hadDirectives = true
      if (child.name === 'b:class') {
        const nameAttr = child.attributes.find(a => a.name === 'name' || a.name === 'expr:name')
        const condAttr = child.attributes.find(a => a.name === 'cond' || a.name === 'expr:cond')
        if (nameAttr) {
          classes.push({
            name: toBirAttrValue(nameAttr, context.catalog),
            ...(condAttr ? { cond: ensureExpression(condAttr.value, context.catalog) } : {}),
          })
        }
        continue
      }
      if (child.name === 'b:attr') {
        const nameAttr = child.attributes.find(a => a.name === 'name')
        const exprNameAttr = child.attributes.find(a => a.name === 'expr:name')
        const valAttr = child.attributes.find(a => a.name === 'value' || a.name === 'expr:value')
        const condAttr = child.attributes.find(a => a.name === 'cond' || a.name === 'expr:cond')
        const attrName = String(nameAttr?.value ?? '')

        if (exprNameAttr) {
          retainedChildren.push(child)
          continue
        }

        if (attrName === 'b:whitespace') {
          if (String(valAttr?.value) === 'remove') {
            whitespaceRemove = true
          }
          continue
        }
        if (attrName) {
          attributes.push({
            name: attrName,
            value: toBirAttrValue(valAttr, context.catalog),
            ...(condAttr ? { cond: ensureExpression(condAttr.value, context.catalog) } : {}),
          })
        }
        continue
      }
    }

    if (isVoid && child.type !== 'Directive') {
      continue
    }

    retainedChildren.push(child)
  }

  // Filter out pure formatting whitespace text nodes adjacent to hoisted directives
  const finalChildren = (hadDirectives || whitespaceRemove)
    ? retainedChildren.filter(c => !isWhitespaceOnly(c))
    : retainedChildren

  return { classes, attributes, retainedChildren: finalChildren, whitespaceRemove }
}

function lowerElement(node: BloggerElementNode, context: LoweringContext): BirElement {
  const tagName = node.namespace ? `${node.namespace}:${node.name}` : node.name
  const isVoid = context.catalog.getHtmlVoidElements().has(node.name.toLowerCase())

  const baseClasses: BirClassMutation[] = []
  const baseAttributes: BirAttribute[] = []
  let whitespaceRemove = false

  for (const attr of node.attributes) {
    if (attr.name === 'b:whitespace' && String(attr.value) === 'remove') {
      whitespaceRemove = true
      continue
    }
    if (attr.name === 'class') {
      baseClasses.push({ name: { kind: 'static', value: String(attr.value) } })
    }
    else if (attr.name === 'expr:class') {
      baseClasses.push({ name: { kind: 'expr', expr: ensureExpression(attr.value, context.catalog) } })
    }
    else if (attr.name.startsWith('expr:')) {
      baseAttributes.push({
        name: attr.name.slice(5),
        value: { kind: 'expr', expr: ensureExpression(attr.value, context.catalog) },
      })
    }
    else {
      baseAttributes.push({
        name: attr.name,
        value: { kind: 'static', value: String(attr.value) },
      })
    }
  }

  const { classes: childClasses, attributes: childAttributes, retainedChildren, whitespaceRemove: childWhitespaceRemove }
    = extractElementMutations(node.children, isVoid, context)

  if (childWhitespaceRemove) {
    whitespaceRemove = true
  }

  return {
    kind: 'element',
    tag: tagName,
    isVoid,
    ...(node.selfClosing ? { selfClosing: true } : {}),
    ...(whitespaceRemove ? { whitespaceRemove: true } : {}),
    attributes: [...baseAttributes, ...childAttributes],
    classes: [...baseClasses, ...childClasses],
    children: lowerNodes(retainedChildren, context),
  }
}

function lowerDirective(node: BloggerDirectiveNode, context: LoweringContext): BirNode[] {
  if (isFlowDirective(node.name)) {
    const handler = getFlowDirectiveHandler(node.name)!
    return [handler.lower(node, context)]
  }

  switch (node.name as string) {
    case 'b:tag':
      return [lowerTagDirective(node, context)]
    case 'b:include':
      return [lowerIncludeDirective(node, context)]
    case 'b:eval':
      return lowerEvalDirective(node, context)
    case 'b:message':
      return lowerMessageDirective(node, context)
    case 'b:section':
      return [lowerSectionDirective(node, context)]
    case 'b:widget':
      return [lowerWidgetDirective(node, context)]
    case 'b:widget-settings':
    case 'b:widget-setting':
      return []
    case 'b:defaultmarkups':
      lowerDefaultMarkups(node, context)
      return []
    case 'b:defaultmarkup':
      lowerDefaultMarkup(node, context)
      return []
    case 'b:attr':
      return lowerAttrDirective(node, context)
    case 'b:class':
      return lowerClassDirective(node, context)
    case 'b:includable':
      lowerIncludableDirective(node, context)
      return []
    case 'b:skin':
      return [{ kind: 'skin', role: 'page-skin' }]
    case 'b:template-skin':
      return [{ kind: 'skin', role: 'template-skin' }]
    case 'b:whitespace':
      return []
    case 'b:comment':
      return lowerCommentDirective(node)
    default: {
      if (node.name.startsWith('data:')) {
        return lowerDataOutput(node, context)
      }
      return lowerNodes(node.children, context)
    }
  }
}

export function lowerNodes(
  nodes: readonly BloggerTemplateNode[],
  context: LoweringContext,
): BirNode[] {
  const result: BirNode[] = []

  for (const node of nodes) {
    switch (node.type) {
      case 'Element':
        result.push(lowerElement(node, context))
        break
      case 'Text':
        result.push({ kind: 'text', value: unescapeXmlEntities(node.value) })
        break
      case 'CData':
        result.push({ kind: 'cdata', value: node.value })
        break
      case 'Comment':
        result.push({ kind: 'comment', value: node.value })
        break
      case 'Directive':
        result.push(...lowerDirective(node, context))
        break
    }
  }

  return result
}

export function lowerDocument(
  doc: BloggerDocumentNode,
  options?: BloggerLowerOptions,
): BloggerIRDocument {
  const catalog = options?.catalog ?? getSpecCatalog()
  const sourceXml = options?.sourceXml ?? ''
  const versionRes = sourceXml ? detectTemplateVersion(sourceXml, catalog) : undefined
  const layoutVersion: BloggerLayoutVersion = options?.layoutVersion ?? versionRes?.version ?? 3

  const htmlEl = doc.children.find(
    (c): c is BloggerElementNode => c.type === 'Element' && c.name.toLowerCase() === 'html',
  )
  const defaultWidgetAttr = htmlEl?.attributes.find(a => a.name === 'b:defaultwidgetversion')
  const parsedDefaultWidgetVer = defaultWidgetAttr ? Number(defaultWidgetAttr.value) : Number.NaN
  const defaultWidgetVersion = !Number.isNaN(parsedDefaultWidgetVer)
    ? parsedDefaultWidgetVer
    : (layoutVersion === 1 ? 1 : 2)

  const defaultmarkups = collectDefaultMarkups(doc)
  const symbolTable: Record<string, BirIncludable> = {}
  const context: LoweringContext = {
    catalog,
    defaultmarkups,
    defaultWidgetVersion,
    ensureExpression: val => ensureExpression(val, catalog),
    filterContainerChildren,
    isWhitespaceOnly,
    layoutVersion,
    lowerNodes: nodes => lowerNodes(nodes, context),
    symbolTable,
    toBirAttrValue: attr => toBirAttrValue(attr, catalog),
  }

  // Pre-process defaultmarkups in document order (last_block_wins)
  for (const dm of defaultmarkups) {
    lowerDefaultMarkup(dm, context)
  }

  const rootNodes = lowerNodes(doc.children, context)
  const skin = extractSkin(doc, options?.skinOverrides)

  return {
    birVersion: '2',
    layoutVersion,
    root: rootNodes,
    symbolTable,
    skin,
  }
}

export function lowerTemplate(
  xml: string,
  options?: BloggerLowerOptions,
): BloggerIRDocument {
  const catalog = options?.catalog ?? getSpecCatalog()
  const doc = parseTemplate(xml, { catalog, parseExpressions: true })
  return lowerDocument(doc, { ...options, catalog, sourceXml: xml })
}
