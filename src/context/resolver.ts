import type { BloggerViewId } from '../generated/types.generated.js'
import type { BloggerContextConfig, BloggerRawEntry } from './types.js'
import { getMockContext, getSpecCatalog } from '../catalogs/index.js'
import { BloggerFeedClient } from './client.js'
import {
  normalizeBlogMetadata,
  normalizeCommentEntry,
  normalizeHeader,
  normalizeLabels,
  normalizePageAsPostEntry,
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
    const postSaa = config.overrides?.view?.saa || config.overrides?.saa || (config.overrides?.blog as any)?.saa
    const rawPosts: readonly BloggerRawEntry[] = feed.entry || []
    const normalizedPosts = rawPosts.map(e => normalizePostEntry(e, mapper, blogId, blogLocale, postSaa))

    const rawPages: readonly BloggerRawEntry[] = pagesResponse?.feed?.entry || []
    const normalizedPagePosts = rawPages.map(e => normalizePageAsPostEntry(e, mapper, blogId, blogLocale))

    const labelSorting = (config.overrides?.widgetData?.Label1?.sorting || 'ALPHA') as 'ALPHA' | 'FREQUENCY'
    const normalizedLabels = normalizeLabels(rawPosts, mapper, labelSorting)
    const blogMeta = normalizeBlogMetadata(feed, mapper, blogId)
    const headerData = normalizeHeader(feed, mapper)

    // Fusionar metadatos del blog
    context.blog = deepMerge(context.blog, blogMeta)

    // Localizar mensajes conforme al idioma del blog
    if (blogLocale) {
      const spec = getSpecCatalog()
      const messagesMap = (spec as any).localesCatalog?.translations?.messages || {}
      context.messages = context.messages || {}
      for (const msgKey of Object.keys(messagesMap)) {
        const localized = spec.getLocalizedMessage(msgKey, blogLocale)
        if (localized) {
          context.messages[msgKey] = localized
        }
      }
    }

    if (viewId !== 'post' && viewId !== 'static_page') {
      context.view = context.view || {}
      if (!config.overrides?.view?.title) {
        context.view.title = blogMeta.title
      }
      if (!config.overrides?.view?.description) {
        context.view.description = blogMeta.description
      }
      if (viewId === 'homepage') {
        context.view.url = blogMeta.homepageUrl
      }
    }

    // Inicializar contenedores de widgets si no existen
    context.widgetData = context.widgetData || {}

    // Inyectar datos en Blog1
    const blog1 = context.widgetData.Blog1 || {}
    let activePosts = normalizedPosts.slice()

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
      else if (viewId === 'static_page') {
        const targetPage = (config.targetId
          ? normalizedPagePosts.find(p => p.id === config.targetId)
          : (config.targetUrl
              ? normalizedPagePosts.find(p => p.url === config.targetUrl || p.absoluteUrl === config.targetUrl)
              : (config.overrides?.view?.url
                  ? normalizedPagePosts.find(p => p.url === config.overrides?.view?.url || p.absoluteUrl === config.overrides?.view?.url)
                  : normalizedPagePosts[0]))) || normalizedPagePosts[0]

        if (targetPage) {
          activePosts = [targetPage]
          context.view = context.view || {}
          context.view.pageId = targetPage.id
          context.view.title = targetPage.title
          context.view.url = targetPage.url
          context.view.description = targetPage.snippets.short
        }
      }
    }
    else {
      // Multi-item views: obey active URL query parameters canonically
      const activeUrl = config.overrides?.view?.url || config.targetUrl || context.view?.url || ''
      let searchParams: URLSearchParams | undefined
      if (activeUrl) {
        try {
          const parsed = new URL(activeUrl, 'https://blogger.local')
          searchParams = parsed.searchParams
        }
        catch {
          // ignore
        }
      }

      const effectiveQ = searchParams?.get('q') || (config.overrides?.view?.search as any)?.query || (config.overrides?.view as any)?.searchQuery
      if (effectiveQ) {
        context.view = context.view || {}
        context.view.search = context.view.search || {}
        context.view.search.query = effectiveQ
        context.view.searchQuery = effectiveQ
      }

      const effectiveLabel = searchParams?.get('label') || (config.overrides?.view?.search as any)?.label || (config.overrides?.view as any)?.searchLabel
      if (effectiveLabel) {
        context.view = context.view || {}
        context.view.search = context.view.search || {}
        context.view.search.label = effectiveLabel
        context.view.searchLabel = effectiveLabel
      }

      if (searchParams) {
        const updatedMax = searchParams.get('updated-max')
        const updatedMin = searchParams.get('updated-min')
        const byDateParam = searchParams.get('by-date')

        if (updatedMax) {
          const maxTime = new Date(updatedMax).getTime()
          if (!Number.isNaN(maxTime)) {
            activePosts = activePosts.filter(p => (p.timestamp ?? 0) <= maxTime)
          }
        }

        if (updatedMin) {
          const minTime = new Date(updatedMin).getTime()
          if (!Number.isNaN(minTime)) {
            activePosts = activePosts.filter(p => (p.timestamp ?? 0) >= minTime)
          }
        }

        if (effectiveQ) {
          const qLower = effectiveQ.toLowerCase()
          activePosts = activePosts.filter(p =>
            p.title.toLowerCase().includes(qLower)
            || p.body.toLowerCase().includes(qLower)
            || p.labels.some(l => l.name.toLowerCase().includes(qLower)),
          )

          if (byDateParam !== 'true') {
            const escapedQ = qLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const regex = new RegExp(`\\b${escapedQ}\\b`, 'g')
            activePosts.sort((a, b) => {
              const textA = `${a.title} ${a.body}`.toLowerCase()
              const textB = `${b.title} ${b.body}`.toLowerCase()
              const countA = (textA.match(regex) || []).length
              const countB = (textB.match(regex) || []).length
              if (countB !== countA) {
                return countB - countA
              }
              return (b.timestamp ?? 0) - (a.timestamp ?? 0)
            })
          }
        }

        const maxResultsParam = searchParams.get('max-results')
        const maxResults = maxResultsParam ? Number.parseInt(maxResultsParam, 10) : undefined
        const startParam = searchParams.get('start')
        const startIndex = startParam ? Number.parseInt(startParam, 10) : 0

        const hasMoreOlder = Boolean(maxResults && maxResults > 0 && activePosts.length > maxResults)

        if (maxResults && maxResults > 0) {
          activePosts = activePosts.slice(0, maxResults)
        }

        // Canonical pagination URLs
        if (viewId === 'post_listing' || updatedMax || updatedMin) {
          const blogOrigin = mapper.blogHost ? `https://${mapper.blogHost}` : ''
          // Newer Posts link
          if (startIndex <= (maxResults || 8)) {
            blog1.newerPageUrl = mapper.mapUrl(blogMeta.homepageUrl || (blogOrigin ? `${blogOrigin}/` : '/'))
          }
          else {
            const prevStart = Math.max(0, startIndex - (maxResults || 8))
            const firstPost = activePosts[0]
            const prevDate = firstPost?.publishedIso?.replace(/\.\d{3}/, '') || ''
            const byDateSuffix = byDateParam !== null ? `&by-date=${byDateParam}` : ''
            blog1.newerPageUrl = mapper.mapUrl(`${blogOrigin}/search?updated-max=${prevDate}&max-results=${maxResults || 8}&start=${prevStart}${byDateSuffix}`)
          }

          // Older Posts link
          if (hasMoreOlder) {
            const lastPost = activePosts[activePosts.length - 1]
            const nextDate = lastPost?.publishedIso?.replace(/\.\d{3}/, '') || ''
            const nextStart = startIndex + (maxResults || 8)
            const byDateSuffix = byDateParam !== null ? `&by-date=${byDateParam}` : ''
            blog1.olderPageUrl = mapper.mapUrl(`${blogOrigin}/search?updated-max=${nextDate}&max-results=${maxResults || 8}&start=${nextStart}${byDateSuffix}`)
          }
          else {
            blog1.olderPageUrl = ''
          }
        }
        else {
          const nextLink = feed.link?.find(l => l.rel === 'next')?.href
          const prevLink = feed.link?.find(l => l.rel === 'previous')?.href
          blog1.olderPageUrl = nextLink ? mapper.mapUrl(nextLink) : ''
          blog1.newerPageUrl = prevLink ? mapper.mapUrl(prevLink) : ''
        }
      }
      else {
        const nextLink = feed.link?.find(l => l.rel === 'next')?.href
        const prevLink = feed.link?.find(l => l.rel === 'previous')?.href
        blog1.olderPageUrl = nextLink ? mapper.mapUrl(nextLink) : ''
        blog1.newerPageUrl = prevLink ? mapper.mapUrl(prevLink) : ''
      }
    }

    blog1.posts = activePosts
    blog1.numPosts = activePosts.length
    context.widgetData.Blog1 = blog1

    // Inyectar datos en PageList1
    const currentPath = (viewId === 'static_page' ? context.view?.url || config.overrides?.view?.url : undefined)
    const normalizedPages = rawPages.map(e => normalizePageEntry(e, mapper, currentPath))

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
