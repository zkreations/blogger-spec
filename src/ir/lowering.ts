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
import type {
  BirAttribute,
  BirAttrValue,
  BirClassMutation,
  BirContainer,
  BirElement,
  BirIf,
  BirIncludable,
  BirInclude,
  BirLoop,
  BirNode,
  BirSkin,
  BirSwitch,
  BirTag,
  BirWith,
  BloggerIRDocument,
} from './types.js'
import { parseExpression } from '../ast.js'
import { getSpecCatalog } from '../catalogs/index.js'
import { parseTemplate } from '../parser/template-parser.js'
import { compileSkinCss } from '../skin-compiler.js'
import { detectTemplateVersion } from '../version.js'

export interface BloggerLowerOptions {
  readonly catalog?: SpecCatalog
  readonly layoutVersion?: BloggerLayoutVersion
  readonly sourceXml?: string
}

interface LoweringContext {
  readonly catalog: SpecCatalog
  readonly symbolTable: Record<string, BirIncludable>
  currentWidgetId?: string
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
  return { kind: 'static', value: String(attr.value) }
}

function parseSkinCss(rawCss: string): Array<{ kind: 'text', value: string } | { kind: 'variable', variable: string }> {
  const result: Array<{ kind: 'text', value: string } | { kind: 'variable', variable: string }> = []
  const regex = /\$\(([\w.:-]+)\)/g
  let lastIndex = 0
  let match = regex.exec(rawCss)

  while (match !== null) {
    if (match.index > lastIndex) {
      result.push({ kind: 'text', value: rawCss.slice(lastIndex, match.index) })
    }
    result.push({ kind: 'variable', variable: match[1]! })
    lastIndex = regex.lastIndex
    match = regex.exec(rawCss)
  }
  if (lastIndex < rawCss.length) {
    result.push({ kind: 'text', value: rawCss.slice(lastIndex) })
  }
  return result
}

