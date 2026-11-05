import type { BloggerDirectiveNode, BloggerExpressionNode } from '../../../ast.js'
import type { BirMessageParam, BirOutput } from '../../types.js'
import type { DirectiveLowerContext } from '../types.js'
import type { SpecCatalog } from '../../../catalogs/index.js'
import { parseExpression } from '../../../ast.js'
import { getSpecCatalog } from '../../../catalogs/index.js'
import { evaluateExpression } from '../../../parser/index.js'

export function lowerMessageDirective(
  node: BloggerDirectiveNode,
  ctx: DirectiveLowerContext,
): BirOutput[] {
  const nameAttr = node.attributes.find(a => a.name === 'name')
  const rawName = String(nameAttr?.value ?? '')
  const cleanKey = rawName.replace(/^messages\./, '')
  const fullPath = `data:messages.${cleanKey}`

  const paramChildren = (node.children || []).filter(
    (c): c is BloggerDirectiveNode => c.type === 'Directive' && c.name === 'b:param',
  )

  const params: BirMessageParam[] = paramChildren.map((p) => {
    const rawPName = p.attributes.find(a => a.name === 'name')?.value
    const pName = typeof rawPName === 'string' ? rawPName : undefined
    const exprAttr = p.attributes.find(a => a.name === 'expr:value' || (a.name === 'value' && a.isExpression))
    const valAttr = p.attributes.find(a => a.name === 'value' && !a.isExpression)

    let expr: BloggerExpressionNode
    if (exprAttr) {
      if (typeof exprAttr.value === 'string') {
        expr = parseExpression(exprAttr.value, { catalog: ctx.catalog })
      }
      else {
        expr = exprAttr.value as BloggerExpressionNode
      }
    }
    else if (valAttr) {
      const valStr = typeof valAttr.value === 'string' ? valAttr.value : String(valAttr.value ?? '')
      expr = parseExpression(JSON.stringify(valStr), { catalog: ctx.catalog })
    }
    else {
      expr = parseExpression('""', { catalog: ctx.catalog })
    }

    return {
      name: pName,
      expr,
    }
  })

  return [{
    expr: parseExpression(fullPath, { catalog: ctx.catalog }),
    kind: 'output',
    source: 'message',
    tagName: 'b:message',
    messageKey: cleanKey,
    params: params.length > 0 ? params : undefined,
  }]
}

export function renderMessageOutput(
  node: BirOutput,
  ctx: Record<string, any>,
  catalog?: SpecCatalog,
): string {
  const cat = catalog ?? getSpecCatalog()
  const locale = ctx.blog?.locale || 'en'

  if (node.params && node.params.length > 0) {
    const evaluatedParams = node.params.map(p => ({
      name: p.name,
      value: evaluateExpression(p.expr, ctx),
    }))
    return cat.formatParameterizedMessage(node.messageKey || '', evaluatedParams, locale)
  }

  const val = evaluateExpression(node.expr, ctx)
  if (val !== undefined && val !== null && val !== '') {
    return String(val)
  }

  if (node.messageKey) {
    const localized = cat.getLocalizedMessage(node.messageKey, locale)
    if (localized !== undefined) {
      return localized
    }
  }

  return ''
}

export const bMessageHandler = {
  kind: 'output' as const,
  lower: lowerMessageDirective,
  render: renderMessageOutput,
  tagName: 'b:message',
}

