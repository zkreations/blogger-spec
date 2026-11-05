import type { BloggerDirectiveNode } from '../../../ast.js'
import type { BirComment } from '../../types.js'

export function lowerCommentDirective(
  node: BloggerDirectiveNode,
): BirComment[] {
  const renderAttr = node.attributes?.find(a => a.name === 'render' || a.name === 'expr:render')
  if (!renderAttr) {
    return []
  }
  const val = String(renderAttr.value ?? '').trim().toLowerCase()
  if (val !== 'true' && val !== 'yes') {
    return []
  }

  let commentText = ''
  for (const c of node.children) {
    if (c.type === 'Text') {
      commentText += c.value
    }
  }
  return [{ kind: 'comment', value: commentText }]
}

export function renderCommentNode(node: BirComment): string {
  return `<!--${node.value}-->`
}

export const bCommentHandler = {
  kind: 'comment' as const,
  lower: lowerCommentDirective,
  render: renderCommentNode,
  tagName: 'b:comment',
}
