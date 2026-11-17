import type { BloggerDirectiveNode } from '../../../ast.js'
import type { BirAttrMutation } from '../../types.js'
import type { DirectiveLowerContext, DirectiveRenderContext } from '../types.js'
import { evaluateExpression } from '../../../parser/index.js'
import { isTruthy } from '../../../type-system.js'

export function lowerAttrDirective(
  node: BloggerDirectiveNode,
  ctx: DirectiveLowerContext,
): BirAttrMutation[] {
  const nameAttr = node.attributes.find(a => a.name === 'name' || a.name === 'expr:name')
  const valAttr = node.attributes.find(a => a.name === 'value' || a.name === 'expr:value')
  const condAttr = node.attributes.find(a => a.name === 'cond' || a.name === 'expr:cond')
  if (!nameAttr) {
    return []
  }
  return [{
    ...(condAttr ? { cond: ctx.ensureExpression(condAttr.value) } : {}),
    kind: 'attrMutation',
    name: ctx.toBirAttrValue(nameAttr),
    value: ctx.toBirAttrValue(valAttr),
  }]
}

export function renderAttrMutation(
  node: BirAttrMutation,
  ctx: Record<string, any>,
  renderCtx: DirectiveRenderContext,
): string {
  if (node.cond !== undefined && !isTruthy(evaluateExpression(node.cond, ctx))) {
    return ''
  }
  const pipeline = renderCtx.pipeline
  if (!pipeline) {
    return ''
  }
  const name = pipeline.resolveAttrValue(node.name, ctx, renderCtx.normalizeUrls)
  if (!name) {
    return ''
  }
  const val = pipeline.resolveAttrValue(node.value, ctx, renderCtx.normalizeUrls, true)
  pipeline.applyAttrMutation(name, val)
  return ''
}

export const bAttrHandler = {
  kind: 'attrMutation' as const,
  lower: lowerAttrDirective,
  render: renderAttrMutation,
  tagName: 'b:attr',
}
