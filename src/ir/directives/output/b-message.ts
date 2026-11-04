import type { BloggerDirectiveNode } from '../../../ast.js'
import type { BirOutput } from '../../types.js'
import type { DirectiveLowerContext } from '../types.js'
import { parseExpression } from '../../../ast.js'
import { evaluateExpression } from '../../../parser/index.js'

export function lowerMessageDirective(
  node: BloggerDirectiveNode,
  ctx: DirectiveLowerContext,
): BirOutput[] {
  const nameAttr = node.attributes.find(a => a.name === 'name')
  const msgName = String(nameAttr?.value ?? '')
  const fullPath = msgName.startsWith('messages.') ? `data:${msgName}` : `data:messages.${msgName}`
  return [{
    expr: parseExpression(fullPath, { catalog: ctx.catalog }),
    kind: 'output',
    source: 'message',
    tagName: 'b:message',
  }]
}

export function renderMessageOutput(
  node: BirOutput,
  ctx: Record<string, any>,
): string {
  const val = evaluateExpression(node.expr, ctx)
  if (val === undefined || val === null) {
    return ''
  }
  return String(val)
}

export const bMessageHandler = {
  kind: 'output' as const,
  lower: lowerMessageDirective,
  render: renderMessageOutput,
  tagName: 'b:message',
}

