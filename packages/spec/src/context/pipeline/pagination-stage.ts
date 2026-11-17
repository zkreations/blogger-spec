import type { ContextStage, ResolutionState } from './types.js'

export class PaginationStage implements ContextStage {
  readonly name = 'pagination'

  process(context: Record<string, any>, state: ResolutionState): void {
    const { viewId, blogLocale, spec, mapper, config } = state
    context.widgetData = context.widgetData || {}
    context.widgetData.Blog1 = context.widgetData.Blog1 || {}
    const blog1 = context.widgetData.Blog1
    context.widgetData.Blog = blog1
    state.blog1 = blog1
    let activePosts = state.activePosts || []

    if (state.config.offline) {
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
      state.activePosts = activePosts
      return
    }

    if (viewId === 'post' || viewId === 'static_page' || viewId === 'error_404') {
      blog1.posts = activePosts
      blog1.numPosts = activePosts.length
      blog1.title = spec.getWidgetDefaultTitle('Blog', blogLocale)
      context.widgetData.Blog1 = blog1
      context.widgetData.Blog = blog1
      state.activePosts = activePosts
      return
    }

    const resolvedRoute = state.resolvedRoute
    const searchParams = resolvedRoute?.searchParams
    const feed = state.feed

    const maxResultsParam = searchParams?.get('max-results')
    const maxResults = maxResultsParam ? Number.parseInt(maxResultsParam, 10) : undefined
    const startParam = searchParams?.get('start')
    const startIndex = startParam ? Number.parseInt(startParam, 10) : 0
    const byDateParam = searchParams?.get('by-date')
    const updatedMax = searchParams?.get('updated-max')
    const updatedMin = searchParams?.get('updated-min')

    const hasMoreOlder = Boolean(maxResults && maxResults > 0 && activePosts.length > maxResults)

    if (maxResults && maxResults > 0) {
      activePosts = activePosts.slice(0, maxResults)
    }

    const blogOrigin = mapper.blogHost ? `https://${mapper.blogHost}` : ''
    const pathLabel = resolvedRoute?.params?.label
    const effectiveLabel = pathLabel
      || searchParams?.get('label')
      || (config.overrides?.view?.search as any)?.label
      || (config.overrides?.view as any)?.searchLabel

    const isArchiveRoute = resolvedRoute?.viewId === 'archive_yearly'
      || resolvedRoute?.viewId === 'archive_monthly'
      || resolvedRoute?.viewId === 'archive_weekly_daily'
    const pathYear = isArchiveRoute ? resolvedRoute?.params?.year : undefined
    const effectiveArchiveYear = pathYear
      || (config.overrides?.view?.archive as any)?.year
      || (config.overrides?.view as any)?.year

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
        const hasMore = (maxResults && maxResults > 0)
          ? hasMoreOlder
          : activePosts.length > pageSize

        if (hasMore) {
          const lastPost = activePosts[pageSize - 1] || activePosts[activePosts.length - 1]
          const nextDate = lastPost?.publishedIso?.replace(/\.\d{3}/, '') || ''
          blog1.olderPageUrl = mapper.mapUrl(`${blogOrigin}/search/label/${encodedLabel}?updated-max=${nextDate}&max-results=${pageSize}&start=${pageSize}&by-date=false`)
          activePosts = activePosts.slice(0, pageSize)
        }
        else {
          blog1.olderPageUrl = ''
        }
      }
    }
    else if (viewId.startsWith('archive_') || effectiveArchiveYear) {
      blog1.newerPageUrl = mapper.mapUrl(context.blog.homepageUrl || (blogOrigin ? `${blogOrigin}/` : '/'))

      if (activePosts.length > 0) {
        const lastPost = activePosts[activePosts.length - 1]
        const hasOlderInBlog = state.normalizedPosts.some((p: any) => (p.timestamp ?? 0) < (lastPost?.timestamp ?? 0))
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
      const defaultPageSize = spec.getBlogPagination()?.defaultPostsPerPage ?? 7
      const pageSize = maxResults || defaultPageSize
      if (startIndex <= pageSize) {
        blog1.newerPageUrl = mapper.mapUrl(context.blog.homepageUrl || (blogOrigin ? `${blogOrigin}/` : '/'))
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
    else if (feed) {
      const nextLink = feed.link?.find((l: any) => l.rel === 'next')?.href
      const prevLink = feed.link?.find((l: any) => l.rel === 'previous')?.href
      blog1.olderPageUrl = nextLink ? mapper.mapUrl(nextLink) : ''
      blog1.newerPageUrl = prevLink ? mapper.mapUrl(prevLink) : ''
    }

    if (viewId === 'homepage' && config.config?.blog?.postsPerPage && (!searchParams || searchParams.size === 0)) {
      const postsPerPage = config.config.blog.postsPerPage
      if (activePosts.length > postsPerPage && !blog1.olderPageUrl) {
        const lastPost = activePosts[postsPerPage - 1]
        const nextDate = lastPost?.publishedIso?.replace(/\.\d{3}/, '') || ''
        blog1.olderPageUrl = mapper.mapUrl(`${blogOrigin}/search?updated-max=${nextDate}&max-results=${postsPerPage}`)
      }
      activePosts = activePosts.slice(0, postsPerPage)
    }

    blog1.posts = activePosts
    blog1.numPosts = activePosts.length
    blog1.title = spec.getWidgetDefaultTitle('Blog', blogLocale)
    context.widgetData.Blog1 = blog1
    context.widgetData.Blog = blog1
    state.activePosts = activePosts
  }
}
