import type { BloggerViewId } from '../generated/types.generated.js'
import type { BloggerBlogConfiguration } from './config-types.js'
import type { BloggerContextConfig, BloggerRawEntry } from './types.js'
import { getMockContext, getSpecCatalog } from '../catalogs/index.js'
import { buildArchiveHierarchy } from './archive-tree.js'
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
import { buildPopularPostsData } from './secondary-widgets.js'
import { createUrlMapper } from './url-mapper.js'

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

function applyBlogConfiguration(
  context: Record<string, any>,
  blogConfig: BloggerBlogConfiguration,
  viewId: BloggerViewId,
  activePosts?: any[],
): void {
  const spec = getSpecCatalog()
  context.blog = context.blog || {}
  context.widgetData = context.widgetData || {}
  context.widgetData.Blog1 = context.widgetData.Blog1 || {}
  const blog1 = context.widgetData.Blog1

  if (blogConfig.blog) {
    const blog = blogConfig.blog
    if (blog.locale) {
      context.blog.locale = blog.locale
      context.blog.localeUnderscoreDelimited = blog.locale.replace('-', '_')
      context.blog.languageDirection = spec.isRTL(blog.locale) ? 'rtl' : 'ltr'
    }
    if (blog.adultContent !== undefined) {
      context.blog.adultContent = blog.adultContent
    }
    if (blog.analyticsMeasurementId !== undefined) {
      context.blog.analyticsAccountNumber = blog.analyticsMeasurementId
      context.blog.analytics4 = blog.analyticsMeasurementId.startsWith('G-')
    }
    if (blog.isPrivate !== undefined) {
      context.blog.isPrivate = blog.isPrivate
      context.blog.isPrivateBlog = blog.isPrivate
    }
    if (blog.postsPerPage !== undefined) {
      blog1.numPosts = blog.postsPerPage
    }
    if (blog.commentLocation) {
      switch (blog.commentLocation) {
        case 'EMBEDDED':
          blog1.embedCommentForm = true
          blog1.showCmtPopup = false
          break
        case 'POPUP':
          blog1.embedCommentForm = false
          blog1.showCmtPopup = true
          break
        case 'FULL_PAGE':
          blog1.embedCommentForm = false
          blog1.showCmtPopup = false
          break
        case 'HIDDEN':
          blog1.embedCommentForm = false
          blog1.showCmtPopup = false
          break
      }
    }
    if (blog.commentFormMessage !== undefined) {
      blog1.messages = blog1.messages || {}
      blog1.messages.blogComment = blog.commentFormMessage
      context.messages = context.messages || {}
      context.messages.blogComment = blog.commentFormMessage
    }
  }

  const postsToApply = activePosts || (Array.isArray(blog1.posts) ? blog1.posts : [])
  for (const post of postsToApply) {
    if (!post || typeof post !== 'object')
      continue
    const entryCfg = blogConfig.entries?.[String(post.id)] || blogConfig.entries?.[post.id]
    if (entryCfg) {
      if (entryCfg.searchDescription !== undefined) {
        post.snippets = { ...(post.snippets || {}), short: entryCfg.searchDescription }
        const targetViewId = context.view?.postId ?? context.view?.pageId
        const isTargetPost = targetViewId !== undefined
          && (String(post.id) === String(targetViewId)
            || Number.parseInt(String(post.id), 10) === Number(targetViewId))
        if ((viewId === 'post' || viewId === 'static_page') && isTargetPost) {
          context.view.description = entryCfg.searchDescription
          context.blog.metaDescription = entryCfg.searchDescription
        }
      }
      if (entryCfg.commentMode !== undefined) {
        switch (entryCfg.commentMode) {
          case 'ALLOWED':
            post.allowComments = true
            post.allowNewComments = true
            break
          case 'RESTRICTED':
            post.allowComments = true
            post.allowNewComments = false
            break
          case 'DISABLED':
            post.allowComments = false
            post.allowNewComments = false
            break
        }
      }
    }
    if (blogConfig.blog?.commentLocation === 'HIDDEN') {
      post.allowComments = false
      post.allowNewComments = false
    }
  }

  if (blogConfig.widgets) {
    for (const [widgetKey, widgetValues] of Object.entries(blogConfig.widgets)) {
      context.widgetData[widgetKey] = deepMerge(context.widgetData[widgetKey] || {}, widgetValues)
      if (context.widgets && context.widgets[widgetKey]) {
        context.widgets[widgetKey] = deepMerge(context.widgets[widgetKey], widgetValues)
      }
    }
  }
}

