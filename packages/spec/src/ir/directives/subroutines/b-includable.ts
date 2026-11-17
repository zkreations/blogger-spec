import type { BloggerDirectiveNode } from '../../../ast.js'
import type { BloggerIncludableResolutionTier } from '../../../types.js'
import type { BirIncludable } from '../../types.js'
import type { DirectiveLowerContext } from '../types.js'

export function lowerIncludableDirective(
  node: BloggerDirectiveNode,
  context: DirectiveLowerContext,
  tierOverride?: Exclude<BloggerIncludableResolutionTier, 'unresolved'>,
  ownerWidgetOverride?: string,
): void {
  const idAttr = node.attributes.find(a => a.name === 'id')
  const varAttr = node.attributes.find(a => a.name === 'var')
  const id = String(idAttr?.value ?? '')

  if (!id) {
    return
  }

  // super.* namespace is strictly reserved for platform_server inclusions
  if (id.startsWith('super.') && (context.currentDefaultMarkupType || context.currentWidgetId)) {
    return
  }

  const params: string[] = []
  if (varAttr?.value) {
    params.push(String(varAttr.value))
  }

  let tier: Exclude<BloggerIncludableResolutionTier, 'unresolved'>
  let ownerWidgetId: string | undefined

  if (tierOverride) {
    tier = tierOverride
    ownerWidgetId = ownerWidgetOverride
  }
  else if (context.currentWidgetId) {
    tier = 'local_widget'
    ownerWidgetId = context.currentWidgetId
  }
  else if (context.currentDefaultMarkupType) {
    const dmType = context.currentDefaultMarkupType
    if (dmType === 'Common') {
      tier = 'shared_common'
    }
    else if (dmType === 'All') {
      tier = 'universal_widget'
    }
    else {
      tier = 'gadget_specific'
      ownerWidgetId = dmType
    }
  }
  else {
    tier = 'shared_common'
  }

  const includable: BirIncludable = {
    id,
    tier,
    ...(ownerWidgetId ? { ownerWidgetId } : {}),
    params,
    body: context.lowerNodes(context.filterContainerChildren(node.children)),
  }

  if (context.symbolTable) {
    if (tier === 'local_widget' && ownerWidgetId) {
      context.symbolTable[`widget:${ownerWidgetId}:${id}`] = includable
    }
    else if (tier === 'gadget_specific' && ownerWidgetId) {
      context.symbolTable[`gadget:${ownerWidgetId}:${id}`] = includable
    }
    else if (tier === 'universal_widget') {
      context.symbolTable[`all:${id}`] = includable
    }
    else if (tier === 'shared_common') {
      context.symbolTable[`common:${id}`] = includable
    }
    else {
      context.symbolTable[`server:${id}`] = includable
    }
  }
}
