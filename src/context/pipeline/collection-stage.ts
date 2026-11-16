import type { DiscoveredWidget } from '../types.js'
import type { ContextStage, ResolutionState } from './types.js'

export function buildWidgetsCollection(
  discoveredWidgets: Map<string, DiscoveredWidget>,
  widgetData: Record<string, any>,
): any[] {
  const collection: any[] = []
  const byType: Record<string, any[]> = {}

  for (const w of discoveredWidgets.values()) {
    const fullData = widgetData[w.id] || {}
    if (w.visible === false || fullData.visible === false) {
      continue
    }
    const descriptor: Record<string, any> = {
      id: w.id,
      sectionId: w.sectionId || '',
      title: w.title ?? fullData.title ?? '',
      type: w.type,
      ...(w.version !== undefined ? { version: w.version } : {}),
    }

    // Extended properties per Blogger Layouts v3 specification (Blog, FeaturedPost, PopularPosts)
    if (w.type === 'Blog') {
      if (fullData.posts)
        descriptor.posts = fullData.posts
      if (fullData.allBylineItems)
        descriptor.allBylineItems = fullData.allBylineItems
      if (fullData.headerByline)
        descriptor.headerByline = fullData.headerByline
      if (fullData.footerBylines)
        descriptor.footerBylines = fullData.footerBylines
    }
    else if (w.type === 'FeaturedPost') {
      if (fullData.postId !== undefined)
        descriptor.postId = fullData.postId
    }
    else if (w.type === 'PopularPosts') {
      if (fullData.posts)
        descriptor.posts = fullData.posts
    }

    collection.push(descriptor)

    // Direct access by instance ID: data:widgets.Blog1, data:widgets.Profile1
    ;(collection as any)[w.id] = descriptor

    if (!byType[w.type]) {
      byType[w.type] = []
    }
    byType[w.type].push(descriptor)
  }

  // Type-filtered sub-arrays: data:widgets.Blog, data:widgets.Profile, etc.
  for (const [type, list] of Object.entries(byType)) {
    const typeArray: any = [...list]
    Object.defineProperty(typeArray, 'first', {
      get: () => list[0],
      enumerable: false,
      configurable: true,
    })
    Object.defineProperty(typeArray, 'last', {
      get: () => list[list.length - 1],
      enumerable: false,
      configurable: true,
    })
    ;(collection as any)[type] = typeArray
  }

  // Collection modifiers on the root collection
  Object.defineProperty(collection, 'first', {
    get: () => collection[0],
    enumerable: false,
    configurable: true,
  })
  Object.defineProperty(collection, 'last', {
    get: () => collection[collection.length - 1],
    enumerable: false,
    configurable: true,
  })

  return collection
}

export class CollectionStage implements ContextStage {
  readonly name = 'collection'

  process(context: Record<string, any>, state: ResolutionState): void {
    context.widgets = buildWidgetsCollection(state.discoveredWidgets, context.widgetData)
  }
}
