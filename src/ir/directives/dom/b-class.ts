import type { BloggerDirectiveNode } from '../../../ast.js'
import type { BirClassMutationNode } from '../../types.js'
import type { DirectiveLowerContext, DirectiveRenderContext } from '../types.js'
import { evaluateExpression } from '../../../parser/index.js'
import { isTruthy } from '../../../type-system.js'

export function lowerClassDirective(
  node: BloggerDirectiveNode,
  ctx: DirectiveLowerContext,
): BirClassMutationNode[] {
  const nameAttr = node.attributes.find(a => a.name === 'name' || a.name === 'expr:name')
  const condAttr = node.attributes.find(a => a.name === 'cond' || a.name === 'expr:cond')
  if (!nameAttr) {
    return []
  }
  return [{
    ...(condAttr ? { cond: ctx.ensureExpression(condAttr.value) } : {}),
    kind: 'classMutation',
    name: ctx.toBirAttrValue(nameAttr),
  }]
}

export function renderClassMutation(
  node: BirClassMutationNode,
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
  if (name) {
    pipeline.applyClassMutation(name)
  }
  return ''
}

export const bClassHandler = {
  kind: 'classMutation' as const,
  lower: lowerClassDirective,
  render: renderClassMutation,
  tagName: 'b:class',
}