export async function resolveBloggerContext(
  config: BloggerContextConfig = {},
): Promise<Record<string, any>> {
  const blogId = config.blogId || (config.config?.blog as any)?.id
  if (!blogId && !config.offline) {
    throw new Error('blogId is required to resolve Blogger context')
  }
  const effectiveBlogId = blogId || ''
  const viewId: BloggerViewId = config.view || 'homepage'
  const urlMode = config.urlMode || 'relative'
  const baseUrl = config.baseUrl

  // 1. Mock context canónico como base
  const context = getMockContext(viewId)

  // 2. Si se fuerza offline, aplicar configuración local y overrides
  if (config.offline) {
    if (viewId === 'error_404') {
      const blogLocale = config.overrides?.blog?.locale || config.config?.blog?.locale || context.blog?.locale || 'en'
      const spec = getSpecCatalog()
      const navMsg = spec.getWidgetNavMessage('Blog', blogLocale)
      context.widgetData.Blog1 = context.widgetData.Blog1 || {}
      context.widgetData.Blog1.navMessage = navMsg
      context.widgetData.Blog1.posts = []
      context.widgetData.Blog1.numPosts = 0
    }
    const cookieChoices = config.cookieChoices ?? config.config?.blog?.cookieChoices ?? false
    if (cookieChoices) {
      context.blog = context.blog || {}
      context.blog.cookieChoices = true
    }
    if (config.config) {
      applyBlogConfiguration(context, config.config, viewId)
    }
    if (context.widgetData) {
      for (const [key, val] of Object.entries(context.widgetData)) {
        const typeMatch = key.match(/^([a-z]+)\d+$/i)
        if (typeMatch && !context.widgetData[typeMatch[1]!]) {
          context.widgetData[typeMatch[1]!] = val
        }
      }
    }
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
    client.fetchPosts(effectiveBlogId, { maxResults: 25 }),
    client.fetchPages(effectiveBlogId),
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

    const blogLocale = config.overrides?.blog?.locale || config.config?.blog?.locale || 'en'
    const postSaa = config.overrides?.view?.saa || config.overrides?.saa || (config.overrides?.blog as any)?.saa
    const rawPosts: readonly BloggerRawEntry[] = feed.entry || []
    const postOptions = {
      saa: postSaa,
      dateFormat: config.config?.blog?.postDateFormat,
      titleAndEnclosureLinks: config.config?.blog?.titleAndEnclosureLinks,
    }
    const normalizedPosts = rawPosts.map(e => normalizePostEntry(e, mapper, effectiveBlogId, blogLocale, postOptions))

    const rawPages: readonly BloggerRawEntry[] = pagesResponse?.feed?.entry || []
    const normalizedPagePosts = rawPages.map(e => normalizePageAsPostEntry(e, mapper, effectiveBlogId, blogLocale, postOptions))

    const labelSorting = (config.overrides?.widgetData?.Label1?.sorting || 'ALPHA') as 'ALPHA' | 'FREQUENCY'
    const normalizedLabels = normalizeLabels(rawPosts, mapper, labelSorting)
    const blogMeta = normalizeBlogMetadata(feed, mapper, effectiveBlogId)
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
      if (context.messages.location !== undefined) {
        context.messages.location = spec.getLocalizedMessage('widgets.Blog.byline.location.label', blogLocale)
          || (blogLocale.startsWith('es') ? 'Ubicación' : 'Location')
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

    const activeUrl = config.overrides?.view?.url || config.targetUrl || context.view?.url || ''
    let searchParams: URLSearchParams | undefined
    let pathLabel: string | undefined
    let pathYear: number | undefined
    let pathMonth: number | undefined
    let pathDay: number | undefined
    if (activeUrl) {
      try {
        const parsed = new URL(activeUrl, 'https://blogger.local')
        searchParams = parsed.searchParams
        const labelMatch = parsed.pathname.match(/\/search\/label\/([^/?#]+)/)
        if (labelMatch) {
          pathLabel = decodeURIComponent(labelMatch[1].replace(/\+/g, ' '))
        }

        const dailyMatch = parsed.pathname.match(/\/(\d{4})_(\d{2})_(\d{2})_archive\.html/)
        if (dailyMatch) {
          pathYear = Number.parseInt(dailyMatch[1], 10)
          pathMonth = Number.parseInt(dailyMatch[2], 10)
          pathDay = Number.parseInt(dailyMatch[3], 10)
        }
        else {
          const monthlyMatch = parsed.pathname.match(/\/(\d{4})\/(\d{1,2})\/?$/)
          if (monthlyMatch) {
            pathYear = Number.parseInt(monthlyMatch[1], 10)
            pathMonth = Number.parseInt(monthlyMatch[2], 10)
          }
          else {
            const yearlyMatch = parsed.pathname.match(/\/(\d{4})\/?$/)
            if (yearlyMatch) {
              pathYear = Number.parseInt(yearlyMatch[1], 10)
            }
          }
        }
      }
      catch {
        // ignore
      }
    }

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
          context.view.postId = Number.parseInt(targetPost.id, 10) || targetPost.id
          context.view.title = targetPost.title
          context.view.url = targetPost.url
          context.view.description = targetPost.snippets.short

          // Fetch and attach comments for post
          const commentsResponse = await client.fetchComments(effectiveBlogId, targetPost.id)
          const rawComments: readonly BloggerRawEntry[] = commentsResponse?.feed?.entry || []
          if (rawComments.length > 0) {
            const normalizedComments = rawComments
              .map(c => normalizeCommentEntry(c, mapper, effectiveBlogId, blogLocale, config.config?.blog?.commentDateFormat))
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
          context.view.pageId = Number.parseInt(targetPage.id, 10) || targetPage.id
          context.view.title = targetPage.title
          context.view.url = targetPage.url
          context.view.description = targetPage.snippets.short
        }
      }
    }
    else if (viewId === 'error_404') {
      activePosts = []
      const spec = getSpecCatalog()
      const navMsg = spec.getWidgetNavMessage('Blog', blogLocale)
      blog1.navMessage = navMsg
    }
    else {
      // Multi-item views: obey active URL query parameters canonically
      const effectiveQ = searchParams?.get('q') || (config.overrides?.view?.search as any)?.query || (config.overrides?.view as any)?.searchQuery
      if (effectiveQ) {
        context.view = context.view || {}
        context.view.search = context.view.search || {}
        context.view.search.query = effectiveQ
        context.view.searchQuery = effectiveQ
        const isEs = blogLocale.startsWith('es')
        context.view.search.resultsMessage = isEs
          ? `Mostrando entradas que coinciden con la búsqueda de ${effectiveQ}`
          : `Showing posts matching the search for ${effectiveQ}`
        context.view.search.resultsMessageHtml = isEs
          ? `Mostrando entradas que coinciden con la búsqueda de <b>${effectiveQ}</b>`
          : `Showing posts matching the search for <b>${effectiveQ}</b>`
      }

      if (!effectiveQ && !pathLabel && !searchParams?.get('label') && searchParams?.get('updated-max')) {
        context.view = context.view || {}
        context.view.search = context.view.search || {}
        const isEs = blogLocale.startsWith('es')
        context.view.search.resultsMessage = isEs ? 'Mostrando entradas anteriores' : 'Showing older posts'
        context.view.search.resultsMessageHtml = isEs ? 'Mostrando entradas anteriores' : 'Showing older posts'
      }

      const effectiveLabel = pathLabel
        || searchParams?.get('label')
        || (config.overrides?.view?.search as any)?.label
        || (config.overrides?.view as any)?.searchLabel
      if (effectiveLabel) {
        context.view = context.view || {}
        context.view.search = context.view.search || {}
        context.view.search.label = effectiveLabel
        context.view.searchLabel = effectiveLabel

        const spec = getSpecCatalog()
        context.view.search.resultsMessage = spec.getFormattedGlobalMessage(
          'view.search.resultsMessage',
          blogLocale,
          { LABEL: effectiveLabel },
        )
        context.view.search.resultsMessageHtml = spec.getFormattedGlobalMessage(
          'view.search.resultsMessageHtml',
          blogLocale,
          { LABEL: effectiveLabel },
        )

        const normLabel = effectiveLabel.trim().toLowerCase()
        activePosts = activePosts.filter(p =>
          p.labels?.some(l => l.name?.trim().toLowerCase() === normLabel),
        )
      }

      const effectiveArchiveYear = pathYear
        || (config.overrides?.view?.archive as any)?.year
        || (config.overrides?.view as any)?.year
      const effectiveArchiveMonth = pathMonth
        || (config.overrides?.view?.archive as any)?.month
        || (config.overrides?.view as any)?.month
      const effectiveArchiveDay = pathDay
        || (config.overrides?.view?.archive as any)?.day
        || (config.overrides?.view as any)?.day

      if (effectiveArchiveYear) {
        context.view = context.view || {}
        context.view.archive = context.view.archive || {}
        context.view.archive.year = effectiveArchiveYear
        if (effectiveArchiveMonth) {
          context.view.archive.month = effectiveArchiveMonth
        }
        if (effectiveArchiveDay) {
          context.view.archive.day = effectiveArchiveDay
        }
        const spec = getSpecCatalog()
        context.view.archive.rangeMessage = spec.getArchiveRangeMessage(effectiveArchiveYear, effectiveArchiveMonth, blogLocale)

        activePosts = activePosts.filter((p) => {
          const m = p.publishedIso?.match(/^(\d{4})-(\d{2})-(\d{2})/)
          if (!m) {
            return true
          }
          const pYear = Number.parseInt(m[1], 10)
          const pMonth = Number.parseInt(m[2], 10)
          const pDay = Number.parseInt(m[3], 10)

          if (pYear !== effectiveArchiveYear) {
            return false
          }
          if (effectiveArchiveMonth && pMonth !== effectiveArchiveMonth) {
            return false
          }
          if (effectiveArchiveDay && pDay !== effectiveArchiveDay) {
            return false
          }
          return true
        })
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
        const blogOrigin = mapper.blogHost ? `https://${mapper.blogHost}` : ''

        if (effectiveLabel || viewId === 'label_search') {
          const encodedLabel = encodeURIComponent(effectiveLabel || '')
          const pageSize = maxResults || 20

          if (startIndex > 0 || updatedMax || updatedMin) {
            if (startIndex <= pageSize) {
              blog1.newerPageUrl = mapper.mapUrl(`${blogOrigin}/search/label/${encodedLabel}`)
            }
            else {
              const prevStart = Math.max(0, startIndex - pageSize)
              const firstPost = activePosts[0]
              const prevDate = firstPost?.publishedIso?.replace(/\.\d{3}/, '') || ''
              const byDateSuffix = byDateParam !== null ? `&by-date=${byDateParam}` : ''
              blog1.newerPageUrl = mapper.mapUrl(`${blogOrigin}/search/label/${encodedLabel}?updated-max=${prevDate}&max-results=${pageSize}&start=${prevStart}${byDateSuffix}`)
            }

            if (activePosts.length > 0) {
              const lastPost = activePosts[activePosts.length - 1]
              const nextDate = lastPost?.publishedIso?.replace(/\.\d{3}/, '') || ''
              const nextStart = startIndex + pageSize
              const byDateSuffix = byDateParam !== null ? `&by-date=${byDateParam}` : ''
              blog1.olderPageUrl = mapper.mapUrl(`${blogOrigin}/search/label/${encodedLabel}?updated-max=${nextDate}&max-results=${pageSize}&start=${nextStart}${byDateSuffix}`)
            }
            else {
              blog1.olderPageUrl = ''
            }
          }
          else {
            blog1.newerPageUrl = ''
            if (activePosts.length > 0) {
              const lastPost = activePosts[activePosts.length - 1]
              const nextDate = lastPost?.publishedIso?.replace(/\.\d{3}/, '') || ''
              blog1.olderPageUrl = mapper.mapUrl(`${blogOrigin}/search/label/${encodedLabel}?updated-max=${nextDate}&max-results=20&start=20&by-date=false`)
            }
            else {
              blog1.olderPageUrl = ''
            }
          }
        }
        else if (viewId.startsWith('archive_') || effectiveArchiveYear) {
          blog1.newerPageUrl = mapper.mapUrl(blogMeta.homepageUrl || (blogOrigin ? `${blogOrigin}/` : '/'))

          if (activePosts.length > 0) {
            const lastPost = activePosts[activePosts.length - 1]
            const hasOlderInBlog = normalizedPosts.some(p => (p.timestamp ?? 0) < (lastPost?.timestamp ?? 0))
            if (hasOlderInBlog) {
              const nextDate = lastPost?.publishedIso?.replace(/\.\d{3}/, '') || ''
              blog1.olderPageUrl = mapper.mapUrl(`${blogOrigin}/search?updated-max=${nextDate}`)
            }
            else {
              blog1.olderPageUrl = ''
            }
          }
          else {
            blog1.olderPageUrl = ''
          }
        }
        else if (viewId === 'post_listing' || updatedMax || updatedMin) {
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

    if (viewId === 'homepage' && config.config?.blog?.postsPerPage && !searchParams) {
      activePosts = activePosts.slice(0, config.config.blog.postsPerPage)
    }

    const spec = getSpecCatalog()
    blog1.posts = activePosts
    blog1.numPosts = activePosts.length
    blog1.title = spec.getWidgetDefaultTitle('Blog', blogLocale) || 'Blog Posts'
    context.widgetData.Blog1 = blog1
    context.widgetData.Blog = blog1

    if (config.config) {
      applyBlogConfiguration(context, config.config, viewId, activePosts)
    }

    // Inyectar datos en PageList1
    const currentPath = (viewId === 'static_page' ? context.view?.url || config.overrides?.view?.url : undefined)
    const normalizedPages = rawPages.map(e => normalizePageEntry(e, mapper, currentPath))
    const pageListTitle = spec.getWidgetDefaultTitle('PageList', blogLocale) || 'Pages'

    if (context.widgetData.PageList1) {
      context.widgetData.PageList1.links = normalizedPages
      context.widgetData.PageList1.title = pageListTitle
    }
    else {
      context.widgetData.PageList1 = {
        title: pageListTitle,
        links: normalizedPages,
      }
    }
    context.widgetData.PageList = context.widgetData.PageList1

    // Inyectar datos en Label1
    const labelTitle = spec.getWidgetDefaultTitle('Label', blogLocale) || 'Labels'
    if (context.widgetData.Label1) {
      context.widgetData.Label1.labels = normalizedLabels
      context.widgetData.Label1.title = labelTitle
      if (config.overrides?.widgetData?.Label1?.showFreqNumbers === undefined) {
        context.widgetData.Label1.showFreqNumbers = false
      }
    }
    else {
      context.widgetData.Label1 = {
        title: labelTitle,
        labels: normalizedLabels,
        showFreqNumbers: false,
      }
    }
    context.widgetData.Label = context.widgetData.Label1

    // Inyectar datos en Header1
    const headerTitle = headerData.title || spec.getWidgetDefaultTitle('Header', blogLocale)
    if (context.widgetData.Header1) {
      context.widgetData.Header1.title = headerTitle
      context.widgetData.Header1.description = headerData.description
      context.widgetData.Header1.url = headerData.url
    }
    else {
      context.widgetData.Header1 = {
        ...headerData,
        title: headerTitle,
      }
    }
    context.widgetData.Header = context.widgetData.Header1

    // Inyectar FeaturedPost1 con el primer post si está disponible
    if (normalizedPosts.length > 0) {
      const featured = normalizedPosts[0]
      context.widgetData.FeaturedPost1 = {
        title: spec.getWidgetDefaultTitle('FeaturedPost', blogLocale),
        postId: featured.id,
        postTitle: featured.title,
        snippet: featured.snippets.long,
        postUrl: featured.url,
      }
      context.widgetData.FeaturedPost = context.widgetData.FeaturedPost1
    }

    // Inyectar datos en BlogArchive1 si no existe
    if (!context.widgetData.BlogArchive1 && normalizedPosts.length > 0) {
      const archiveHierarchy = buildArchiveHierarchy(normalizedPosts, mapper, {
        locale: blogLocale,
        widgetId: 'BlogArchive1',
      })
      context.widgetData.BlogArchive1 = {
        title: spec.getWidgetDefaultTitle('BlogArchive', blogLocale),
        style: 'HIERARCHY',
        data: archiveHierarchy,
      }
      context.widgetData.BlogArchive = context.widgetData.BlogArchive1
    }

    // Inyectar datos en PopularPosts1 si no existe
    if (!context.widgetData.PopularPosts1 && normalizedPosts.length > 0) {
      context.widgetData.PopularPosts1 = buildPopularPostsData(normalizedPosts, spec, blogLocale, 5)
      context.widgetData.PopularPosts = context.widgetData.PopularPosts1
    }

    const cookieChoices = config.cookieChoices ?? config.config?.blog?.cookieChoices ?? false
    if (cookieChoices) {
      context.blog = context.blog || {}
      context.blog.cookieChoices = true
    }

    // Canonically ensure data:view.type contract
    if (context.view) {
      if (viewId === 'post' || viewId === 'static_page') {
        context.view.type = 'item'
      }
      else if (viewId === 'error_404') {
        context.view.type = 'error'
      }
      else {
        context.view.type = 'feed'
      }
    }
  }

  // 4. Overrides explícitos con máxima prioridad
  if (config.overrides) {
    return deepMerge(context, config.overrides)
  }

  return context
}
