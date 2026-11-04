import type {
  BloggerDirectiveNode,
  BloggerExpressionNode,
  BloggerTemplateNode,
} from '../../../ast.js'
import type { BirIf } from '../../types.js'
import type { DirectiveLowerContext, DirectiveRenderContext, FlowDirectiveHandler } from '../types.js'
import { evaluateExpression } from '../../../parser/index.js'
import { isTruthy } from '../../../type-system.js'

export function lowerIfDirective(
  node: BloggerDirectiveNode,
  ctx: DirectiveLowerContext,
): BirIf {
  const ifCondAttr = node.attributes.find(a => a.name === 'cond' || a.name === 'test')
  const firstTest = ctx.ensureExpression(ifCondAttr?.value)

  const rawBranches: Array<{ test?: BloggerExpressionNode, rawChildren: BloggerTemplateNode[] }> = [
    { test: firstTest, rawChildren: [] },
  ]
  let currentBranch = rawBranches[0]!

  for (const child of node.children) {
    if (child.type === 'Directive' && (child.name === 'b:elseif' || (child.name as string) === 'b:else-if')) {
      const condAttr = child.attributes.find(a => a.name === 'cond' || a.name === 'test')
      currentBranch = { test: ctx.ensureExpression(condAttr?.value), rawChildren: [] }
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
      children: ctx.lowerNodes(ctx.filterContainerChildren(branch.rawChildren)),
    })),
  }
}

export function renderIfDirective(
  node: BirIf,
  ctx: Record<string, any>,
  renderCtx: DirectiveRenderContext,
): string {
  for (const branch of node.branches) {
    if (!branch.test || isTruthy(evaluateExpression(branch.test, ctx))) {
      return renderCtx.renderNodes(branch.children, ctx)
    }
  }
  return ''
}

export const bIfHandler: FlowDirectiveHandler<BirIf> = {
  kind: 'if',
  lower: lowerIfDirective,
  render: renderIfDirective,
  tagName: 'b:if',
}

