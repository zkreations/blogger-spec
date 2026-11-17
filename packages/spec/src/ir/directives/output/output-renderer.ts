import type { SpecCatalog } from '../../../catalogs/index.js'
import type { BirOutput } from '../../types.js'
import { renderEvalOutput } from './b-eval.js'
import { renderMessageOutput } from './b-message.js'
import { renderDataOutput } from './data-output.js'

export function renderBirOutput(
  node: BirOutput,
  ctx: Record<string, any>,
  catalog?: SpecCatalog,
): string {
  if (node.source === 'data') {
    return renderDataOutput(node, ctx, catalog)
  }
  if (node.source === 'eval') {
    return renderEvalOutput(node, ctx)
  }
  if (node.source === 'message') {
    if (!ctx.messages && (!node.params || node.params.length === 0)) {
      return ''
    }
    return renderMessageOutput(node, ctx, catalog)
  }
  return ''
}

