import type { BloggerDirectiveNode } from '../../../ast.js'
import type { SpecCatalog } from '../../../catalogs/index.js'
import type { BirOutput } from '../../types.js'
import type { DirectiveLowerContext } from '../types.js'
import { parseExpression } from '../../../ast.js'
import { evaluateExpression } from '../../../parser/index.js'
import { isSkinValue } from '../../../skin-compiler.js'

export function lowerDataOutput(
  node: BloggerDirectiveNode,
  ctx: DirectiveLowerContext,
): BirOutput[] {
  return [{
    expr: parseExpression(node.name, { catalog: ctx.catalog }),
    kind: 'output',
    source: 'data',
    tagName: node.name.slice(5),
  }]
}

export function renderDataOutput(
  node: BirOutput,
  ctx: Record<string, any>,
  catalog?: SpecCatalog,
): string {
  const val = evaluateExpression(node.expr, ctx)
  const cleanTag = (node.tagName ?? '').replace(/^data:/, '')

  if (val === undefined) {
    const missingTpl = catalog?.getRuntimeEvaluationStates().MISSING?.html_output_template
      ?? '<!--Can\'t find substitution for tag [{tag}]-->'
    return missingTpl.replace('{tag}', cleanTag)
  }

  if (val === null) {
    return ''
  }

  if (typeof val === 'object' && Object.prototype.toString.call(val) !== '[object String]' && !isSkinValue(val)) {
    const nonSingletonTpl = catalog?.getRuntimeEvaluationStates().NOT_SINGLETON?.html_output_template
      ?? '<!--Substitution is not a singleton for tag [{tag}]-->'
    return nonSingletonTpl.replace('{tag}', cleanTag)
  }

  return String(val)
}

