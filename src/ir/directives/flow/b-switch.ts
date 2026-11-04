import type {
  BloggerDirectiveNode,
  BloggerExpressionNode,
  BloggerTemplateNode,
} from '../../../ast.js'
import type { BirNode, BirSwitch } from '../../types.js'
import type { DirectiveLowerContext, DirectiveRenderContext, FlowDirectiveHandler } from '../types.js'
import { evaluateExpression, isEqual } from '../../../parser/index.js'

export function lowerSwitchDirective(
  node: BloggerDirectiveNode,
  ctx: DirectiveLowerContext,
): BirSwitch {
  const onAttr = node.attributes.find(a => a.name === 'var' || a.name === 'expr' || a.name === 'value')
  const onExpr = ctx.ensureExpression(onAttr?.value)

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
        matchExpr = ctx.ensureExpression(valAttr?.value)
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
      if (!ctx.isWhitespaceOnly(child)) {
        currentCase.rawChildren.push(child)
        const lastCase = cases[cases.length - 1]!
        const lowered = ctx.lowerNodes([child])
        ;(lastCase as any).children.push(...lowered)
      }
    }
  }

  return {
    cases,
    kind: 'switch',
    on: onExpr,
  }
}

export function renderSwitchDirective(
  node: BirSwitch,
  ctx: Record<string, any>,
  renderCtx: DirectiveRenderContext,
): string {
  const val = evaluateExpression(node.on, ctx)
  let defaultCase: readonly BirNode[] | undefined
  for (const c of node.cases) {
    if (c.match) {
      const matchVal = evaluateExpression(c.match, ctx)
      if (isEqual(val, matchVal)) {
        return renderCtx.renderNodes(c.children, ctx)
      }
    }
    else {
      defaultCase = c.children
    }
  }
  return defaultCase ? renderCtx.renderNodes(defaultCase, ctx) : ''
}

export const bSwitchHandler: FlowDirectiveHandler<BirSwitch> = {
  kind: 'switch',
  lower: lowerSwitchDirective,
  render: renderSwitchDirective,
  tagName: 'b:switch',
}

