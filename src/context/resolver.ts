import type { BloggerViewId } from '../generated/types.generated.js'
import type { BloggerContextConfig, BloggerRawEntry } from './types.js'
import { getMockContext } from '../catalogs/index.js'
import { BloggerFeedClient } from './client.js'
import {
  normalizeBlogMetadata,
  normalizeCommentEntry,
  normalizeHeader,
  normalizeLabels,
  normalizePageEntry,
  normalizePostEntry,
} from './normalizer.js'
import { createUrlMapper } from './url-mapper.js'

export const DEFAULT_BLOG_ID = '5408826600056783247'

function deepMerge(target: any, source: any): any {
  if (!source || typeof source !== 'object') {
    return target
  }
  if (!target || typeof target !== 'object') {
    return Array.isArray(source) ? source.slice() : { ...source }
  }

  const result = Array.isArray(target) ? target.slice() : { ...target }

  for (const key of Object.keys(source)) {
    const val = source[key]
    if (val === undefined)
      continue

    if (Array.isArray(val)) {
      result[key] = val.slice()
    }
    else if (val && typeof val === 'object') {
      result[key] = deepMerge(result[key] || {}, val)
    }
    else {
      result[key] = val
    }
  }

  return result
}

export async function resolveBloggerContext(
  config: BloggerContextConfig = {},
): Promise<Record<string, any>> {
  const blogId = config.blogId || DEFAULT_BLOG_ID
  const viewId: BloggerViewId = config.view || 'homepage'
  const urlMode = config.urlMode || 'relative'
  const baseUrl = config.baseUrl

  // 1. Mock context canónico como base
  const context = getMockContext(viewId)

  // 2. Si se fuerza offline, solo aplicar overrides sobre el mock
  if (config.offline) {
    if (config.overrides) {
      return deepMerge(context, config.overrides)
    }
    return context
  }

  // 3. Cliente de feeds con inyección de fetch opcional
  const client = new BloggerFeedClient({
    fetchFn: config.fetch,
    defaultTtlMs: config.cache?.ttlMs,
  })

  // Consulta paralela de posts y páginas
  const [postsResponse, pagesResponse] = await Promise.all([
    client.fetchPosts(blogId, { maxResults: 25 }),
    client.fetchPages(blogId),
  ])

  const feed = postsResponse?.feed

  if (feed) {
    // Derivar host del blog del feed
    const alternateLink = feed.link?.find(l => l.rel === 'alternate')?.href || ''
    let derivedHost = ''
    try {
      if (alternateLink) {
        derivedHost = new URL(alternateLink).host
      }
    }
    catch {
      derivedHost = ''
    }

    const mapper = createUrlMapper({
      blogHost: derivedHost,
      urlMode,
      baseUrl,
    })

    const blogLocale = config.overrides?.blog?.locale || 'en'
    const rawPosts: readonly BloggerRawEntry[] = feed.entry || []
    const normalizedPosts = rawPosts.map(e => normalizePostEntry(e, mapper, blogId, blogLocale))

    const rawPages: readonly BloggerRawEntry[] = pagesResponse?.feed?.entry || []
    const normalizedPages = rawPages.map(e => normalizePageEntry(e, mapper))

    const labelSorting = (config.overrides?.widgetData?.Label1?.sorting || 'ALPHA') as 'ALPHA' | 'FREQUENCY'
    const normalizedLabels = normalizeLabels(rawPosts, mapper, labelSorting)
    const blogMeta = normalizeBlogMetadata(feed, mapper, blogId)
    const headerData = normalizeHeader(feed, mapper)

    // Fusionar metadatos del blog
    context.blog = deepMerge(context.blog, blogMeta)

    if (viewId === 'homepage') {
      context.view = context.view || {}
      context.view.title = blogMeta.title
      context.view.description = blogMeta.description
      context.view.url = blogMeta.homepageUrl
    }

    // Inicializar contenedores de widgets si no existen
    context.widgetData = context.widgetData || {}

    // Inyectar datos en Blog1
    const blog1 = context.widgetData.Blog1 || {}
    let activePosts = normalizedPosts

    if (viewId === 'post' || viewId === 'static_page') {
      if (viewId === 'post') {
        const targetPost = (config.targetId
          ? normalizedPosts.find(p => p.id === config.targetId)
          : (config.targetUrl
              ? normalizedPosts.find(p => p.url === config.targetUrl || p.absoluteUrl === config.targetUrl)
              : (config.overrides?.view?.url
                  ? normalizedPosts.find(p => p.url === config.overrides?.view?.url || p.absoluteUrl === config.overrides?.view?.url)
                  : normalizedPosts[0]))) || normalizedPosts[0]

        if (targetPost) {
          activePosts = [targetPost]
          context.view = context.view || {}
          context.view.postId = targetPost.id
          context.view.title = targetPost.title
          context.view.url = targetPost.url
          context.view.description = targetPost.snippets.short

          // Fetch and attach comments for post
          const commentsResponse = await client.fetchComments(blogId, targetPost.id)
          const rawComments: readonly BloggerRawEntry[] = commentsResponse?.feed?.entry || []
          if (rawComments.length > 0) {
            const normalizedComments = rawComments
              .map(c => normalizeCommentEntry(c, mapper, blogId, blogLocale))
              .sort((a, b) => a.timestampValue - b.timestampValue)
            ;(targetPost as any).comments = normalizedComments
            ;(targetPost as any).numberOfComments = normalizedComments.length
          }
        }
      }
    }

    const nextLink = feed.link?.find(l => l.rel === 'next')?.href
    const prevLink = feed.link?.find(l => l.rel === 'previous')?.href
    blog1.olderPageUrl = nextLink ? mapper.mapUrl(nextLink) : ''
    blog1.newerPageUrl = prevLink ? mapper.mapUrl(prevLink) : ''

    blog1.posts = activePosts
    blog1.numPosts = activePosts.length
    context.widgetData.Blog1 = blog1

    // Inyectar datos en PageList1
    if (context.widgetData.PageList1) {
      context.widgetData.PageList1.links = normalizedPages
    }
    else {
      context.widgetData.PageList1 = {
        title: 'Páginas',
        links: normalizedPages,
      }
    }

    // Inyectar datos en Label1
    if (context.widgetData.Label1) {
      context.widgetData.Label1.labels = normalizedLabels
      if (config.overrides?.widgetData?.Label1?.showFreqNumbers === undefined) {
        context.widgetData.Label1.showFreqNumbers = false
      }
    }
    else {
      context.widgetData.Label1 = {
        title: 'Etiquetas',
        labels: normalizedLabels,
        showFreqNumbers: false,
      }
    }

    // Inyectar datos en Header1
    if (context.widgetData.Header1) {
      context.widgetData.Header1.title = headerData.title
      context.widgetData.Header1.description = headerData.description
      context.widgetData.Header1.url = headerData.url
    }
    else {
      context.widgetData.Header1 = headerData
    }

    // Inyectar FeaturedPost1 con el primer post si está disponible
    if (normalizedPosts.length > 0) {
      const featured = normalizedPosts[0]
      context.widgetData.FeaturedPost1 = {
        title: 'Entrada destacada',
        postId: featured.id,
        postTitle: featured.title,
        snippet: featured.snippets.long,
        postUrl: featured.url,
      }
    }
  }

  // 4. Overrides explícitos con máxima prioridad
  if (config.overrides) {
    return deepMerge(context, config.overrides)
  }

  return context
}
