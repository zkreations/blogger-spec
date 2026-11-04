import type { BloggerDirectiveNode } from '../../../ast.js'
import type { BirOutput } from '../../types.js'
import type { DirectiveLowerContext } from '../types.js'
import { evaluateExpression } from '../../../parser/index.js'
import { isSkinValue } from '../../../skin-compiler.js'

export function lowerEvalDirective(
  node: BloggerDirectiveNode,
  ctx: DirectiveLowerContext,
): BirOutput[] {
  const exprAttr = node.attributes.find(a => a.name === 'expr' || a.name === 'value')
  return [{
    expr: ctx.ensureExpression(exprAttr?.value),
    kind: 'output',
    source: 'eval',
    tagName: 'b:eval',
  }]
}

export function renderEvalOutput(
  node: BirOutput,
  ctx: Record<string, any>,
): string {
  const val = evaluateExpression(node.expr, ctx)
  if (val === undefined || val === null) {
    return ''
  }
  if (typeof val === 'object' && Object.prototype.toString.call(val) !== '[object String]' && !isSkinValue(val)) {
    return ''
  }
  return String(val)
}

export const bEvalHandler = {
  kind: 'output' as const,
  lower: lowerEvalDirective,
  render: renderEvalOutput,
  tagName: 'b:eval',
}

