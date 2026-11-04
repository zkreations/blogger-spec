import type { BloggerDirectiveNode } from '../../../ast.js'
import type { BirWith, BirWithBinding } from '../../types.js'
import type { DirectiveLowerContext, DirectiveRenderContext, FlowDirectiveHandler } from '../types.js'
import { bindWithScope } from '../../renderer/scope-binder.js'

export function lowerWithDirective(
  node: BloggerDirectiveNode,
  ctx: DirectiveLowerContext,
): BirWith {
  const bindings: BirWithBinding[] = []

  const varAttr = node.attributes.find(a => a.name === 'var')
  const valAttr = node.attributes.find(a => a.name === 'value' || a.name === 'expr:value')
  if (varAttr?.value) {
    bindings.push({
      isDynamicDereference: valAttr?.name === 'expr:value' ? true : undefined,
      value: ctx.ensureExpression(valAttr?.value),
      var: String(varAttr.value),
    })
  }

  // Handle multi-variable with: var2, value2, var3, value3...
  for (let i = 2; i <= 9; i++) {
    const vAttr = node.attributes.find(a => a.name === `var${i}`)
    const valA = node.attributes.find(a => a.name === `value${i}` || a.name === `expr:value${i}`)
    if (vAttr?.value) {
      bindings.push({
        isDynamicDereference: valA?.name === `expr:value${i}` ? true : undefined,
        value: ctx.ensureExpression(valA?.value),
        var: String(vAttr.value),
      })
    }
  }

  return {
    bindings: bindings.length > 0 ? bindings : [{ value: { type: 'Literal', value: null }, var: 'item' }],
    children: ctx.lowerNodes(ctx.filterContainerChildren(node.children)),
    kind: 'with',
  }
}

export function renderWithDirective(
  node: BirWith,
  ctx: Record<string, any>,
  renderCtx: DirectiveRenderContext,
): string {
  const withCtx = bindWithScope(node.bindings, ctx)
  return renderCtx.renderNodes(node.children, withCtx)
}

export const bWithHandler: FlowDirectiveHandler<BirWith> = {
  kind: 'with',
  lower: lowerWithDirective,
  render: renderWithDirective,
  tagName: 'b:with',
}
