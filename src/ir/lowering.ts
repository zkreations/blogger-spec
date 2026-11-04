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
import type { BloggerIncludableResolutionTier, BloggerLayoutVersion } from '../types.js'
import type { DirectiveLowerContext } from './directives/index.js'
import type {
  BirAttribute,
  BirAttrValue,
  BirClassMutation,
  BirContainer,
  BirElement,
  BirIncludable,
  BirInclude,
  BirNode,
  BirResolution,
  BirSkin,
  BloggerIRDocument,
} from './types.js'
import { parseExpression } from '../ast.js'
import { getSpecCatalog } from '../catalogs/index.js'
import { collectDefaultMarkups, indexIncludables, resolveIncludable } from '../includable-resolver.js'
import { unescapeXmlEntities } from '../parser/lexer.js'
import { parseTemplate } from '../parser/template-parser.js'
import { parseSkinSource } from '../skin-compiler.js'
import { detectTemplateVersion } from '../version.js'
import { deserializeWidgetSettings } from '../widget-settings.js'
import {
  getFlowDirectiveHandler,
  isFlowDirective,
  lowerAttrDirective,
  lowerClassDirective,
  lowerCommentDirective,
  lowerDataOutput,
  lowerEvalDirective,
  lowerMessageDirective,
  lowerTagDirective,
} from './directives/index.js'

export interface BloggerLowerOptions {
  readonly catalog?: SpecCatalog
  readonly layoutVersion?: BloggerLayoutVersion
  readonly sourceXml?: string
  readonly skinOverrides?: Record<string, string>
}

interface LoweringContext {
  readonly catalog: SpecCatalog
  readonly layoutVersion: BloggerLayoutVersion
  readonly defaultWidgetVersion: number
  readonly symbolTable: Record<string, BirIncludable>
  readonly defaultmarkups: readonly BloggerDirectiveNode[]
  currentWidgetId?: string
  currentWidgetType?: string
  currentWidgetLocals?: Map<string, BloggerDirectiveNode>
  currentDefaultMarkupType?: string
  currentSectionId?: string
}

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

function lowerIncludeDirective(node: BloggerDirectiveNode, context: LoweringContext): BirInclude {
  const nameAttr = node.attributes.find(a => a.name === 'name')
  const exprNameAttr = node.attributes.find(a => a.name === 'expr:name')

  const args: Record<string, BirAttrValue> = {}
  for (const attr of node.attributes) {
    if (attr.name === 'name' || attr.name === 'expr:name') {
      continue
    }
    const cleanName = attr.name.startsWith('expr:') ? attr.name.slice(5) : attr.name
    const isExpr = attr.name.startsWith('expr:') || attr.isExpression || attr.name === 'data' || attr.name === 'var'
    if (isExpr) {
      const expr = typeof attr.value === 'string'
        ? parseExpression(attr.value, { catalog: context.catalog })
        : (attr.value as BloggerExpressionNode)
      args[cleanName] = { kind: 'expr', expr }
    }
    else {
      args[cleanName] = toBirAttrValue(attr, context.catalog)
    }
  }

  const target = nameAttr?.value ? String(nameAttr.value) : undefined
  const dynamicTarget = exprNameAttr?.value ? ensureExpression(exprNameAttr.value, context.catalog) : undefined

  let resolution: BirResolution | undefined
  if (target) {
    const res = resolveIncludable(
      {
        targetId: target,
        widgetId: context.currentWidgetId,
        widgetType: context.currentWidgetType,
        isGlobalScope: !context.currentWidgetId,
      },
      {
        localIncludables: context.currentWidgetLocals,
        defaultmarkups: context.defaultmarkups,
      },
      { catalog: context.catalog, useLocalStub: true },
    )

    resolution = {
      tier: res.tier,
      resolved: res.resolved,
      ...(res.failureComment ? { failureComment: res.failureComment } : {}),
    }

    if (res.tier === 'platform_server' && !context.symbolTable[`server:${target}`]) {
      const stubHtml = res.serverInclusion?.markup ?? ''
      const baseName = target.startsWith('super.') ? target.slice('super.'.length) : target
      const incDef = context.catalog.getInclusion(baseName)
      const varMatch = incDef?.server_markup ? /^<b:includable\b[^>]+\bvar=['"]([^'"]+)['"]/i.exec(incDef.server_markup.trim()) : null
      const serverParams = varMatch?.[1] ? [varMatch[1]] : []
      let stubBody: BirNode[] = []
      if (stubHtml) {
        try {
          const stubDoc = parseTemplate(stubHtml, { catalog: context.catalog })
          stubBody = lowerNodes(filterContainerChildren(stubDoc.children), context)
        }
        catch {
          stubBody = [{ kind: 'text', value: stubHtml }]
        }
      }
      context.symbolTable[`server:${target}`] = {
        id: target,
        tier: 'platform_server',
        params: serverParams,
        body: stubBody,
      }
    }
  }
  else if (dynamicTarget) {
    resolution = {
      tier: 'unresolved',
      resolved: false,
    }
  }

  return {
    kind: 'include',
    ...(target ? { target } : {}),
    ...(dynamicTarget ? { dynamicTarget } : {}),
    ...(resolution ? { resolution } : {}),
    args,
  }
}

