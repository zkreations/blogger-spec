import type { SpecCatalog } from '../catalogs/spec-catalog.js'
import type { BloggerViewId } from '../generated/types.generated.js'
import type { BloggerBlogConfiguration } from './config-types.js'
import type { BloggerContextConfig, BloggerRawEntry, DiscoveredWidget } from './types.js'
import type { UrlMapper } from './url-mapper.js'
import { getMockContext, getSpecCatalog } from '../catalogs/index.js'
import { buildArchiveHierarchy } from './archive-tree.js'
import { BloggerFeedClient } from './client.js'
import { bindWidgetSettingsToData } from './data-binder.js'
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
import {
  buildAttributionData,
  buildContactFormData,
  buildPopularPostsData,
} from './secondary-widgets.js'
import { createUrlMapper } from './url-mapper.js'
import {
  extractTemplateWidgets,
  normalizeLinkItem,
  parseCanonicalWidgetId,
} from './widget-extractor.js'

const BLOGGER_FEED_DEFAULT_MAX_RESULTS = 25

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

function createCleanBaseContext(
  viewId: BloggerViewId,
  locale: string,
  spec: SpecCatalog,
): Record<string, any> {
  const matrixEntry = spec.getViewMatrixEntry(viewId)
  const view: Record<string, any> = {
    type: matrixEntry?.view_type ?? 'feed',
    title: '',
    description: '',
    url: '',
  }

  if (matrixEntry?.flags) {
    for (const [flag, val] of Object.entries(matrixEntry.flags)) {
      if (val === 'true') {
        view[flag] = true
      }
      else if (val === 'false') {
        view[flag] = false
      }
    }
  }

  const blog: Record<string, any> = {
    locale,
    localeUnderscoreDelimited: locale.replace('-', '_'),
    languageDirection: spec.isRTL(locale) ? 'rtl' : 'ltr',
    encoding: 'UTF-8',
    isMobileRequest: false,
    adultContent: false,
    httpsEnabled: true,
    hasCustomDomain: false,
    adsenseHasAds: false,
    adsenseAutoAds: false,
    enabledCommentProfileImages: true,
    pageType: matrixEntry?.blog_page_type ?? 'index',
    pageTitle: '',
    pageName: '',
    isPrivate: false,
    isPrivateBlog: false,
  }

  const messages: Record<string, string> = {
    ...spec.getAllLocalizedMessages(locale),
  }

  const widgetData: Record<string, any> = {}

  return {
    view,
    blog,
    messages,
    skin: { vars: {} },
    widgetData,
    widgets: widgetData,
  }
}

