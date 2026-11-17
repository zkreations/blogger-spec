import type { BloggerRawEntry } from '../types.js'
import type { ContextStage, ResolutionState } from './types.js'
import { getMockContext } from '../../catalogs/index.js'
import { pureDeepMerge as deepMerge } from '../../core/common.js'
import { BloggerFeedClient } from '../client.js'
import {
  extractFirstImage,
  extractId,
  normalizeBlogMetadata,
  normalizeCommentEntry,
  normalizeHeader,
  normalizeLabels,
  normalizePageAsPostEntry,
  normalizePageEntry,
  normalizePostEntry,
} from '../normalizer.js'
import { createUrlMapper } from '../url-mapper.js'
import { extractBlogAuthor } from '../widget-author.js'
import { isSameUrlOrPath } from './routing-stage.js'

export class FeedStage implements ContextStage {
  readonly name = 'feed'

  async process(context: Record<string, any>, state: ResolutionState): Promise<void> {
    if (state.config.offline) {
      this.processOfflineFeed(context, state)
      return
    }

    await this.processOnlineFeed(context, state, state.effectiveBlogId)
  }

  private processOfflineFeed(context: Record<string, any>, state: ResolutionState): void {
    const mockFallback = getMockContext(state.viewId)
    const derivedHost = state.mapper.blogHost || 'example.blogspot.com'
    const derivedOrigin = derivedHost && derivedHost !== 'example.blogspot.com' ? `https://${derivedHost}` : ''

    context.blog.blogId = state.effectiveBlogId
    context.blog.title = state.config.overrides?.blog?.title || (state.config.config?.blog as any)?.title || mockFallback.blog?.title || ''
    context.blog.description = state.config.overrides?.blog?.description || (state.config.config?.blog as any)?.description || mockFallback.blog?.description || ''
    context.blog.homepageUrl = state.config.overrides?.blog?.homepageUrl || (derivedOrigin ? `${derivedOrigin}/` : state.mapper.mapUrl('/'))
    context.blog.url = context.blog.homepageUrl
    context.blog.canonicalUrl = context.blog.homepageUrl

    let activePosts = Array.isArray(mockFallback.widgetData?.Blog1?.posts)
      ? deepMerge([], mockFallback.widgetData.Blog1.posts)
      : []

    if (state.viewId === 'post' || state.viewId === 'static_page') {
      if (state.viewId === 'post') {
        const targetPost = (state.config.targetId
          ? activePosts.find((p: any) => String(p.id) === String(state.config.targetId))
          : (state.config.targetUrl
              ? activePosts.find((p: any) => isSameUrlOrPath(p.url, state.config.targetUrl) || isSameUrlOrPath(p.absoluteUrl, state.config.targetUrl))
              : (state.config.overrides?.view?.url
                  ? activePosts.find((p: any) => isSameUrlOrPath(p.url, state.config.overrides?.view?.url) || isSameUrlOrPath(p.absoluteUrl, state.config.overrides?.view?.url))
                  : activePosts[0]))) || activePosts[0]

        if (targetPost) {
          activePosts = [targetPost]
          context.view.postId = Number.parseInt(targetPost.id, 10) || targetPost.id
          context.view.title = targetPost.title
          context.view.url = targetPost.url
          context.view.description = targetPost.snippets?.short || ''
          const firstImg = extractFirstImage(targetPost.body || '')
          const primaryImg = firstImg || targetPost.featuredImage || ''
          if (primaryImg) {
            context.blog.postImageUrl = primaryImg
            context.blog.postImageThumbnailUrl = (targetPost as any).thumbnail || primaryImg
          }
        }
      }
      else if (state.viewId === 'static_page') {
        const fallbackPages = (mockFallback.widgetData?.PageList1?.links || [])
        const targetPage = (state.config.targetId
          ? fallbackPages.find((p: any) => String(p.id) === String(state.config.targetId))
          : (state.config.targetUrl
              ? fallbackPages.find((p: any) => p.href === state.config.targetUrl)
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

    state.activePosts = activePosts
    state.normalizedPosts = activePosts
    state.normalizedPages = (mockFallback.widgetData?.PageList1?.links || []).map((l: any) => ({
      ...l,
      isCurrentPage: Boolean(state.currentPath && (l.href === state.currentPath || state.mapper.mapUrl(l.href) === state.currentPath)),
    }))
    state.headerData = {
      title: context.blog.title,
      description: context.blog.description,
      url: context.blog.homepageUrl,
    }
    state.blogAuthor = extractBlogAuthor({
      rawPosts: [],
      normalizedPosts: activePosts,
      defaultName: state.spec.getLocalizedMessage('anonymous', state.blogLocale) || 'Anonymous',
    })
  }

  private async processOnlineFeed(
    context: Record<string, any>,
    state: ResolutionState,
    effectiveBlogId: string,
  ): Promise<void> {
    const client = new BloggerFeedClient({
      fetchFn: state.config.fetch,
      defaultTtlMs: state.config.cache?.ttlMs,
    })

    const feedMaxResults = state.spec.getBlogPagination()?.maxResultsCeiling ?? 500
    let postsResponse: any
    let pagesResponse: any

    try {
      const [fetchedPosts, fetchedPages] = await Promise.all([
        client.fetchPosts(effectiveBlogId, { maxResults: feedMaxResults }),
        client.fetchPages(effectiveBlogId),
      ])
      postsResponse = fetchedPosts
      pagesResponse = fetchedPages
    }
    catch {
      const fallback = deepMerge(getMockContext(state.viewId), state.config.overrides)
      for (const [k, v] of Object.entries(fallback)) {
        context[k] = v
      }
      state.activePosts = context.widgetData?.Blog1?.posts || []
      return
    }

    const feed = postsResponse?.feed
    if (!feed) {
      const fallback = deepMerge(getMockContext(state.viewId), state.config.overrides)
      for (const [k, v] of Object.entries(fallback)) {
        context[k] = v
      }
      state.activePosts = context.widgetData?.Blog1?.posts || []
      return
    }

    state.feed = feed
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

    state.mapper = createUrlMapper({
      blogHost: derivedHost,
      urlMode: state.urlMode,
      baseUrl: state.baseUrl,
    })

    const rawPosts: readonly BloggerRawEntry[] = feed.entry || []
    const rawPages: readonly BloggerRawEntry[] = pagesResponse?.feed?.entry || []
    state.rawPosts = rawPosts
    state.rawPages = rawPages

    const postSaa = state.config.overrides?.view?.saa || state.config.overrides?.saa || (state.config.overrides?.blog as any)?.saa
    const commentFrameBaseUrl = state.config.commentFrameBaseUrl || state.config.config?.blog?.commentFrameBaseUrl
    const imageProxyUrl = state.config.imageProxyUrl || state.config.config?.blog?.imageProxyUrl
    const postOptions = {
      saa: postSaa,
      dateFormat: state.config.config?.blog?.postDateFormat,
      timeZone: state.blogTimeZone,
      titleAndEnclosureLinks: state.config.config?.blog?.titleAndEnclosureLinks,
      commentFrameBaseUrl,
      imageProxyUrl,
    }

    const normalizedPosts = rawPosts.map((e) => {
      const entryId = extractId(e.id?.$t)
      const configuredLink = state.config.config?.entries?.[entryId]?.link
      return normalizePostEntry(e, state.mapper, effectiveBlogId, state.blogLocale, {
        ...postOptions,
        ...(configuredLink !== undefined ? { configuredLink } : {}),
      })
    })
    state.normalizedPosts = normalizedPosts

    const normalizedPagePosts = rawPages.map((e) => {
      const entryId = extractId(e.id?.$t)
      const configuredLink = state.config.config?.entries?.[entryId]?.link
      return normalizePageAsPostEntry(e, state.mapper, effectiveBlogId, state.blogLocale, {
        ...postOptions,
        ...(configuredLink !== undefined ? { configuredLink } : {}),
      })
    })

    const labelSorting = (state.config.overrides?.widgetData?.Label1?.sorting || 'ALPHA') as 'ALPHA' | 'FREQUENCY'
    state.normalizedLabels = normalizeLabels(rawPosts, state.mapper, labelSorting)
    const blogMeta = normalizeBlogMetadata(feed, state.mapper, effectiveBlogId)
    state.headerData = normalizeHeader(feed, state.mapper)

    context.blog = deepMerge(context.blog, blogMeta)
    if (context.messages?.location !== undefined) {
      const locationLabel = state.spec.getTranslation('widgets.Blog.byline.location.label', state.blogLocale)
      if (locationLabel) {
        context.messages.location = locationLabel
      }
    }

    const isArchiveDailyWeekly = state.resolvedRoute?.viewId === 'archive_weekly_daily' || state.viewId === 'archive_weekly_daily'
    if (state.viewId !== 'post' && state.viewId !== 'static_page') {
      if (!state.config.overrides?.view?.title) {
        context.view.title = blogMeta.title
      }
      if (!state.config.overrides?.view?.description) {
        context.view.description = blogMeta.description
      }
      if (state.viewId === 'homepage') {
        context.view.url = blogMeta.homepageUrl
        context.blog.canonicalUrl = blogMeta.homepageUrl
      }
      else {
        let resolvedUrl = state.activeUrl || blogMeta.homepageUrl
        if (isArchiveDailyWeekly) {
          resolvedUrl = resolvedUrl.replace(/\/(\d{4})_(\d{2})_(\d{2})_archive\.html(?=[?#]|$)/, '/$1/$2/')
        }
        context.view.url = resolvedUrl
        context.blog.canonicalUrl = resolvedUrl
      }
    }

    let activePosts = normalizedPosts.slice()

    if (state.viewId === 'post' || state.viewId === 'static_page') {
      if (state.viewId === 'post') {
        const targetPost = (state.config.targetId
          ? normalizedPosts.find(p => p.id === state.config.targetId)
          : (state.config.targetUrl
              ? normalizedPosts.find(p => isSameUrlOrPath(p.url, state.config.targetUrl) || isSameUrlOrPath(p.absoluteUrl, state.config.targetUrl))
              : (state.config.overrides?.view?.url
                  ? normalizedPosts.find(p => isSameUrlOrPath(p.url, state.config.overrides?.view?.url) || isSameUrlOrPath(p.absoluteUrl, state.config.overrides?.view?.url))
                  : normalizedPosts[0]))) || normalizedPosts[0]

        if (targetPost) {
          activePosts = [targetPost]
          context.view.postId = Number.parseInt(targetPost.id, 10) || targetPost.id
          context.view.title = targetPost.title
          context.view.url = targetPost.url
          context.view.description = targetPost.snippets.short
          const firstImg = extractFirstImage(targetPost.body)
          const primaryImg = firstImg || targetPost.featuredImage || ''
          if (primaryImg) {
            context.blog.postImageUrl = primaryImg
            context.blog.postImageThumbnailUrl = (targetPost as any).thumbnail || primaryImg
          }
          if (targetPost.featuredImage) {
            context.view.featuredImage = targetPost.featuredImage
          }
          context.blog.canonicalUrl = targetPost.url

          const commentsResponse = await client.fetchComments(effectiveBlogId, targetPost.id)
          const rawComments: readonly BloggerRawEntry[] = commentsResponse?.feed?.entry || []
          if (rawComments.length > 0) {
            const normalizedComments = rawComments
              .map(c => normalizeCommentEntry(c, state.mapper, effectiveBlogId, state.blogLocale, state.config.config?.blog?.commentDateFormat, state.blogTimeZone))
              .sort((a, b) => a.timestampValue - b.timestampValue)
            ;(targetPost as any).comments = normalizedComments
            ;(targetPost as any).numberOfComments = normalizedComments.length
          }
        }
      }
      else if (state.viewId === 'static_page') {
        const targetPage = (state.config.targetId
          ? normalizedPagePosts.find(p => p.id === state.config.targetId)
          : (state.config.targetUrl
              ? normalizedPagePosts.find(p => isSameUrlOrPath(p.url, state.config.targetUrl) || isSameUrlOrPath(p.absoluteUrl, state.config.targetUrl))
              : (state.config.overrides?.view?.url
                  ? normalizedPagePosts.find(p => isSameUrlOrPath(p.url, state.config.overrides?.view?.url) || isSameUrlOrPath(p.absoluteUrl, state.config.overrides?.view?.url))
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

    state.activePosts = activePosts
    state.normalizedPages = rawPages.map(e => normalizePageEntry(e, state.mapper, state.currentPath))
    state.blogAuthor = extractBlogAuthor({
      feed,
      rawPosts,
      normalizedPosts,
      defaultName: state.spec.getLocalizedMessage('anonymous', state.blogLocale) || 'Anonymous',
    })
  }
}
