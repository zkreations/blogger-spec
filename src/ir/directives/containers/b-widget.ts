import type { BloggerDirectiveNode, BloggerTemplateNode } from '../../../ast.js'
import type { BirContainer } from '../../types.js'
import type { DirectiveLowerContext, DirectiveRenderContext } from '../types.js'
import { indexIncludables } from '../../../includable-resolver.js'
import { evaluateExpression } from '../../../parser/index.js'
import { isTruthy } from '../../../type-system.js'
import { deserializeWidgetSettings } from '../../../widget-settings.js'
import { bindIncludeScope, bindWidgetScope } from '../../renderer/scope-binder.js'
import { lowerIncludableDirective } from '../subroutines/b-includable.js'

function isTruthyAttr(val: unknown): boolean {
  if (val === true || val === 'true' || val === 'yes') {
    return true
  }
  if (typeof val === 'object' && val !== null && 'value' in val) {
    const inner = (val as any).value
    return inner === true || inner === 'true' || inner === 'yes'
  }
  return false
}

export function lowerWidgetDirective(
  node: BloggerDirectiveNode,
  context: DirectiveLowerContext,
): BirContainer {
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
    : (context.defaultWidgetVersion ?? 2)
  const visible = visibleAttr !== undefined ? isTruthyAttr(visibleAttr.value) : undefined
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
    else if (!context.isWhitespaceOnly(child)) {
      nonIncludableChildren.push(child)
    }
  }

  const container: BirContainer = {
    children: context.lowerNodes(nonIncludableChildren),
    kind: 'container',
    role: 'widget',
    ...(widgetId ? { id: widgetId } : {}),
    ...(widgetType ? { widgetType } : {}),
    ...(context.currentSectionId ? { sectionId: context.currentSectionId } : {}),
    ...(titleAttr !== undefined ? { title: String(titleAttr.value) } : {}),
    version,
    ...(condAttr ? { cond: context.ensureExpression(condAttr.value) } : {}),
    ...(visible !== undefined ? { visible } : {}),
    ...(settings ? { settings } : {}),
  }

  context.currentWidgetId = prevWidget
  context.currentWidgetType = prevType
  context.currentWidgetLocals = prevLocals

  return container
}

export function renderWidgetContainer(
  node: BirContainer,
  ctx: Record<string, any>,
  renderCtx: DirectiveRenderContext,
): string {
  if (node.visible === false) {
    return ''
  }
  if (node.cond !== undefined && !isTruthy(evaluateExpression(node.cond, ctx))) {
    return ''
  }
  const widgetId = node.id ?? ''
  const widgetType = node.widgetType ?? ''
  const sectionId = node.sectionId ?? 'content'
  const emitWrappers = renderCtx.emitWrappers !== false
  const pipeline = renderCtx.pipeline
  const normalizeUrls = renderCtx.normalizeUrls

  const { widgetCtx, wrapperTarget } = bindWidgetScope(
    widgetId,
    widgetType,
    sectionId,
    node.title,
    ctx,
    node.version ?? 2,
    node.settings,
  )

  pipeline?.pushTarget(wrapperTarget)

  const mainSub = renderCtx.findIncludable?.('main', widgetId, widgetType)

  let bodyHtml = ''
  if (mainSub) {
    const mainCtx = mainSub.params.length > 0
      ? bindIncludeScope(mainSub, {}, widgetCtx, true)
      : widgetCtx
    bodyHtml += renderCtx.renderNodes(mainSub.body, mainCtx)
  }
  if (node.children && node.children.length > 0) {
    bodyHtml += renderCtx.renderNodes(node.children, widgetCtx)
  }

  pipeline?.popTarget()
  const attrStr = pipeline ? pipeline.serializeAttributes(wrapperTarget, normalizeUrls) : ''

  return emitWrappers ? `<div${attrStr}>${bodyHtml}</div>` : bodyHtml
}
