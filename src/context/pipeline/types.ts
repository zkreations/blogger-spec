import type { SpecCatalog } from '../../catalogs/spec-catalog.js'
import type { BloggerViewId } from '../../generated/types.generated.js'
import type { BloggerContextConfig, BloggerRawEntry, BloggerUrlMode, DiscoveredWidget } from '../types.js'
import type { UrlMapper } from '../url-mapper.js'
import type { BloggerExtractedAuthor } from '../widget-author.js'

export interface ResolutionState {
  readonly config: BloggerContextConfig
  readonly spec: SpecCatalog
  mapper: UrlMapper
  viewId: BloggerViewId
  readonly blogLocale: string
  readonly blogTimeZone?: string
  readonly effectiveBlogId: string
  readonly urlMode: BloggerUrlMode
  readonly baseUrl?: string
  activeUrl: string
  currentPath?: string
  rawPosts: readonly BloggerRawEntry[]
  rawPages: readonly BloggerRawEntry[]
  normalizedPosts: readonly any[]
  normalizedPages: readonly any[]
  normalizedLabels: readonly any[]
  activePosts: any[]
  headerData: any
  blog1: Record<string, any>
  discoveredWidgets: Map<string, DiscoveredWidget>
  blogAuthor?: BloggerExtractedAuthor
  feed?: any
  resolvedRoute?: any
  isPureMockFallback?: boolean
}

export interface ContextStage {
  readonly name: string
  readonly process: (context: Record<string, any>, state: ResolutionState) => Promise<void> | void
}