function extractSkin(doc: BloggerDocumentNode): BirSkin {
  let skinNode: BloggerDirectiveNode | undefined
  const findSkin = (nodes: readonly BloggerTemplateNode[]) => {
    for (const node of nodes) {
      if (node.type === 'Directive' && (node.name === 'b:skin' || node.name === 'b:template-skin')) {
        skinNode = node
        return
      }
      if ('children' in node && Array.isArray(node.children)) {
        findSkin(node.children)
        if (skinNode)
          return
      }
    }
  }
  findSkin(doc.children)

  if (!skinNode) {
    return { variables: [], css: [] }
  }

  let cdataContent = ''
  for (const child of skinNode.children) {
    if (child.type === 'CData' || child.type === 'Text') {
      cdataContent += child.value
    }
  }

  try {
    const compiled = compileSkinCss(cdataContent, { wrap: 'none', stripMetadataTags: true })
    const variables = Object.entries(compiled.symbols).map(([name, sym]) => ({
      name: sym.name ?? name,
      type: sym.type,
      default: sym.default ?? '',
    }))
    const css = parseSkinCss(compiled.css)
    return { variables, css }
  }
  catch {
    return { variables: [], css: [{ kind: 'text', value: cdataContent }] }
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
        const valAttr = child.attributes.find(a => a.name === 'value' || a.name === 'expr:value')
        const condAttr = child.attributes.find(a => a.name === 'cond' || a.name === 'expr:cond')
        const attrName = String(nameAttr?.value ?? '')

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
      if (child.name === 'b:if') {
        // Inspect if b:if branch contains only mutations
        const hasOnlyMutations = child.children.every(
          c => (c.type === 'Directive' && (c.name === 'b:class' || c.name === 'b:attr' || c.name === 'b:elseif' || c.name === 'b:else'))
            || (c.type === 'Text' && c.value.trim() === ''),
        )
        if (hasOnlyMutations) {
          const ifCondAttr = child.attributes.find(a => a.name === 'cond' || a.name === 'test')
          const ifCond = ensureExpression(ifCondAttr?.value, context.catalog)
          let currentBranchCond: BloggerExpressionNode | undefined = ifCond

          for (const sub of child.children) {
            if (sub.type === 'Directive') {
              if (sub.name === 'b:elseif' || (sub.name as string) === 'b:else-if') {
                const subCond = sub.attributes.find(a => a.name === 'cond' || a.name === 'test')
                currentBranchCond = ensureExpression(subCond?.value, context.catalog)
                continue
              }
              if (sub.name === 'b:else') {
                currentBranchCond = undefined
                continue
              }
              if (sub.name === 'b:class') {
                const nameAttr = sub.attributes.find(a => a.name === 'name' || a.name === 'expr:name')
                if (nameAttr) {
                  classes.push({
                    name: toBirAttrValue(nameAttr, context.catalog),
                    ...(currentBranchCond ? { cond: currentBranchCond } : {}),
                  })
                }
              }
              else if (sub.name === 'b:attr') {
                const nameAttr = sub.attributes.find(a => a.name === 'name')
                const valAttr = sub.attributes.find(a => a.name === 'value' || a.name === 'expr:value')
                const attrName = String(nameAttr?.value ?? '')
                if (attrName && attrName !== 'b:whitespace') {
                  attributes.push({
                    name: attrName,
                    value: toBirAttrValue(valAttr, context.catalog),
                    ...(currentBranchCond ? { cond: currentBranchCond } : {}),
                  })
                }
              }
            }
          }
          continue
        }
      }
    }

    if (child.type === 'Text' && isVoid) {
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
  const isVoid = node.selfClosing || context.catalog.getHtmlVoidElements().has(node.name.toLowerCase())

  const baseClasses: BirClassMutation[] = []
  const baseAttributes: BirAttribute[] = []

  for (const attr of node.attributes) {
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

  const { classes: childClasses, attributes: childAttributes, retainedChildren }
    = extractElementMutations(node.children, isVoid, context)

  return {
    kind: 'element',
    tag: tagName,
    isVoid,
    attributes: [...baseAttributes, ...childAttributes],
    classes: [...baseClasses, ...childClasses],
    children: isVoid ? [] : lowerNodes(retainedChildren, context),
  }
}

function lowerTagDirective(node: BloggerDirectiveNode, context: LoweringContext): BirTag {
  const nameAttr = node.attributes.find(a => a.name === 'name' || a.name === 'expr:name')
  const condAttr = node.attributes.find(a => a.name === 'cond' || a.name === 'expr:cond')

  const baseClasses: BirClassMutation[] = []
  const baseAttributes: BirAttribute[] = []

  for (const attr of node.attributes) {
    if (attr.name === 'name' || attr.name === 'expr:name' || attr.name === 'cond' || attr.name === 'expr:cond') {
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

  const { classes: childClasses, attributes: childAttributes, retainedChildren }
    = extractElementMutations(node.children, false, context)

  return {
    kind: 'tag',
    tag: toBirAttrValue(nameAttr, context.catalog),
    ...(condAttr ? { cond: ensureExpression(condAttr.value, context.catalog) } : {}),
    attributes: [...baseAttributes, ...childAttributes],
    classes: [...baseClasses, ...childClasses],
    children: lowerNodes(retainedChildren, context),
  }
}

function lowerIfDirective(node: BloggerDirectiveNode, context: LoweringContext): BirIf {
  const ifCondAttr = node.attributes.find(a => a.name === 'cond' || a.name === 'test')
  const firstTest = ensureExpression(ifCondAttr?.value, context.catalog)

  const rawBranches: Array<{ test?: BloggerExpressionNode, rawChildren: BloggerTemplateNode[] }> = [
    { test: firstTest, rawChildren: [] },
  ]
  let currentBranch = rawBranches[0]!

  for (const child of node.children) {
    if (child.type === 'Directive' && (child.name === 'b:elseif' || (child.name as string) === 'b:else-if')) {
      const condAttr = child.attributes.find(a => a.name === 'cond' || a.name === 'test')
      currentBranch = { test: ensureExpression(condAttr?.value, context.catalog), rawChildren: [] }
      rawBranches.push(currentBranch)
      continue
    }
    if (child.type === 'Directive' && child.name === 'b:else') {
      currentBranch = { test: undefined, rawChildren: [] }
      rawBranches.push(currentBranch)
      continue
    }
    currentBranch.rawChildren.push(child)
  }

  return {
    kind: 'if',
    branches: rawBranches.map(branch => ({
      ...(branch.test ? { test: branch.test } : {}),
      children: lowerNodes(filterContainerChildren(branch.rawChildren), context),
    })),
  }
}

function lowerSwitchDirective(node: BloggerDirectiveNode, context: LoweringContext): BirSwitch {
  const onAttr = node.attributes.find(a => a.name === 'var' || a.name === 'expr' || a.name === 'value')
  const onExpr = ensureExpression(onAttr?.value, context.catalog)

  const cases: Array<{ match?: BloggerExpressionNode, children: BirNode[] }> = []
  let currentCase: { match?: BloggerExpressionNode, rawChildren: BloggerTemplateNode[] } | null = null

  for (const child of node.children) {
    if (child.type === 'Directive' && child.name === 'b:case') {
      const valAttr = child.attributes.find(a => a.name === 'value' || a.name === 'expr:value')
      let matchExpr: BloggerExpressionNode
      if (valAttr && !valAttr.name.startsWith('expr:') && !valAttr.isExpression && typeof valAttr.value === 'string') {
        matchExpr = { type: 'Literal', value: valAttr.value }
      }
      else {
        matchExpr = ensureExpression(valAttr?.value, context.catalog)
      }
      currentCase = { match: matchExpr, rawChildren: [] }
      cases.push({ match: currentCase.match, children: [] })
      continue
    }
    if (child.type === 'Directive' && child.name === 'b:default') {
      currentCase = { match: undefined, rawChildren: [] }
      cases.push({ children: [] })
      continue
    }
    if (currentCase) {
      if (!isWhitespaceOnly(child)) {
        currentCase.rawChildren.push(child)
        const lastCase = cases[cases.length - 1]!
        const lowered = lowerNodes([child], context)
        ;(lastCase as any).children.push(...lowered)
      }
    }
  }

  return {
    kind: 'switch',
    on: onExpr,
    cases,
  }
}

function lowerLoopDirective(node: BloggerDirectiveNode, context: LoweringContext): BirLoop {
  const valuesAttr = node.attributes.find(a => a.name === 'values' || a.name === 'expr:values')
  const varAttr = node.attributes.find(a => a.name === 'var')
  const indexAttr = node.attributes.find(a => a.name === 'index')
  const reverseAttr = node.attributes.find(a => a.name === 'reverse')

  return {
    kind: 'loop',
    values: ensureExpression(valuesAttr?.value, context.catalog),
    var: String(varAttr?.value ?? 'item'),
    ...(indexAttr?.value ? { index: String(indexAttr.value) } : {}),
    ...(isTruthyValue(reverseAttr?.value) ? { reverse: true } : {}),
    children: lowerNodes(filterContainerChildren(node.children), context),
  }
}

function lowerWithDirective(node: BloggerDirectiveNode, context: LoweringContext): BirWith {
  const bindings: Array<{ var: string, value: BloggerExpressionNode }> = []

  const varAttr = node.attributes.find(a => a.name === 'var')
  const valAttr = node.attributes.find(a => a.name === 'value' || a.name === 'expr:value')
  if (varAttr?.value) {
    bindings.push({
      var: String(varAttr.value),
      value: ensureExpression(valAttr?.value, context.catalog),
    })
  }

  // Handle multi-variable with: var2, value2, var3, value3...
  for (let i = 2; i <= 9; i++) {
    const vAttr = node.attributes.find(a => a.name === `var${i}`)
    const valA = node.attributes.find(a => a.name === `value${i}` || a.name === `expr:value${i}`)
    if (vAttr?.value) {
      bindings.push({
        var: String(vAttr.value),
        value: ensureExpression(valA?.value, context.catalog),
      })
    }
  }

  return {
    kind: 'with',
    bindings: bindings.length > 0 ? bindings : [{ var: 'item', value: { type: 'Literal', value: null } }],
    children: lowerNodes(filterContainerChildren(node.children), context),
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
    args[cleanName] = toBirAttrValue(attr, context.catalog)
  }

  const target = nameAttr?.value ? String(nameAttr.value) : undefined
  const dynamicTarget = exprNameAttr?.value ? ensureExpression(exprNameAttr.value, context.catalog) : undefined

  return {
    kind: 'include',
    ...(target ? { target } : {}),
    ...(dynamicTarget ? { dynamicTarget } : {}),
    args,
  }
}

function lowerIncludableDirective(node: BloggerDirectiveNode, context: LoweringContext): void {
  const idAttr = node.attributes.find(a => a.name === 'id')
  const varAttr = node.attributes.find(a => a.name === 'var')
  const id = String(idAttr?.value ?? '')

  if (!id)
    return

  const params: string[] = []
  if (varAttr?.value) {
    params.push(String(varAttr.value))
  }

  const includable: BirIncludable = {
    id,
    tier: context.currentWidgetId ? 'local_widget' : 'shared_common',
    ...(context.currentWidgetId ? { ownerWidgetId: context.currentWidgetId } : {}),
    params,
    body: lowerNodes(filterContainerChildren(node.children), context),
  }

  // Symbol table key: scoped to widget or id
  const key = context.currentWidgetId ? `${context.currentWidgetId}:${id}` : id
  context.symbolTable[key] = includable
  if (!context.symbolTable[id]) {
    context.symbolTable[id] = includable
  }
}

function lowerDirective(node: BloggerDirectiveNode, context: LoweringContext): BirNode[] {
  switch (node.name as string) {
    case 'b:tag':
      return [lowerTagDirective(node, context)]
    case 'b:if':
      return [lowerIfDirective(node, context)]
    case 'b:switch':
      return [lowerSwitchDirective(node, context)]
    case 'b:loop':
      return [lowerLoopDirective(node, context)]
    case 'b:with':
      return [lowerWithDirective(node, context)]
    case 'b:include':
      return [lowerIncludeDirective(node, context)]
    case 'b:eval': {
      const exprAttr = node.attributes.find(a => a.name === 'expr' || a.name === 'value')
      return [{
        kind: 'output',
        expr: ensureExpression(exprAttr?.value, context.catalog),
      }]
    }
    case 'b:message': {
      const nameAttr = node.attributes.find(a => a.name === 'name')
      const msgName = String(nameAttr?.value ?? '')
      const fullPath = msgName.startsWith('messages.') ? `data:${msgName}` : `data:messages.${msgName}`
      return [{
        kind: 'output',
        expr: parseExpression(fullPath, { catalog: context.catalog }),
      }]
    }
    case 'b:section': {
      const idAttr = node.attributes.find(a => a.name === 'id')
      const container: BirContainer = {
        kind: 'container',
        role: 'section',
        ...(idAttr?.value ? { id: String(idAttr.value) } : {}),
        children: lowerNodes(filterContainerChildren(node.children), context),
      }
      return [container]
    }
    case 'b:widget': {
      const idAttr = node.attributes.find(a => a.name === 'id')
      const typeAttr = node.attributes.find(a => a.name === 'type')
      const widgetId = String(idAttr?.value ?? '')
      const prevWidget = context.currentWidgetId
      context.currentWidgetId = widgetId

      // Includables are extracted into context.symbolTable
      const nonIncludableChildren: BloggerTemplateNode[] = []
      for (const child of node.children) {
        if (child.type === 'Directive' && child.name === 'b:includable') {
          lowerIncludableDirective(child, context)
        }
        else if (!isWhitespaceOnly(child)) {
          nonIncludableChildren.push(child)
        }
      }

      const container: BirContainer = {
        kind: 'container',
        role: 'widget',
        ...(widgetId ? { id: widgetId } : {}),
        ...(typeAttr?.value ? { widgetType: String(typeAttr.value) } : {}),
        children: lowerNodes(nonIncludableChildren, context),
      }
      context.currentWidgetId = prevWidget
      return [container]
    }
    case 'b:defaultmarkups':
    case 'b:defaultmarkup': {
      for (const child of node.children) {
        if (child.type === 'Directive' && child.name === 'b:includable') {
          lowerIncludableDirective(child, context)
        }
        else if (child.type === 'Directive' && child.name === 'b:defaultmarkup') {
          for (const sub of child.children) {
            if (sub.type === 'Directive' && sub.name === 'b:includable') {
              lowerIncludableDirective(sub, context)
            }
          }
        }
      }
      return []
    }
    case 'b:includable':
      lowerIncludableDirective(node, context)
      return []
    case 'b:skin':
    case 'b:template-skin':
      // Extracted separately into BIR root.skin
      return []
    case 'b:whitespace':
      return []
    case 'b:comment': {
      let commentText = ''
      for (const c of node.children) {
        if (c.type === 'Text')
          commentText += c.value
      }
      return [{ kind: 'comment', value: commentText }]
    }
    default: {
      if (node.name.startsWith('data:')) {
        return [{
          kind: 'output',
          expr: parseExpression(node.name, { catalog: context.catalog }),
        }]
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
        result.push({ kind: 'text', value: node.value })
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

  const symbolTable: Record<string, BirIncludable> = {}
  const context: LoweringContext = {
    catalog,
    symbolTable,
  }

  const rootNodes = lowerNodes(doc.children, context)
  const skin = extractSkin(doc)

  return {
    birVersion: '1',
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