function lowerIncludableDirective(
  node: BloggerDirectiveNode,
  context: LoweringContext,
  tierOverride?: Exclude<BloggerIncludableResolutionTier, 'unresolved'>,
  ownerWidgetOverride?: string,
): void {
  const idAttr = node.attributes.find(a => a.name === 'id')
  const varAttr = node.attributes.find(a => a.name === 'var')
  const id = String(idAttr?.value ?? '')

  if (!id)
    return

  // super.* namespace is strictly reserved for platform_server inclusions
  if (id.startsWith('super.') && (context.currentDefaultMarkupType || context.currentWidgetId)) {
    return
  }

  const params: string[] = []
  if (varAttr?.value) {
    params.push(String(varAttr.value))
  }

  let tier: Exclude<BloggerIncludableResolutionTier, 'unresolved'>
  let ownerWidgetId: string | undefined

  if (tierOverride) {
    tier = tierOverride
    ownerWidgetId = ownerWidgetOverride
  }
  else if (context.currentWidgetId) {
    tier = 'local_widget'
    ownerWidgetId = context.currentWidgetId
  }
  else if (context.currentDefaultMarkupType) {
    const dmType = context.currentDefaultMarkupType
    if (dmType === 'Common') {
      tier = 'shared_common'
    }
    else if (dmType === 'All') {
      tier = 'universal_widget'
    }
    else {
      tier = 'gadget_specific'
      ownerWidgetId = dmType
    }
  }
  else {
    tier = 'shared_common'
  }

  const includable: BirIncludable = {
    id,
    tier,
    ...(ownerWidgetId ? { ownerWidgetId } : {}),
    params,
    body: lowerNodes(filterContainerChildren(node.children), context),
  }

  if (tier === 'local_widget' && ownerWidgetId) {
    context.symbolTable[`widget:${ownerWidgetId}:${id}`] = includable
  }
  else if (tier === 'gadget_specific' && ownerWidgetId) {
    context.symbolTable[`gadget:${ownerWidgetId}:${id}`] = includable
  }
  else if (tier === 'universal_widget') {
    context.symbolTable[`all:${id}`] = includable
  }
  else if (tier === 'shared_common') {
    context.symbolTable[`common:${id}`] = includable
  }
  else {
    context.symbolTable[`server:${id}`] = includable
  }
}

function lowerDefaultMarkup(node: BloggerDirectiveNode, context: LoweringContext): void {
  const typeAttr = node.attributes.find(a => a.name === 'type')
  const rawType = String(typeAttr?.value ?? 'Common')
  const targetTypes = rawType.split(',').map(t => t.trim()).filter(Boolean)
  const prevType = context.currentDefaultMarkupType

  for (const dmType of (targetTypes.length > 0 ? targetTypes : ['Common'])) {
    context.currentDefaultMarkupType = dmType
    for (const child of node.children) {
      if (child.type === 'Directive' && child.name === 'b:includable') {
        lowerIncludableDirective(child, context)
      }
    }
  }

  context.currentDefaultMarkupType = prevType
}

