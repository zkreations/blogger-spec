import type { BloggerViewId } from '../generated/types.generated.js'
import type { ResolutionState } from './pipeline/index.js'
import type { BloggerContextConfig } from './types.js'
import { getMockContext, getSpecCatalog } from '../catalogs/index.js'
import { pureDeepMerge as deepMerge } from '../core/common.js'
import {
  BaseStage,
  buildWidgetsCollection,
  CollectionStage,
  createCleanBaseContext,
  FeedStage,
  PaginationStage,
  RoutingStage,
  SearchFilterStage,
  WidgetStage,
} from './pipeline/index.js'
import { resolveBloggerRoute } from './routing.js'
import { createUrlMapper } from './url-mapper.js'

export { buildWidgetsCollection, createCleanBaseContext }

export async function resolveBloggerContext(
  config: BloggerContextConfig = {},
): Promise<Record<string, any>> {
  const activeUrl = config.overrides?.view?.url || config.targetUrl || ''
  const resolvedTargetRoute = activeUrl ? resolveBloggerRoute(activeUrl) : undefined
  const viewId: BloggerViewId = config.view || (resolvedTargetRoute?.viewId as BloggerViewId) || 'homepage'

  // Pure mock fallback: offline: true without any blogId, config, template, entries, commentFrameBaseUrl, or overrides
  const isPureMockFallback = Boolean(
    config.offline
    && !config.config
    && !config.templateXml
    && !config.templateAst
    && !config.blogId
    && !config.commentFrameBaseUrl,
  )

  if (isPureMockFallback) {
    const ctx = getMockContext(viewId, config.overrides)
    if (config.cookieChoices) {
      ctx.blog = ctx.blog || {}
      ctx.blog.cookieChoices = true
    }
    return ctx
  }

  const blogId = config.blogId || (config.config?.blog as any)?.id
  if (!blogId && !config.offline) {
    throw new Error('blogId is required to resolve Blogger context')
  }
  const effectiveBlogId = blogId || ''
  const urlMode = config.urlMode || 'relative'
  const baseUrl = config.baseUrl
  const spec = getSpecCatalog()
  const blogLocale = config.overrides?.blog?.locale || config.config?.blog?.locale || 'en'
  const blogTimeZone = config.config?.blog?.timeZone

  // Compute initial URL mapper
  let mapper = createUrlMapper({ urlMode, baseUrl })
  if (config.offline) {
    const parsedActiveHost = activeUrl.startsWith('http') ? new URL(activeUrl).host : undefined
    const derivedHost = baseUrl ? new URL(baseUrl, 'https://example.blogspot.com').host : (parsedActiveHost || 'example.blogspot.com')
    const effectiveUrlMode = config.urlMode || (parsedActiveHost ? 'remote' : urlMode)
    mapper = createUrlMapper({ urlMode: effectiveUrlMode, baseUrl, blogHost: derivedHost })
  }

  const state: ResolutionState = {
    config,
    spec,
    mapper,
    viewId,
    blogLocale,
    blogTimeZone,
    effectiveBlogId,
    urlMode,
    baseUrl,
    activeUrl,
    rawPosts: [],
    rawPages: [],
    normalizedPosts: [],
    normalizedPages: [],
    normalizedLabels: [],
    activePosts: [],
    headerData: {},
    blog1: {},
    discoveredWidgets: new Map(),
    resolvedRoute: resolvedTargetRoute,
  }

  const context: Record<string, any> = {}

  const pipeline = [
    new BaseStage(),
    new RoutingStage(),
    new FeedStage(),
    new SearchFilterStage(),
    new PaginationStage(),
    new WidgetStage(),
    new CollectionStage(),
  ]

  for (const stage of pipeline) {
    await stage.process(context, state)
  }

  if (config.overrides) {
    return deepMerge(context, config.overrides)
  }

  return context
}
