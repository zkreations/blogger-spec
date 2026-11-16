import type { SpecCatalog } from '../../catalogs/spec-catalog.js'
import type { BloggerViewId } from '../../generated/types.generated.js'
import type { BloggerBlogConfiguration } from '../config-types.js'
import type { BloggerContextConfig, BloggerRawEntry, DiscoveredWidget } from '../types.js'
import type { UrlMapper } from '../url-mapper.js'
import type { BloggerExtractedAuthor } from '../widget-author.js'
import type { ContextStage, ResolutionState } from './types.js'
import { getSpecCatalog } from '../../catalogs/index.js'
import { pureDeepMerge as deepMerge } from '../../core/common.js'
import { bindWidgetSettingsToData } from '../data-binder.js'
import { extractTemplateWidgets, parseCanonicalWidgetId } from '../widget-extractor.js'
import { dispatchWidgetHydration } from '../widget-hydrators.js'

export function applyBlogConfiguration(
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

export interface WidgetDiscoveryOptions {
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

export function discoverWidgets(options: WidgetDiscoveryOptions): Map<string, DiscoveredWidget> {
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

export interface WidgetHydrationOptions {
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
  blogAuthor: BloggerExtractedAuthor
}

export function hydrateAllWidgets(options: WidgetHydrationOptions): void {
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
    blogAuthor,
  } = options

  for (const [widgetId, widget] of discoveredWidgets) {
    const type = widget.type
    const catalogDefaults = bindWidgetSettingsToData({}, type, spec)
    const genericTypeConfig = config.config?.widgets?.[type]
    const templateSettings = widget.settings
    const instanceConfig = config.config?.widgets?.[widgetId]
    const instanceOverrides = config.overrides?.widgetData?.[widgetId]
    const existingData = context.widgetData[widgetId] || {}

    let rawMerged = deepMerge(catalogDefaults, existingData)
    if (genericTypeConfig) {
      rawMerged = deepMerge(rawMerged, genericTypeConfig)
    }
    if (instanceConfig) {
      rawMerged = deepMerge(rawMerged, instanceConfig)
    }
    if (templateSettings) {
      rawMerged = deepMerge(rawMerged, templateSettings)
    }
    if (instanceOverrides) {
      rawMerged = deepMerge(rawMerged, instanceOverrides)
    }

    const merged = bindWidgetSettingsToData(rawMerged, type, spec)

    const widgetData = dispatchWidgetHydration({
      widgetId,
      widget,
      type,
      merged,
      catalogDefaults,
      templateSettings,
      instanceConfig,
      instanceOverrides,
      genericTypeConfig,
      context,
      spec,
      mapper,
      blogLocale,
      blogTimeZone: blogTimeZone || '',
      currentPath,
      normalizedPages,
      normalizedLabels,
      normalizedPosts,
      activePosts,
      headerData,
      blog1,
      blogAuthor,
    })

    context.widgetData[widgetId] = widgetData
    if (type === 'Blog' && context.widgets) {
      context.widgets[widgetId] = widgetData
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
}

export class WidgetStage implements ContextStage {
  readonly name = 'widget'

  process(context: Record<string, any>, state: ResolutionState): void {
    const { config, spec, mapper, blogLocale, blogTimeZone } = state
    const activePosts = state.activePosts || []

    if (config.config) {
      applyBlogConfiguration(context, config.config, state.viewId, activePosts)
    }

    const discoveredWidgets = discoverWidgets({
      templateAst: config.templateAst,
      templateXml: config.templateXml,
      configWidgets: config.config?.widgets,
      overrideWidgets: config.overrides?.widgetData,
      spec,
      headlessDefaults: {
        hasPosts: activePosts.length > 0 || state.normalizedPosts.length > 0,
        hasPages: state.normalizedPages.length > 0,
        hasLabels: state.normalizedLabels.length > 0,
      },
    })
    state.discoveredWidgets = discoveredWidgets

    const blog1 = context.widgetData.Blog1 || {}

    hydrateAllWidgets({
      context,
      config,
      spec,
      mapper,
      currentPath: state.currentPath,
      blogLocale,
      blogTimeZone,
      rawPages: state.rawPages || [],
      rawPosts: state.rawPosts || [],
      normalizedPages: state.normalizedPages || [],
      normalizedLabels: state.normalizedLabels || [],
      normalizedPosts: state.normalizedPosts || [],
      activePosts,
      headerData: state.headerData,
      blog1,
      discoveredWidgets,
      blogAuthor: state.blogAuthor!,
    })

    const commentFrameBaseUrl = config.commentFrameBaseUrl || config.config?.blog?.commentFrameBaseUrl
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

    const cookieChoices = config.cookieChoices ?? config.config?.blog?.cookieChoices ?? false
    if (cookieChoices) {
      context.blog.cookieChoices = true
    }

    if (context.view) {
      if (state.viewId === 'post' || state.viewId === 'static_page') {
        context.view.type = 'item'
      }
      else if (state.viewId === 'error_404') {
        context.view.type = 'error'
      }
      else {
        context.view.type = 'feed'
      }
    }
  }
}
