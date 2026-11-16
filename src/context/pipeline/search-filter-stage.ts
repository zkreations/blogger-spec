import type { ContextStage, ResolutionState } from './types.js'

export class SearchFilterStage implements ContextStage {
  readonly name = 'searchFilter'

  process(context: Record<string, any>, state: ResolutionState): void {
    const { viewId, blogLocale, spec, mapper, config } = state
    context.widgetData = context.widgetData || {}
    context.widgetData.Blog1 = context.widgetData.Blog1 || {}
    const blog1 = context.widgetData.Blog1
    context.widgetData.Blog = blog1
    state.blog1 = blog1
    let activePosts = state.activePosts || []
    const resolvedRoute = state.resolvedRoute
    const searchParams = resolvedRoute?.searchParams

    if (state.config.offline) {
      this.processOfflineSearch(context, state, blog1)
      return
    }

    if (viewId === 'error_404') {
      activePosts = []
      const custom404 = config.overrides?.blog?.custom404Message
        ?? (config.config?.blog as any)?.custom404Message
        ?? (config.overrides?.widgetData?.Blog1 as any)?.navMessage
        ?? (config.config?.widgets?.Blog1 as any)?.navMessage
      const navMsg = custom404 ?? spec.getWidgetNavMessage('Blog', blogLocale)
      blog1.navMessage = navMsg
      state.activePosts = activePosts
      return
    }

    if (viewId === 'post' || viewId === 'static_page') {
      return
    }

    const effectiveQ = searchParams?.get('q')
      || (config.overrides?.view?.search as any)?.query
      || (config.overrides?.view as any)?.searchQuery

    if (effectiveQ) {
      context.view.search = context.view.search || {}
      context.view.search.query = effectiveQ
      context.view.searchQuery = effectiveQ
      context.view.search.resultsMessage = spec.getSearchQueryResultsMessage(effectiveQ, blogLocale, false)
      context.view.search.resultsMessageHtml = spec.getSearchQueryResultsMessage(effectiveQ, blogLocale, true)

      const byDate = searchParams?.get('by-date') === 'true'
      const searchUrl = mapper.mapUrl(`${context.blog.homepageUrl.replace(/\/$/, '')}/search`)
      const defaultSearchPageSize = spec.getBlogPagination()?.searchPageSize ?? 20
      blog1.navMessage = spec.buildBlogNavMessage({
        type: 'query',
        query: effectiveQ,
        byDate,
        maxResults: searchParams?.get('max-results') || defaultSearchPageSize,
        homepageUrl: context.blog.homepageUrl,
        searchUrl,
        locale: blogLocale,
      })
    }

    const isArchiveDailyWeekly = resolvedRoute?.viewId === 'archive_weekly_daily' || viewId === 'archive_weekly_daily'
    const isArchiveRoute = resolvedRoute?.viewId === 'archive_yearly'
      || resolvedRoute?.viewId === 'archive_monthly'
      || resolvedRoute?.viewId === 'archive_weekly_daily'
    const pathLabel: string | undefined = resolvedRoute?.params?.label
    const pathYear: number | undefined = isArchiveRoute ? resolvedRoute?.params?.year : undefined
    const pathMonth: number | undefined = isArchiveRoute ? resolvedRoute?.params?.month : undefined
    const pathDay: number | undefined = (isArchiveRoute && !isArchiveDailyWeekly) ? resolvedRoute?.params?.day : undefined

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

      if (!blog1.navMessage) {
        blog1.navMessage = spec.buildBlogNavMessage({
          type: 'label',
          label: effectiveLabel,
          homepageUrl: context.blog.homepageUrl,
          searchUrl: mapper.mapUrl(`${context.blog.homepageUrl.replace(/\/$/, '')}/search`),
          locale: blogLocale,
        })
      }

      const normLabel = effectiveLabel.trim().toLowerCase()
      activePosts = activePosts.filter((p: any) =>
        p.labels?.some((l: any) => l.name?.trim().toLowerCase() === normLabel),
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

      if (!blog1.navMessage) {
        blog1.navMessage = spec.buildBlogNavMessage({
          type: 'archive',
          archiveMessage: context.view.archive.rangeMessage,
          homepageUrl: context.blog.homepageUrl,
          searchUrl: mapper.mapUrl(`${context.blog.homepageUrl.replace(/\/$/, '')}/search`),
          locale: blogLocale,
        })
      }

      activePosts = activePosts.filter((p: any) => {
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
          activePosts = activePosts.filter((p: any) => (p.timestamp ?? 0) <= maxTime)
        }
      }

      if (updatedMin) {
        const minTime = new Date(updatedMin).getTime()
        if (!Number.isNaN(minTime)) {
          activePosts = activePosts.filter((p: any) => (p.timestamp ?? 0) >= minTime)
        }
      }

      if (effectiveQ) {
        const qLower = effectiveQ.toLowerCase()
        activePosts = activePosts.filter((p: any) =>
          p.title?.toLowerCase().includes(qLower)
          || p.body?.toLowerCase().includes(qLower)
          || p.labels?.some((l: any) => l.name?.toLowerCase().includes(qLower)),
        )

        if (byDateParam !== 'true') {
          const escapedQ = qLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const regex = new RegExp(`\\b${escapedQ}\\b`, 'g')
          activePosts.sort((a: any, b: any) => {
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
    }

    state.activePosts = activePosts
  }

  private processOfflineSearch(
    context: Record<string, any>,
    state: ResolutionState,
    blog1: Record<string, any>,
  ): void {
    const { viewId, blogLocale, spec, mapper, config } = state
    const resolvedTargetRoute = state.resolvedRoute
    const searchParams = resolvedTargetRoute?.searchParams

    if (viewId === 'error_404') {
      const custom404 = config.overrides?.blog?.custom404Message
        ?? (config.config?.blog as any)?.custom404Message
        ?? (config.overrides?.widgetData?.Blog1 as any)?.navMessage
        ?? (config.config?.widgets?.Blog1 as any)?.navMessage
      const navMsg = custom404 ?? spec.getWidgetNavMessage('Blog', blogLocale)
      blog1.navMessage = navMsg
      blog1.posts = []
      blog1.numPosts = 0
      state.activePosts = []
      return
    }

    if (viewId === 'search_query' && !blog1.navMessage) {
      const q = searchParams?.get('q') || (config.overrides?.view?.search as any)?.query || 'Search'
      context.view.search = context.view.search || {}
      context.view.search.query = q
      context.view.searchQuery = q
      const byDate = searchParams?.get('by-date') === 'true'
      const searchUrl = mapper.mapUrl(`${context.blog.homepageUrl.replace(/\/$/, '')}/search`)
      const defaultSearchPageSize = spec.getBlogPagination()?.searchPageSize ?? 20
      blog1.navMessage = spec.buildBlogNavMessage({
        type: 'query',
        query: q,
        byDate,
        maxResults: searchParams?.get('max-results') || defaultSearchPageSize,
        homepageUrl: context.blog.homepageUrl,
        searchUrl,
        locale: blogLocale,
      })
    }
    else if (viewId === 'label_search' && !blog1.navMessage) {
      const pathLabel = resolvedTargetRoute?.params?.label
      const lbl = pathLabel || searchParams?.get('label') || (config.overrides?.view?.search as any)?.label || 'Label'
      context.view.search = context.view.search || {}
      context.view.search.label = lbl
      context.view.searchLabel = lbl
      blog1.navMessage = spec.buildBlogNavMessage({
        type: 'label',
        label: lbl,
        homepageUrl: context.blog.homepageUrl,
        searchUrl: mapper.mapUrl(`${context.blog.homepageUrl.replace(/\/$/, '')}/search`),
        locale: blogLocale,
      })
    }
  }
}
