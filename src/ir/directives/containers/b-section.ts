import type { BloggerDirectiveNode } from '../../../ast.js'
import type { BirContainer } from '../../types.js'
import type { DirectiveLowerContext, DirectiveRenderContext } from '../types.js'
import { evaluateExpression } from '../../../parser/index.js'
import { isTruthy } from '../../../type-system.js'
import { escapeAttr } from '../../renderer/html-serializer.js'

export function lowerSectionDirective(
  node: BloggerDirectiveNode,
  context: DirectiveLowerContext,
): BirContainer {
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
    children: context.lowerNodes(context.filterContainerChildren(node.children)),
    kind: 'container',
    role: 'section',
    ...(sectionId ? { id: sectionId } : {}),
    ...(nameAttr ? { name: context.toBirAttrValue(nameAttr) } : {}),
    ...(className ? { className } : {}),
    ...(tagAttr ? { tag: context.toBirAttrValue(tagAttr) } : {}),
    ...(condAttr ? { cond: context.ensureExpression(condAttr.value) } : {}),
    ...(hasV3SuppressedAttr ? { suppressedInV3: true } : {}),
  }
  context.currentSectionId = prevSection
  return container
}

export function renderSectionContainer(
  node: BirContainer,
  ctx: Record<string, any>,
  renderCtx: DirectiveRenderContext,
): string {
  if (node.cond !== undefined && !isTruthy(evaluateExpression(node.cond, ctx))) {
    return ''
  }
  const sectionId = node.id ?? 'section'
  const pipeline = renderCtx.pipeline
  const normalizeUrls = renderCtx.normalizeUrls
  const tag = (node.tag && pipeline ? pipeline.resolveAttrValue(node.tag, ctx, normalizeUrls) : undefined) || 'div'
  const nameVal = node.name && pipeline ? pipeline.resolveAttrValue(node.name, ctx, normalizeUrls) : undefined
  const nameAttr = nameVal ? ` name="${escapeAttr(nameVal)}"` : ''
  const innerHtml = node.suppressedInV3 ? '' : (node.children ? renderCtx.renderNodes(node.children, ctx) : '')
  const baseClass = node.className ? `${node.className} section` : 'section'
  const emptyClass = node.className ? `${node.className} no-items section` : 'no-items section'
  const finalClass = innerHtml.trim() ? baseClass : emptyClass
  const emitWrappers = renderCtx.emitWrappers !== false

  return emitWrappers ? `<${tag} class="${finalClass}" id="${sectionId}"${nameAttr}>${innerHtml}</${tag}>` : innerHtml
}
