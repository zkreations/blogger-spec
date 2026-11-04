import type { BloggerDirectiveNode } from '../../../ast.js'
import type { BirLoop } from '../../types.js'
import type { DirectiveLowerContext, DirectiveRenderContext, FlowDirectiveHandler } from '../types.js'
import { evaluateExpression } from '../../../parser/index.js'
import { bindLoopScope } from '../../renderer/scope-binder.js'

function isTruthyValue(val: unknown): boolean {
  if (val === true || val === 'true' || val === 'yes') {
    return true
  }
  if (typeof val === 'object' && val !== null && 'value' in val) {
    const inner = (val as any).value
    return inner === true || inner === 'true' || inner === 'yes'
  }
  return false
}

export function lowerLoopDirective(
  node: BloggerDirectiveNode,
  ctx: DirectiveLowerContext,
): BirLoop {
  const valuesAttr = node.attributes.find(a => a.name === 'values' || a.name === 'expr:values')
  const varAttr = node.attributes.find(a => a.name === 'var')
  const indexAttr = node.attributes.find(a => a.name === 'index')
  const reverseAttr = node.attributes.find(a => a.name === 'reverse')

  return {
    children: ctx.lowerNodes(ctx.filterContainerChildren(node.children)),
    ...(indexAttr?.value ? { index: String(indexAttr.value) } : {}),
    kind: 'loop',
    ...(isTruthyValue(reverseAttr?.value) ? { reverse: true } : {}),
    values: ctx.ensureExpression(valuesAttr?.value),
    var: String(varAttr?.value ?? 'item'),
  }
}

export function renderLoopDirective(
  node: BirLoop,
  ctx: Record<string, any>,
  renderCtx: DirectiveRenderContext,
): string {
  const list = evaluateExpression(node.values, ctx)
  if (!Array.isArray(list)) {
    return ''
  }
  const items = node.reverse ? [...list].reverse() : list
  let out = ''
  items.forEach((item, index) => {
    const loopCtx = bindLoopScope(item, index, node.var, node.index, ctx)
    out += renderCtx.renderNodes(node.children, loopCtx)
  })
  return out
}

export const bLoopHandler: FlowDirectiveHandler<BirLoop> = {
  kind: 'loop',
  lower: lowerLoopDirective,
  render: renderLoopDirective,
  tagName: 'b:loop',
}
