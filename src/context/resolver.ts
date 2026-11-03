import type { BloggerViewId } from '../generated/types.generated.js'
import type { BloggerBlogConfiguration } from './config-types.js'
import type { BloggerContextConfig, BloggerRawEntry, DiscoveredWidget } from './types.js'
import { getMockContext, getSpecCatalog } from '../catalogs/index.js'
import { buildArchiveHierarchy } from './archive-tree.js'
import { BloggerFeedClient } from './client.js'
import {
  extractId,
  normalizeBlogMetadata,
  normalizeCommentEntry,
  normalizeHeader,
  normalizeLabels,
  normalizePageAsPostEntry,
  normalizePageEntry,
  normalizePostEntry,
} from './normalizer.js'
import { resolveBloggerRoute } from './routing.js'
import { buildPopularPostsData } from './secondary-widgets.js'
import { createUrlMapper } from './url-mapper.js'
import {
  extractTemplateWidgets,
  normalizeLinkItem,
  parseCanonicalWidgetId,
} from './widget-extractor.js'

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
  if (blogConfig.blog?.commentFrameBaseUrl) {
    const base = blogConfig.blog.commentFrameBaseUrl
    const separator = base.includes('?') ? '&' : '?'
    const locale = blogConfig.blog.locale || context.blog?.locale || 'en'
    const origin = context.blog?.homepageUrl || ''
    for (const post of postsToApply) {
      if (!post || typeof post !== 'object')
        continue
      const id = post.id ? String(post.id) : ''
      const queryParts = [
        `po=${encodeURIComponent(id)}`,
        `hl=${encodeURIComponent(locale)}`,
      ]
      if (origin) {
        queryParts.push(`origin=${encodeURIComponent(origin)}`)
      }
      post.commentFormIframeSrc = `${base}${separator}${queryParts.join('&')}`
    }
  }
  for (const post of postsToApply) {
    if (!post || typeof post !== 'object')
      continue
    const entryCfg = blogConfig.entries?.[String(post.id)] || blogConfig.entries?.[post.id]
    if (entryCfg) {
      if (entryCfg.link !== undefined) {
        post.link = entryCfg.link
      }
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

interface WidgetHydrationOptions {
  context: Record<string, any>
  config: BloggerContextConfig
  spec: any
  mapper: any
  currentPath?: string
  blogLocale: string
  blogTimeZone?: string
  rawPages: readonly BloggerRawEntry[]
  rawPosts: readonly BloggerRawEntry[]
  normalizedPages: readonly any[]
  normalizedLabels: readonly any[]
  normalizedPosts: readonly any[]
  activePosts: readonly any[]
  headerData: any
  blog1: Record<string, any>
}

function hydrateAllWidgets(options: WidgetHydrationOptions): void {
  const {
    context,
    config,
    spec,
    mapper,
    currentPath,
    blogLocale,
    blogTimeZone,
    normalizedPages,
    normalizedLabels,
    normalizedPosts,
    activePosts,
    headerData,
    blog1,
  } = options

  const discoveredWidgets = new Map<string, DiscoveredWidget>()

  // 1. Template XML or AST
  if (config.templateAst || config.templateXml) {
    const fromTemplate = extractTemplateWidgets(config.templateAst || config.templateXml!, spec)
    for (const w of fromTemplate) {
      discoveredWidgets.set(w.id, w)
    }
  }

  // 2. config.widgets
  if (config.config?.widgets) {
    for (const key of Object.keys(config.config.widgets)) {
      const parsed = parseCanonicalWidgetId(key)
      if (parsed && !discoveredWidgets.has(key)) {
        discoveredWidgets.set(key, { id: key, type: parsed.type })
      }
    }
  }

  // 3. overrides.widgetData
  if (config.overrides?.widgetData) {
    for (const key of Object.keys(config.overrides.widgetData)) {
      const parsed = parseCanonicalWidgetId(key)
      if (parsed && !discoveredWidgets.has(key)) {
        discoveredWidgets.set(key, { id: key, type: parsed.type })
      }
    }
  }

  // 4. Existing context.widgetData keys
  if (context.widgetData) {
    for (const key of Object.keys(context.widgetData)) {
      const parsed = parseCanonicalWidgetId(key)
      if (parsed && !discoveredWidgets.has(key)) {
        discoveredWidgets.set(key, { id: key, type: parsed.type })
      }
    }
  }

  // 5. Standard fallbacks if their types are not present
  if (![...discoveredWidgets.values()].some(w => w.type === 'Blog')) {
    discoveredWidgets.set('Blog1', { id: 'Blog1', type: 'Blog' })
  }
  if (![...discoveredWidgets.values()].some(w => w.type === 'Header')) {
    discoveredWidgets.set('Header1', { id: 'Header1', type: 'Header' })
  }
  if (![...discoveredWidgets.values()].some(w => w.type === 'PageList')) {
    discoveredWidgets.set('PageList1', { id: 'PageList1', type: 'PageList' })
  }
  if (![...discoveredWidgets.values()].some(w => w.type === 'Label')) {
    discoveredWidgets.set('Label1', { id: 'Label1', type: 'Label' })
  }
  if (normalizedPosts.length > 0 && ![...discoveredWidgets.values()].some(w => w.type === 'FeaturedPost')) {
    discoveredWidgets.set('FeaturedPost1', { id: 'FeaturedPost1', type: 'FeaturedPost' })
  }
  if (normalizedPosts.length > 0 && ![...discoveredWidgets.values()].some(w => w.type === 'BlogArchive')) {
    discoveredWidgets.set('BlogArchive1', { id: 'BlogArchive1', type: 'BlogArchive' })
  }

  // 6. Hydrate each instance in cascade
  for (const [widgetId, widget] of discoveredWidgets) {
    const type = widget.type
    const genericTypeConfig = config.config?.widgets?.[type]
    const templateSettings = widget.settings
    const instanceConfig = config.config?.widgets?.[widgetId]
    const instanceOverrides = config.overrides?.widgetData?.[widgetId]
    const existingData = context.widgetData[widgetId] || {}

    // Cascade: Existing mock base -> Type defaults -> Template settings -> Instance config -> Instance overrides
    let merged = deepMerge({}, existingData)
    if (genericTypeConfig) {
      merged = deepMerge(merged, genericTypeConfig)
    }
    if (templateSettings) {
      merged = deepMerge(merged, templateSettings)
    }
    if (instanceConfig) {
      merged = deepMerge(merged, instanceConfig)
    }
    if (instanceOverrides) {
      merged = deepMerge(merged, instanceOverrides)
    }

    switch (type) {
      case 'PageList': {
        const rawLinks = instanceOverrides?.links || instanceConfig?.links || templateSettings?.links || genericTypeConfig?.links || merged.links
        let links: any[]
        if (Array.isArray(rawLinks) && rawLinks.length > 0) {
          links = rawLinks
            .map((l: any) => normalizeLinkItem(l))
            .map((l: any) => ({
              ...l,
              isCurrentPage: l.isCurrentPage ?? Boolean(currentPath && (l.href === currentPath || mapper.mapUrl(l.href) === currentPath)),
            }))
        }
        else {
          links = normalizedPages.slice()
        }
        const hasExplicitInstanceLinks = Array.isArray(instanceConfig?.links) || Array.isArray(instanceOverrides?.links)
        if (merged.homeTitle && links.length > 0 && links[0] && !hasExplicitInstanceLinks) {
          links[0] = { ...links[0], title: String(merged.homeTitle) }
        }
        const title = instanceOverrides?.title || instanceConfig?.title || widget.title || genericTypeConfig?.title || merged.title || spec.getWidgetDefaultTitle('PageList', blogLocale) || 'Pages'
        context.widgetData[widgetId] = {
          ...merged,
          title,
          links,
        }
        break
      }

      case 'Label': {
        const sorting = (merged.sorting || config.overrides?.widgetData?.Label1?.sorting || 'ALPHA').toUpperCase()
        let labels = normalizedLabels
        if (sorting === 'FREQUENCY') {
          labels = [...normalizedLabels].sort((a: any, b: any) => (b.count ?? 0) - (a.count ?? 0) || a.name.localeCompare(b.name))
        }
        const showFreqNumbers = merged.showFreqNumbers ?? (config.overrides?.widgetData?.[widgetId]?.showFreqNumbers ?? false)
        const title = instanceOverrides?.title || instanceConfig?.title || widget.title || genericTypeConfig?.title || merged.title || spec.getWidgetDefaultTitle('Label', blogLocale) || 'Labels'
        context.widgetData[widgetId] = {
          ...merged,
          title,
          labels,
          showFreqNumbers,
        }
        break
      }

      case 'Header': {
        const title = instanceOverrides?.title || instanceConfig?.title || widget.title || genericTypeConfig?.title || headerData.title || spec.getWidgetDefaultTitle('Header', blogLocale)
        const description = instanceOverrides?.description || instanceConfig?.description || (widget.settings as any)?.description || genericTypeConfig?.description || headerData.description
        const url = instanceOverrides?.url || instanceConfig?.url || (widget.settings as any)?.url || genericTypeConfig?.url || headerData.url
        context.widgetData[widgetId] = {
          ...headerData,
          ...merged,
          title,
          description,
          url,
        }
        break
      }

      case 'Blog': {
        const title = merged.title || widget.title || spec.getWidgetDefaultTitle('Blog', blogLocale) || 'Blog Posts'
        const baseBylineItems: Array<{ name: string, label: string }> = Array.isArray(merged.allBylineItems) && merged.allBylineItems.length > 0
          ? merged.allBylineItems
          : (Array.isArray(blog1.allBylineItems) && blog1.allBylineItems.length > 0
            ? blog1.allBylineItems
            : [
                { name: 'share', label: 'Share' },
                { name: 'author', label: 'By' },
                { name: 'timestamp', label: 'at' },
                { name: 'comments', label: 'Comments' },
                { name: 'icons', label: 'Icons' },
                { name: 'labels', label: 'Labels' },
                { name: 'location', label: 'Location' },
              ])

        const settingMap: Record<string, boolean | undefined> = {
          author: merged.showAuthor !== false,
          timestamp: merged.showTimestamp !== false,
          labels: merged.showLabels !== false,
          location: merged.showLocation !== false,
          comments: merged.showCommentLink !== false,
          share: merged.showShareButtons !== false,
          icons: merged.showAuthorProfile === true,
        }

        const labelOverrides: Record<string, string | undefined> = {
          author: merged.authorLabel,
          comments: merged.commentLabel,
          labels: merged.postLabelsLabel,
          location: merged.postLocationLabel,
          timestamp: merged.timestampLabel,
        }

        const activeBylineList: any[] = []
        for (const item of baseBylineItems) {
          if (!item || typeof item !== 'object')
            continue
          const isVisible = settingMap[item.name] ?? true
          if (isVisible) {
            const label = labelOverrides[item.name] || item.label || ''
            const activeItem = { ...item, label }
            activeBylineList.push(activeItem)
            activeBylineList[item.name] = activeItem
          }
        }

        const blogData = {
          ...blog1,
          ...merged,
          title,
          posts: activePosts,
          numPosts: activePosts.length,
          allBylineItems: activeBylineList,
        }
        context.widgetData[widgetId] = blogData
        if (context.widgets) {
          context.widgets[widgetId] = blogData
        }
        break
      }

      case 'FeaturedPost': {
        if (normalizedPosts.length > 0) {
          const featured = normalizedPosts[0]!
          context.widgetData[widgetId] = deepMerge({
            title: spec.getWidgetDefaultTitle('FeaturedPost', blogLocale),
            postId: featured.id,
            postTitle: featured.title,
            snippet: featured.snippets.long,
            postUrl: featured.url,
          }, merged)
        }
        else {
          context.widgetData[widgetId] = merged
        }
        break
      }

      case 'BlogArchive': {
        if (normalizedPosts.length > 0 && !context.widgetData[widgetId]?.data) {
          const archiveHierarchy = buildArchiveHierarchy(normalizedPosts, mapper, {
            locale: blogLocale,
            timeZone: blogTimeZone,
            widgetId,
          })
          context.widgetData[widgetId] = deepMerge({
            title: spec.getWidgetDefaultTitle('BlogArchive', blogLocale),
            style: 'HIERARCHY',
            data: archiveHierarchy,
          }, merged)
        }
        else {
          context.widgetData[widgetId] = merged
        }
        break
      }

      case 'PopularPosts': {
        if (normalizedPosts.length > 0 && !context.widgetData[widgetId]?.posts) {
          context.widgetData[widgetId] = deepMerge(buildPopularPostsData(normalizedPosts, spec, blogLocale, 5), merged)
        }
        else {
          context.widgetData[widgetId] = merged
        }
        break
      }

      case 'LinkList':
      case 'TextList': {
        const title = merged.title || widget.title || spec.getWidgetDefaultTitle(type, blogLocale) || type
        if (Array.isArray(merged.links)) {
          const links = merged.links
            .map((l: any) => normalizeLinkItem(l))
            .map((l: any) => ({ name: l.title, target: l.href, ...l }))
          context.widgetData[widgetId] = { ...merged, title, links }
        }
        else {
          context.widgetData[widgetId] = { ...merged, title }
        }
        break
      }

      default: {
        const title = merged.title || widget.title || spec.getWidgetDefaultTitle(type, blogLocale) || type
        context.widgetData[widgetId] = { ...merged, title }
        break
      }
    }
  }

  // 7. Aliases por tipo
  const typesEncountered = new Set<string>()
  for (const w of discoveredWidgets.values()) {
    typesEncountered.add(w.type)
  }

  for (const type of typesEncountered) {
    const primaryId = `${type}1`
    if (context.widgetData[primaryId]) {
      context.widgetData[type] = context.widgetData[primaryId]
    }
    else {
      const first = [...discoveredWidgets.values()].find(w => w.type === type)
      if (first && context.widgetData[first.id]) {
        context.widgetData[type] = context.widgetData[first.id]
      }
    }
  }

  // Sincronizar context.widgets si existe
  if (context.widgets) {
    for (const [k, v] of Object.entries(context.widgetData)) {
      context.widgets[k] = v
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
    const commentFrameBaseUrl = config.commentFrameBaseUrl || config.config?.blog?.commentFrameBaseUrl
    if (commentFrameBaseUrl) {
      const postsToUpdate = [
        ...(Array.isArray(context.widgetData?.Blog1?.posts) ? context.widgetData.Blog1.posts : []),
        ...(context.widgetData?.Blog1?.post ? [context.widgetData.Blog1.post] : []),
        ...(context.view?.post ? [context.view.post] : []),
      ]
      const separator = commentFrameBaseUrl.includes('?') ? '&' : '?'
      const locale = config.overrides?.blog?.locale || config.config?.blog?.locale || context.blog?.locale || 'en'
      const origin = context.blog?.homepageUrl || ''
      for (const post of postsToUpdate) {
        if (!post || typeof post !== 'object')
          continue
        const id = post.id ? String(post.id) : ''
        const queryParts = [
          `po=${encodeURIComponent(id)}`,
          `hl=${encodeURIComponent(locale)}`,
        ]
        if (origin) {
          queryParts.push(`origin=${encodeURIComponent(origin)}`)
        }
        post.commentFormIframeSrc = `${commentFrameBaseUrl}${separator}${queryParts.join('&')}`
      }
    }
    const spec = getSpecCatalog()
    const blogLocale = config.overrides?.blog?.locale || config.config?.blog?.locale || context.blog?.locale || 'en'
    const derivedHost = context.blog?.homepageUrl ? new URL(context.blog.homepageUrl).host : 'example.blogspot.com'
    const mapper = createUrlMapper({ urlMode, baseUrl, blogHost: derivedHost })
    const currentPath = (viewId === 'static_page' ? config.targetUrl || context.view?.url || config.overrides?.view?.url : undefined)
    const normalizedPages = (context.widgetData?.PageList1?.links || []).map((l: any) => ({
      ...l,
      isCurrentPage: Boolean(currentPath && (l.href === currentPath || mapper.mapUrl(l.href) === currentPath)),
    }))

    hydrateAllWidgets({
      context,
      config,
      spec,
      mapper,
      currentPath,
      blogLocale,
      blogTimeZone: config.config?.blog?.timeZone || 'UTC',
      rawPages: [],
      rawPosts: [],
      normalizedPages,
      normalizedLabels: context.widgetData?.Label1?.labels || [],
      normalizedPosts: context.widgetData?.Blog1?.posts || [],
      activePosts: context.widgetData?.Blog1?.posts || [],
      headerData: context.widgetData?.Header1 || {},
      blog1: context.widgetData?.Blog1 || {},
    })

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

  const [postsResponse, pagesResponse] = await Promise.all([
    client.fetchPosts(effectiveBlogId, { maxResults: 25 }),
    client.fetchPages(effectiveBlogId),
  ])

  const feed = postsResponse?.feed

  if (feed) {
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
    const blogTimeZone = config.config?.blog?.timeZone
    const postSaa = config.overrides?.view?.saa || config.overrides?.saa || (config.overrides?.blog as any)?.saa
    const rawPosts: readonly BloggerRawEntry[] = feed.entry || []
    const commentFrameBaseUrl = config.commentFrameBaseUrl || config.config?.blog?.commentFrameBaseUrl
    const postOptions = {
      saa: postSaa,
      dateFormat: config.config?.blog?.postDateFormat,
      timeZone: blogTimeZone,
      titleAndEnclosureLinks: config.config?.blog?.titleAndEnclosureLinks,
      commentFrameBaseUrl,
    }
    const normalizedPosts = rawPosts.map((e) => {
      const entryId = extractId(e.id?.$t)
      const configuredLink = config.config?.entries?.[entryId]?.link
      return normalizePostEntry(e, mapper, effectiveBlogId, blogLocale, {
        ...postOptions,
        ...(configuredLink !== undefined ? { configuredLink } : {}),
      })
    })

    const rawPages: readonly BloggerRawEntry[] = pagesResponse?.feed?.entry || []
    const normalizedPagePosts = rawPages.map((e) => {
      const entryId = extractId(e.id?.$t)
      const configuredLink = config.config?.entries?.[entryId]?.link
      return normalizePageAsPostEntry(e, mapper, effectiveBlogId, blogLocale, {
        ...postOptions,
        ...(configuredLink !== undefined ? { configuredLink } : {}),
      })
    })

    const labelSorting = (config.overrides?.widgetData?.Label1?.sorting || 'ALPHA') as 'ALPHA' | 'FREQUENCY'
    const normalizedLabels = normalizeLabels(rawPosts, mapper, labelSorting)
    const blogMeta = normalizeBlogMetadata(feed, mapper, effectiveBlogId)
    const headerData = normalizeHeader(feed, mapper)

    context.blog = deepMerge(context.blog, blogMeta)

    if (blogLocale) {
      const spec = getSpecCatalog()
      context.messages = {
        ...(context.messages || {}),
        ...spec.getAllLocalizedMessages(blogLocale),
      }
      if (context.messages.location !== undefined) {
        const locationLabel = spec.getTranslation('widgets.Blog.byline.location.label', blogLocale)
        if (locationLabel) {
          context.messages.location = locationLabel
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

    context.widgetData = context.widgetData || {}

    const blog1 = context.widgetData.Blog1 || {}
    let activePosts = normalizedPosts.slice()

    const activeUrl = config.overrides?.view?.url || config.targetUrl || context.view?.url || ''
    const resolvedRoute = resolveBloggerRoute(activeUrl)
    const searchParams: URLSearchParams | undefined = resolvedRoute.searchParams
    const isArchiveRoute = resolvedRoute.viewId === 'archive_yearly'
      || resolvedRoute.viewId === 'archive_monthly'
      || resolvedRoute.viewId === 'archive_weekly_daily'
    const pathLabel: string | undefined = resolvedRoute.params.label
    const pathYear: number | undefined = isArchiveRoute ? resolvedRoute.params.year : undefined
    const pathMonth: number | undefined = isArchiveRoute ? resolvedRoute.params.month : undefined
    const pathDay: number | undefined = isArchiveRoute ? resolvedRoute.params.day : undefined

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

          const commentsResponse = await client.fetchComments(effectiveBlogId, targetPost.id)
          const rawComments: readonly BloggerRawEntry[] = commentsResponse?.feed?.entry || []
          if (rawComments.length > 0) {
            const normalizedComments = rawComments
              .map(c => normalizeCommentEntry(c, mapper, effectiveBlogId, blogLocale, config.config?.blog?.commentDateFormat, blogTimeZone))
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
        const spec = getSpecCatalog()
        context.view.search.resultsMessage = spec.getFormattedGlobalMessage('view.search.resultsMessage', blogLocale, { LABEL: effectiveQ })
        context.view.search.resultsMessageHtml = spec.getFormattedGlobalMessage('view.search.resultsMessageHtml', blogLocale, { LABEL: effectiveQ })
      }

      if (!effectiveQ && !pathLabel && !searchParams?.get('label') && searchParams?.get('updated-max')) {
        context.view = context.view || {}
        context.view.search = context.view.search || {}
        const spec = getSpecCatalog()
        const olderMsg = spec.getLocalizedMessage('olderPosts', blogLocale) || 'Older Posts'
        context.view.search.resultsMessage = olderMsg
        context.view.search.resultsMessageHtml = olderMsg
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

    if (viewId === 'homepage' && config.config?.blog?.postsPerPage && (!searchParams || searchParams.size === 0)) {
      const postsPerPage = config.config.blog.postsPerPage
      if (activePosts.length > postsPerPage && !blog1.olderPageUrl) {
        const lastPost = activePosts[postsPerPage - 1]
        const nextDate = lastPost?.publishedIso?.replace(/\.\d{3}/, '') || ''
        const blogOrigin = mapper.blogHost ? `https://${mapper.blogHost}` : ''
        blog1.olderPageUrl = mapper.mapUrl(`${blogOrigin}/search?updated-max=${nextDate}&max-results=${postsPerPage}`)
      }
      activePosts = activePosts.slice(0, postsPerPage)
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

    const currentPath = (viewId === 'static_page' ? config.targetUrl || context.view?.url || config.overrides?.view?.url : undefined)
    const normalizedPages = rawPages.map(e => normalizePageEntry(e, mapper, currentPath))

    hydrateAllWidgets({
      context,
      config,
      spec,
      mapper,
      currentPath,
      blogLocale,
      blogTimeZone,
      rawPages,
      rawPosts,
      normalizedPages,
      normalizedLabels,
      normalizedPosts,
      activePosts,
      headerData,
      blog1,
    })

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