function lowerDirective(node: BloggerDirectiveNode, context: LoweringContext): BirNode[] {
  const dirCtx: DirectiveLowerContext = {
    catalog: context.catalog,
    ensureExpression: val => ensureExpression(val, context.catalog),
    filterContainerChildren,
    isWhitespaceOnly,
    lowerNodes: nodes => lowerNodes(nodes, context),
    toBirAttrValue: attr => toBirAttrValue(attr, context.catalog),
  }

  if (isFlowDirective(node.name)) {
    const handler = getFlowDirectiveHandler(node.name)!
    return [handler.lower(node, dirCtx)]
  }

  switch (node.name as string) {
    case 'b:tag':
      return [lowerTagDirective(node, dirCtx)]
    case 'b:include':
      return [lowerIncludeDirective(node, context)]
    case 'b:eval':
      return lowerEvalDirective(node, dirCtx)
    case 'b:message':
      return lowerMessageDirective(node, dirCtx)
    case 'b:section': {
      const idAttr = node.attributes.find(a => a.name === 'id')
      const nameAttr = node.attributes.find(a => a.name === 'name' || a.name === 'expr:name')
      const classAttr = node.attributes.find(a => a.name === 'class')
      const tagAttr = node.attributes.find(a => a.name === 'tag' || a.name === 'expr:tag')
      const condAttr = node.attributes.find(a => a.name === 'cond' || a.name === 'expr:cond')
      const sectionId = idAttr?.value ? String(idAttr.value) : undefined
      const className = classAttr?.value ? String(classAttr.value) : undefined
      const isV3 = context.layoutVersion === 3
      const hasV3SuppressedAttr = isV3 && node.attributes.some(
        a => a.name === 'maxwidgets' || a.name === 'showaddelement',
      )
      const prevSection = context.currentSectionId
      context.currentSectionId = sectionId
      const container: BirContainer = {
        kind: 'container',
        role: 'section',
        ...(sectionId ? { id: sectionId } : {}),
        ...(nameAttr ? { name: toBirAttrValue(nameAttr, context.catalog) } : {}),
        ...(className ? { className } : {}),
        ...(tagAttr ? { tag: toBirAttrValue(tagAttr, context.catalog) } : {}),
        ...(condAttr ? { cond: ensureExpression(condAttr.value, context.catalog) } : {}),
        ...(hasV3SuppressedAttr ? { suppressedInV3: true } : {}),
        children: lowerNodes(filterContainerChildren(node.children), context),
      }
      context.currentSectionId = prevSection
      return [container]
    }
    case 'b:widget': {
      const idAttr = node.attributes.find(a => a.name === 'id')
      const typeAttr = node.attributes.find(a => a.name === 'type')
      const titleAttr = node.attributes.find(a => a.name === 'title')
      const condAttr = node.attributes.find(a => a.name === 'cond' || a.name === 'expr:cond')
      const visibleAttr = node.attributes.find(a => a.name === 'visible')
      const versionAttr = node.attributes.find(a => a.name === 'version')
      const widgetId = String(idAttr?.value ?? '')
      const widgetType = String(typeAttr?.value ?? '')
      const parsedVersion = versionAttr?.value !== undefined ? Number(versionAttr.value) : undefined
      const version = parsedVersion !== undefined && !Number.isNaN(parsedVersion)
        ? parsedVersion
        : context.defaultWidgetVersion
      const visible = visibleAttr !== undefined ? isTruthyValue(visibleAttr.value) : undefined
      const settings = deserializeWidgetSettings(node.children, widgetType, context.catalog)

      const prevWidget = context.currentWidgetId
      const prevType = context.currentWidgetType
      const prevLocals = context.currentWidgetLocals
      context.currentWidgetId = widgetId
      context.currentWidgetType = widgetType
      context.currentWidgetLocals = indexIncludables(node.children)

      // Includables and widget-settings are extracted structurally
      const nonIncludableChildren: BloggerTemplateNode[] = []
      for (const child of node.children) {
        if (child.type === 'Directive' && child.name === 'b:includable') {
          lowerIncludableDirective(child, context)
        }
        else if (child.type === 'Directive' && (child.name === 'b:widget-settings' || child.name === 'b:widget-setting')) {
          continue
        }
        else if (!isWhitespaceOnly(child)) {
          nonIncludableChildren.push(child)
        }
      }

      const container: BirContainer = {
        kind: 'container',
        role: 'widget',
        ...(widgetId ? { id: widgetId } : {}),
        ...(widgetType ? { widgetType } : {}),
        ...(context.currentSectionId ? { sectionId: context.currentSectionId } : {}),
        ...(titleAttr !== undefined ? { title: String(titleAttr.value) } : {}),
        version,
        ...(condAttr ? { cond: ensureExpression(condAttr.value, context.catalog) } : {}),
        ...(visible !== undefined ? { visible } : {}),
        ...(settings ? { settings } : {}),
        children: lowerNodes(nonIncludableChildren, context),
      }
      context.currentWidgetId = prevWidget
      context.currentWidgetType = prevType
      context.currentWidgetLocals = prevLocals
      return [container]
    }
    case 'b:widget-settings':
    case 'b:widget-setting':
      return []
    case 'b:defaultmarkups':
      for (const child of node.children) {
        if (child.type === 'Directive' && child.name === 'b:defaultmarkup') {
          lowerDefaultMarkup(child, context)
        }
      }
      return []
    case 'b:defaultmarkup':
      lowerDefaultMarkup(node, context)
      return []
    case 'b:attr':
      return lowerAttrDirective(node, dirCtx)
    case 'b:class':
      return lowerClassDirective(node, dirCtx)
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
        return lowerDataOutput(node, dirCtx)
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
    layoutVersion,
    defaultWidgetVersion,
    symbolTable,
    defaultmarkups,
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