function getDefaultBylineItems(spec: SpecCatalog, locale: string): Array<{ name: string, label: string }> {
  return [
    {
      name: 'share',
      label: spec.getLocalizedMessage('share', locale) || 'Share',
    },
    {
      name: 'author',
      label: spec.getTranslation('widgets.Blog.byline.author.label', locale) || spec.getLocalizedMessage('by', locale) || 'By',
    },
    {
      name: 'timestamp',
      label: spec.getTranslation('widgets.Blog.byline.timestamp.label', locale) || spec.getLocalizedMessage('at', locale) || 'at',
    },
    {
      name: 'comments',
      label: spec.getTranslation('widgets.Blog.byline.comments.label', locale) || spec.getLocalizedMessage('comments', locale) || 'Comments',
    },
    {
      name: 'icons',
      label: spec.getLocalizedMessage('icons', locale) || 'Icons',
    },
    {
      name: 'labels',
      label: spec.getTranslation('widgets.Blog.byline.labels.label', locale) || spec.getLocalizedMessage('labels', locale) || 'Labels',
    },
    {
      name: 'location',
      label: spec.getTranslation('widgets.Blog.byline.location.label', locale) || spec.getLocalizedMessage('location', locale) || 'Location',
    },
  ]
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

interface WidgetDiscoveryOptions {
  templateAst?: any
  templateXml?: string
  configWidgets?: Record<string, any>
  overrideWidgets?: Record<string, any>
  spec: SpecCatalog
  headlessDefaults: {
    hasPosts: boolean
    hasPages: boolean
    hasLabels: boolean
  }
}

function discoverWidgets(options: WidgetDiscoveryOptions): Map<string, DiscoveredWidget> {
  const {
    templateAst,
    templateXml,
    configWidgets,
    overrideWidgets,
    spec,
    headlessDefaults,
  } = options

  const discoveredWidgets = new Map<string, DiscoveredWidget>()

  if (templateAst || templateXml) {
    const fromTemplate = extractTemplateWidgets(templateAst || templateXml!, spec)
    for (const w of fromTemplate) {
      discoveredWidgets.set(w.id, w)
    }

    if (configWidgets) {
      for (const key of Object.keys(configWidgets)) {
        const parsed = parseCanonicalWidgetId(key)
        if (parsed && !discoveredWidgets.has(key)) {
          discoveredWidgets.set(key, { id: key, type: parsed.type })
        }
      }
    }

    if (overrideWidgets) {
      for (const key of Object.keys(overrideWidgets)) {
        const parsed = parseCanonicalWidgetId(key)
        if (parsed && !discoveredWidgets.has(key)) {
          discoveredWidgets.set(key, { id: key, type: parsed.type })
        }
      }
    }

    return discoveredWidgets
  }

  // Headless mode (no template provided)
  if (configWidgets) {
    for (const key of Object.keys(configWidgets)) {
      const parsed = parseCanonicalWidgetId(key)
      if (parsed && !discoveredWidgets.has(key)) {
        discoveredWidgets.set(key, { id: key, type: parsed.type })
      }
    }
  }

  if (overrideWidgets) {
    for (const key of Object.keys(overrideWidgets)) {
      const parsed = parseCanonicalWidgetId(key)
      if (parsed && !discoveredWidgets.has(key)) {
        discoveredWidgets.set(key, { id: key, type: parsed.type })
      }
    }
  }

  if (![...discoveredWidgets.values()].some(w => w.type === 'Blog')) {
    discoveredWidgets.set('Blog1', { id: 'Blog1', type: 'Blog' })
  }
  if (![...discoveredWidgets.values()].some(w => w.type === 'Header')) {
    discoveredWidgets.set('Header1', { id: 'Header1', type: 'Header' })
  }
  if (headlessDefaults.hasPages && ![...discoveredWidgets.values()].some(w => w.type === 'PageList')) {
    discoveredWidgets.set('PageList1', { id: 'PageList1', type: 'PageList' })
  }
  if (headlessDefaults.hasLabels && ![...discoveredWidgets.values()].some(w => w.type === 'Label')) {
    discoveredWidgets.set('Label1', { id: 'Label1', type: 'Label' })
  }
  if (headlessDefaults.hasPosts && ![...discoveredWidgets.values()].some(w => w.type === 'BlogArchive')) {
    discoveredWidgets.set('BlogArchive1', { id: 'BlogArchive1', type: 'BlogArchive' })
  }
  if (headlessDefaults.hasPosts && ![...discoveredWidgets.values()].some(w => w.type === 'PopularPosts')) {
    discoveredWidgets.set('PopularPosts1', { id: 'PopularPosts1', type: 'PopularPosts' })
  }

  return discoveredWidgets
}

interface WidgetHydrationOptions {
  context: Record<string, any>
  config: BloggerContextConfig
  spec: SpecCatalog
  mapper: UrlMapper
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
  discoveredWidgets: Map<string, DiscoveredWidget>
}

function getWidgetCatalogDefaults(type: string, spec: SpecCatalog): Record<string, any> {
  return bindWidgetSettingsToData({}, type, spec)
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
    discoveredWidgets,
  } = options

  for (const [widgetId, widget] of discoveredWidgets) {
    const type = widget.type
    const catalogDefaults = getWidgetCatalogDefaults(type, spec)
    const genericTypeConfig = config.config?.widgets?.[type]
    const templateSettings = widget.settings
    const instanceConfig = config.config?.widgets?.[widgetId]
    const instanceOverrides = config.overrides?.widgetData?.[widgetId]
    const existingData = context.widgetData[widgetId] || {}

    let rawMerged = deepMerge(catalogDefaults, existingData)
    if (genericTypeConfig) {
      rawMerged = deepMerge(rawMerged, genericTypeConfig)
    }
    if (templateSettings) {
      rawMerged = deepMerge(rawMerged, templateSettings)
    }
    if (instanceConfig) {
      rawMerged = deepMerge(rawMerged, instanceConfig)
    }
    if (instanceOverrides) {
      rawMerged = deepMerge(rawMerged, instanceOverrides)
    }

    const merged = bindWidgetSettingsToData(rawMerged, type, spec)

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
        const explicitHomeTitle = instanceOverrides?.homeTitle || instanceConfig?.homeTitle || templateSettings?.homeTitle
        const hasExplicitInstanceLinks = Array.isArray(instanceConfig?.links) || Array.isArray(instanceOverrides?.links)
        if (explicitHomeTitle && links.length > 0 && links[0] && !hasExplicitInstanceLinks) {
          if (links[0].href === '/' || links[0].href === mapper.mapUrl('/')) {
            links[0] = { ...links[0], title: String(explicitHomeTitle) }
          }
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
        const sorting = (merged.sorting || config.overrides?.widgetData?.[widgetId]?.sorting || config.overrides?.widgetData?.Label1?.sorting || 'ALPHA').toUpperCase()
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
              : getDefaultBylineItems(spec, blogLocale))

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

        const activeBylineList: any[] & Record<string, any> = []
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

        const numPosts = merged.numPosts !== undefined
          ? merged.numPosts
          : (blog1.numPosts !== undefined ? blog1.numPosts : activePosts.length)

        const blogData = {
          ...blog1,
          ...merged,
          title,
          posts: activePosts,
          numPosts,
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

      case 'Attribution': {
        const blogTitle = (context.blog as any)?.title || headerData?.title || 'Blog'
        const attributionDefaults = buildAttributionData(blogTitle, spec, blogLocale, {
          posts: normalizedPosts,
        })
        const cleanMerged = { ...merged }
        if (cleanMerged.copyright === null || cleanMerged.copyright === undefined) {
          delete cleanMerged.copyright
        }
        context.widgetData[widgetId] = deepMerge(attributionDefaults, cleanMerged)
        break
      }

      case 'ContactForm': {
        const contactDefaults = buildContactFormData(spec, blogLocale)
        context.widgetData[widgetId] = deepMerge(contactDefaults, merged)
        break
      }

      case 'PopularPosts': {
        if (normalizedPosts.length > 0 && !context.widgetData[widgetId]?.posts) {
          const canonicalLimit = (spec.getWidgetSettings('PopularPosts')?.canonical?.numItemsToShow?.default as number) ?? 10
          const limit = merged.numPosts ?? merged.numItemsToShow ?? canonicalLimit
          const popularData = buildPopularPostsData(normalizedPosts, spec, blogLocale, limit, merged.postDisplay)
          context.widgetData[widgetId] = deepMerge(popularData, merged)
        }
        else {
          context.widgetData[widgetId] = merged
        }
        break
      }

      case 'LinkList':
      case 'TextList': {
        const title = instanceOverrides?.title || instanceConfig?.title || widget.title || genericTypeConfig?.title || merged.title || spec.getWidgetDefaultTitle(type, blogLocale) || type
        const rawLinks = instanceOverrides?.links
          || instanceConfig?.links
          || templateSettings?.links
          || genericTypeConfig?.links
          || merged.links
          || []

        if (Array.isArray(rawLinks)) {
          let links = rawLinks
            .map((l: any) => normalizeLinkItem(l))
            .map((l: any) => ({ name: l.title, target: l.href, ...l }))
          if (merged.sorting === 'alphabetical' || merged.sorting === 'alpha') {
            links = [...links].sort((a, b) => a.name.localeCompare(b.name))
          }
          else if (merged.sorting === 'reverse_alphabetical' || merged.sorting === 'reverse-alpha') {
            links = [...links].sort((a, b) => b.name.localeCompare(a.name))
          }
          const explicitShownum = instanceOverrides?.shownum ?? instanceConfig?.shownum ?? templateSettings?.shownum
          if (typeof explicitShownum === 'number' && explicitShownum > 0) {
            links = links.slice(0, explicitShownum)
          }
          context.widgetData[widgetId] = { ...merged, title, links }
        }
        else {
          context.widgetData[widgetId] = { ...merged, title, links: [] }
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

  // Aliases by type
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

  // Synchronize context.widgets
  if (context.widgets) {
    for (const [k, v] of Object.entries(context.widgetData)) {
      context.widgets[k] = v
    }
  }
}

export async function resolveBloggerContext(
  config: BloggerContextConfig = {},
): Promise<Record<string, any>> {
  const viewId: BloggerViewId = config.view || 'homepage'

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

  // Offline resolution with custom configuration or template
  if (config.offline) {
    const mockFallback = getMockContext(viewId)
    const derivedHost = baseUrl ? new URL(baseUrl, 'https://example.blogspot.com').host : 'example.blogspot.com'
    const mapper = createUrlMapper({ urlMode, baseUrl, blogHost: derivedHost })

    const context = createCleanBaseContext(viewId, blogLocale, spec)
    context.blog.blogId = effectiveBlogId
    context.blog.title = config.overrides?.blog?.title || (config.config?.blog as any)?.title || mockFallback.blog?.title || ''
    context.blog.description = config.overrides?.blog?.description || (config.config?.blog as any)?.description || mockFallback.blog?.description || ''
    context.blog.homepageUrl = mapper.mapUrl('/')
    context.blog.url = context.blog.homepageUrl
    context.blog.canonicalUrl = context.blog.homepageUrl

    if (viewId === 'error_404') {
      const navMsg = spec.getWidgetNavMessage('Blog', blogLocale)
      context.widgetData.Blog1 = context.widgetData.Blog1 || {}
      context.widgetData.Blog1.navMessage = navMsg
      context.widgetData.Blog1.posts = []
      context.widgetData.Blog1.numPosts = 0
    }

    const cookieChoices = config.cookieChoices ?? config.config?.blog?.cookieChoices ?? false
    if (cookieChoices) {
      context.blog.cookieChoices = true
    }

    const currentPath = (viewId === 'static_page' ? config.targetUrl || context.view?.url || config.overrides?.view?.url : undefined)
    let activePosts = Array.isArray(mockFallback.widgetData?.Blog1?.posts)
      ? deepMerge([], mockFallback.widgetData.Blog1.posts)
      : []

    if (viewId === 'post' || viewId === 'static_page') {
      if (viewId === 'post') {
        const targetPost = (config.targetId
          ? activePosts.find((p: any) => String(p.id) === String(config.targetId))
          : (config.targetUrl
              ? activePosts.find((p: any) => p.url === config.targetUrl || p.absoluteUrl === config.targetUrl)
              : (config.overrides?.view?.url
                  ? activePosts.find((p: any) => p.url === config.overrides?.view?.url || p.absoluteUrl === config.overrides?.view?.url)
                  : activePosts[0]))) || activePosts[0]

        if (targetPost) {
          activePosts = [targetPost]
          context.view.postId = Number.parseInt(targetPost.id, 10) || targetPost.id
          context.view.title = targetPost.title
          context.view.url = targetPost.url
          context.view.description = targetPost.snippets?.short || ''
        }
      }
      else if (viewId === 'static_page') {
        const fallbackPages = (mockFallback.widgetData?.PageList1?.links || [])
        const targetPage = (config.targetId
          ? fallbackPages.find((p: any) => String(p.id) === String(config.targetId))
          : (config.targetUrl
              ? fallbackPages.find((p: any) => p.href === config.targetUrl)
              : fallbackPages[0])) || fallbackPages[0]

        if (targetPage) {
          activePosts = [targetPage]
          context.view.pageId = Number.parseInt(targetPage.id, 10) || targetPage.id
          context.view.title = targetPage.title
          context.view.url = targetPage.href
          context.view.description = targetPage.snippets?.short || ''
        }
      }
    }

    if (config.config) {
      applyBlogConfiguration(context, config.config, viewId, activePosts)
    }

    const normalizedPages = (mockFallback.widgetData?.PageList1?.links || []).map((l: any) => ({
      ...l,
      isCurrentPage: Boolean(currentPath && (l.href === currentPath || mapper.mapUrl(l.href) === currentPath)),
    }))

    const discoveredWidgets = discoverWidgets({
      templateAst: config.templateAst,
      templateXml: config.templateXml,
      configWidgets: config.config?.widgets,
      overrideWidgets: config.overrides?.widgetData,
      spec,
      headlessDefaults: {
        hasPosts: activePosts.length > 0,
        hasPages: normalizedPages.length > 0,
        hasLabels: false,
      },
    })

    const commentFrameBaseUrl = config.commentFrameBaseUrl || config.config?.blog?.commentFrameBaseUrl
    const blog1 = context.widgetData.Blog1 || {}
    if (viewId === 'homepage' && config.config?.blog?.postsPerPage) {
      const postsPerPage = config.config.blog.postsPerPage
      activePosts = activePosts.slice(0, postsPerPage)
      blog1.posts = activePosts
      blog1.numPosts = postsPerPage
    }
    else {
      blog1.posts = activePosts
      blog1.numPosts = blog1.numPosts !== undefined ? blog1.numPosts : activePosts.length
    }

    hydrateAllWidgets({
      context,
      config,
      spec,
      mapper,
      currentPath,
      blogLocale,
      blogTimeZone,
      rawPages: [],
      rawPosts: [],
      normalizedPages,
      normalizedLabels: [],
      normalizedPosts: activePosts,
      activePosts,
      headerData: {
        title: context.blog.title,
        description: context.blog.description,
        url: context.blog.homepageUrl,
      },
      blog1,
      discoveredWidgets,
    })

    if (commentFrameBaseUrl) {
      const postsToUpdate = [
        ...(Array.isArray(context.widgetData?.Blog1?.posts) ? context.widgetData.Blog1.posts : []),
        ...(context.widgetData?.Blog1?.post ? [context.widgetData.Blog1.post] : []),
        ...(context.view?.post ? [context.view.post] : []),
      ]
      const separator = commentFrameBaseUrl.includes('?') ? '&' : '?'
      const origin = context.blog?.homepageUrl || ''
      for (const post of postsToUpdate) {
        if (!post || typeof post !== 'object')
          continue
        const id = post.id ? String(post.id) : ''
        const queryParts = [
          `po=${encodeURIComponent(id)}`,
          `hl=${encodeURIComponent(blogLocale)}`,
        ]
        if (origin) {
          queryParts.push(`origin=${encodeURIComponent(origin)}`)
        }
        post.commentFormIframeSrc = `${commentFrameBaseUrl}${separator}${queryParts.join('&')}`
      }
    }

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

    if (config.overrides) {
      return deepMerge(context, config.overrides)
    }
    return context
  }

  // Live / Feed resolution
  const client = new BloggerFeedClient({
    fetchFn: config.fetch,
    defaultTtlMs: config.cache?.ttlMs,
  })

  let postsResponse: any
  let pagesResponse: any

  try {
    const [fetchedPosts, fetchedPages] = await Promise.all([
      client.fetchPosts(effectiveBlogId, { maxResults: BLOGGER_FEED_DEFAULT_MAX_RESULTS }),
      client.fetchPages(effectiveBlogId),
    ])
    postsResponse = fetchedPosts
    pagesResponse = fetchedPages
  }
  catch {
    return deepMerge(getMockContext(viewId), config.overrides)
  }

  const feed = postsResponse?.feed
  if (!feed) {
    return deepMerge(getMockContext(viewId), config.overrides)
  }

  const alternateLink = feed.link?.find((l: any) => l.rel === 'alternate')?.href || ''
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

  const context = createCleanBaseContext(viewId, blogLocale, spec)
  context.blog = deepMerge(context.blog, blogMeta)

  if (context.messages?.location !== undefined) {
    const locationLabel = spec.getTranslation('widgets.Blog.byline.location.label', blogLocale)
    if (locationLabel) {
      context.messages.location = locationLabel
    }
  }

  const activeUrl = config.overrides?.view?.url || config.targetUrl || context.view?.url || ''
  const resolvedRoute = resolveBloggerRoute(activeUrl)
  const isArchiveDailyWeekly = resolvedRoute.viewId === 'archive_weekly_daily' || viewId === 'archive_weekly_daily'

  if (viewId !== 'post' && viewId !== 'static_page') {
    if (!config.overrides?.view?.title) {
      context.view.title = blogMeta.title
    }
    if (!config.overrides?.view?.description) {
      context.view.description = blogMeta.description
    }
    if (viewId === 'homepage') {
      context.view.url = blogMeta.homepageUrl
      context.blog.canonicalUrl = blogMeta.homepageUrl
    }
    else {
      let resolvedUrl = activeUrl || blogMeta.homepageUrl
      if (isArchiveDailyWeekly) {
        resolvedUrl = resolvedUrl.replace(/\/(\d{4})_(\d{2})_(\d{2})_archive\.html(?=[?#]|$)/, '/$1/$2/')
      }
      context.view.url = resolvedUrl
      context.blog.canonicalUrl = resolvedUrl
    }
  }

  const blog1 = context.widgetData.Blog1 || {}
  let activePosts = normalizedPosts.slice()

  const searchParams: URLSearchParams | undefined = resolvedRoute.searchParams
  const isArchiveRoute = resolvedRoute.viewId === 'archive_yearly'
    || resolvedRoute.viewId === 'archive_monthly'
    || resolvedRoute.viewId === 'archive_weekly_daily'
  const pathLabel: string | undefined = resolvedRoute.params.label
  const pathYear: number | undefined = isArchiveRoute ? resolvedRoute.params.year : undefined
  const pathMonth: number | undefined = isArchiveRoute ? resolvedRoute.params.month : undefined
  // Empirical rule (catalogs/globals.json): /YYYY_MM_DD_archive.html collapses to monthly archive; pathDay is omitted from filtering and context
  const pathDay: number | undefined = (isArchiveRoute && !isArchiveDailyWeekly) ? resolvedRoute.params.day : undefined

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
        context.view.postId = Number.parseInt(targetPost.id, 10) || targetPost.id
        context.view.title = targetPost.title
        context.view.url = targetPost.url
        context.view.description = targetPost.snippets.short
        if (targetPost.featuredImage) {
          context.view.featuredImage = targetPost.featuredImage
        }
        context.blog.canonicalUrl = targetPost.url

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
        context.view.pageId = Number.parseInt(targetPage.id, 10) || targetPage.id
        context.view.title = targetPage.title
        context.view.url = targetPage.url
        context.view.description = targetPage.snippets.short
        context.blog.canonicalUrl = targetPage.url
      }
    }
  }
  else if (viewId === 'error_404') {
    activePosts = []
    const navMsg = spec.getWidgetNavMessage('Blog', blogLocale)
    blog1.navMessage = navMsg
  }
  else {
    const effectiveQ = searchParams?.get('q') || (config.overrides?.view?.search as any)?.query || (config.overrides?.view as any)?.searchQuery
    if (effectiveQ) {
      context.view.search = context.view.search || {}
      context.view.search.query = effectiveQ
      context.view.searchQuery = effectiveQ
      context.view.search.resultsMessage = spec.getFormattedGlobalMessage('view.search.resultsMessage', blogLocale, { LABEL: effectiveQ })
      context.view.search.resultsMessageHtml = spec.getFormattedGlobalMessage('view.search.resultsMessageHtml', blogLocale, { LABEL: effectiveQ })
    }

    if (!effectiveQ && !pathLabel && !searchParams?.get('label') && searchParams?.get('updated-max')) {
      context.view.search = context.view.search || {}
      const olderMsg = spec.getLocalizedMessage('olderPosts', blogLocale) || 'Older Posts'
      context.view.search.resultsMessage = olderMsg
      context.view.search.resultsMessageHtml = olderMsg
    }

    const effectiveLabel = pathLabel
      || searchParams?.get('label')
      || (config.overrides?.view?.search as any)?.label
      || (config.overrides?.view as any)?.searchLabel
    if (effectiveLabel) {
      context.view.search = context.view.search || {}
      context.view.search.label = effectiveLabel
      context.view.searchLabel = effectiveLabel

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
      context.view.archive = context.view.archive || {}
      context.view.archive.year = effectiveArchiveYear
      if (effectiveArchiveMonth) {
        context.view.archive.month = effectiveArchiveMonth
      }
      if (effectiveArchiveDay) {
        context.view.archive.day = effectiveArchiveDay
      }
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

      const blogOrigin = mapper.blogHost ? `https://${mapper.blogHost}` : ''

      if (effectiveLabel || viewId === 'label_search') {
        const encodedLabel = encodeURIComponent(effectiveLabel || '')
        const defaultLabelPageSize = spec.getBlogPagination()?.labelSearchPageSize ?? 20
        const pageSize = maxResults || defaultLabelPageSize

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
            blog1.olderPageUrl = mapper.mapUrl(`${blogOrigin}/search/label/${encodedLabel}?updated-max=${nextDate}&max-results=${defaultLabelPageSize}&start=${defaultLabelPageSize}&by-date=false`)
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
        const pageSize = maxResults || 8
        if (startIndex <= pageSize) {
          blog1.newerPageUrl = mapper.mapUrl(blogMeta.homepageUrl || (blogOrigin ? `${blogOrigin}/` : '/'))
        }
        else {
          const prevStart = Math.max(0, startIndex - pageSize)
          const firstPost = activePosts[0]
          const prevDate = firstPost?.publishedIso?.replace(/\.\d{3}/, '') || ''
          const byDateSuffix = byDateParam !== null ? `&by-date=${byDateParam}` : ''
          blog1.newerPageUrl = mapper.mapUrl(`${blogOrigin}/search?updated-max=${prevDate}&max-results=${pageSize}&start=${prevStart}${byDateSuffix}`)
        }

        if (hasMoreOlder) {
          const lastPost = activePosts[activePosts.length - 1]
          const nextDate = lastPost?.publishedIso?.replace(/\.\d{3}/, '') || ''
          const nextStart = startIndex + pageSize
          const byDateSuffix = byDateParam !== null ? `&by-date=${byDateParam}` : ''
          blog1.olderPageUrl = mapper.mapUrl(`${blogOrigin}/search?updated-max=${nextDate}&max-results=${pageSize}&start=${nextStart}${byDateSuffix}`)
        }
        else {
          blog1.olderPageUrl = ''
        }
      }
      else {
        const nextLink = feed.link?.find((l: any) => l.rel === 'next')?.href
        const prevLink = feed.link?.find((l: any) => l.rel === 'previous')?.href
        blog1.olderPageUrl = nextLink ? mapper.mapUrl(nextLink) : ''
        blog1.newerPageUrl = prevLink ? mapper.mapUrl(prevLink) : ''
      }
    }
    else {
      const nextLink = feed.link?.find((l: any) => l.rel === 'next')?.href
      const prevLink = feed.link?.find((l: any) => l.rel === 'previous')?.href
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

  const discoveredWidgets = discoverWidgets({
    templateAst: config.templateAst,
    templateXml: config.templateXml,
    configWidgets: config.config?.widgets,
    overrideWidgets: config.overrides?.widgetData,
    spec,
    headlessDefaults: {
      hasPosts: normalizedPosts.length > 0,
      hasPages: normalizedPages.length > 0,
      hasLabels: normalizedLabels.length > 0,
    },
  })

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
    discoveredWidgets,
  })

  const cookieChoices = config.cookieChoices ?? config.config?.blog?.cookieChoices ?? false
  if (cookieChoices) {
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

  if (config.overrides) {
    return deepMerge(context, config.overrides)
  }

  return context
}
