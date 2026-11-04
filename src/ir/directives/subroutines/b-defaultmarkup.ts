import type { BloggerDirectiveNode } from '../../../ast.js'
import type { DirectiveLowerContext } from '../types.js'
import { lowerIncludableDirective } from './b-includable.js'

export function lowerDefaultMarkup(node: BloggerDirectiveNode, context: DirectiveLowerContext): void {
  const typeAttr = node.attributes.find(a => a.name === 'type')
  const rawType = String(typeAttr?.value ?? 'Common')
  const targetTypes = rawType.split(',').map(t => t.trim()).filter(Boolean)
  const prevType = context.currentDefaultMarkupType

  for (const dmType of (targetTypes.length > 0 ? targetTypes : ['Common'])) {
    context.currentDefaultMarkupType = dmType
    for (const child of node.children) {
      if (child.type === 'Directive' && child.name === 'b:includable') {
        lowerIncludableDirective(child, context)
      }
    }
  }

  context.currentDefaultMarkupType = prevType
}

export function lowerDefaultMarkups(node: BloggerDirectiveNode, context: DirectiveLowerContext): void {
  for (const child of node.children) {
    if (child.type === 'Directive' && child.name === 'b:defaultmarkup') {
      lowerDefaultMarkup(child, context)
    }
  }
}
