import type { BloggerViewId } from '../generated/types.generated.js'

export const CANONICAL_VIEWS = [
  'homepage',
  'post_listing',
  'post',
  'static_page',
  'archive_yearly',
  'archive_monthly',
  'archive_weekly_daily',
  'label_search',
  'search_query',
  'error_404',
  'preview',
  'layout_mode',
] as const

export interface BloggerResolvedRouteParams {
  readonly q?: string
  readonly label?: string
  readonly year?: number
  readonly month?: number
  readonly day?: number
  readonly slug?: string
  readonly postId?: string
  readonly pageId?: string
  readonly [key: string]: unknown
}

export interface BloggerResolvedRoute {
  readonly viewId: BloggerViewId
  readonly pathname: string
  readonly params: BloggerResolvedRouteParams
  readonly searchParams: URLSearchParams
}

export function resolveBloggerRoute(input: string): BloggerResolvedRoute {
  const cleanInput = (input || '/').trim()
  let parsed: URL
  try {
    parsed = new URL(cleanInput, 'https://blogger.local')
  }
  catch {
    parsed = new URL('/', 'https://blogger.local')
  }

  const pathname = parsed.pathname
  const searchParams = parsed.searchParams
  const params: Record<string, any> = {}

  // 1. Explicit view parameter override
  const viewParam = searchParams.get('view')
  if (viewParam && (CANONICAL_VIEWS as readonly string[]).includes(viewParam)) {
    return {
      viewId: viewParam as BloggerViewId,
      pathname,
      params,
      searchParams,
    }
  }

  // 2. Preview & Layout modes
  if (searchParams.get('preview') === 'true' || searchParams.get('isPreview') === 'true') {
    return { viewId: 'preview', pathname, params, searchParams }
  }
  if (searchParams.get('layout_mode') === 'true' || searchParams.get('isLayoutMode') === 'true' || pathname.startsWith('/layout_mode')) {
    return { viewId: 'layout_mode', pathname, params, searchParams }
  }

  // 3. Error 404
  if (pathname === '/404' || pathname === '/404.html' || pathname.startsWith('/error')) {
    return { viewId: 'error_404', pathname, params, searchParams }
  }

  // 4. Label search: /search/label/:label
  const labelMatch = pathname.match(/\/search\/label\/([^/?#]+)/)
  if (labelMatch) {
    const rawLabel = decodeURIComponent(labelMatch[1].replace(/\+/g, ' '))
    params.label = rawLabel
    return { viewId: 'label_search', pathname, params, searchParams }
  }
  if (pathname.startsWith('/search') && searchParams.get('label')) {
    params.label = searchParams.get('label')!
    return { viewId: 'label_search', pathname, params, searchParams }
  }

  // 5. Text search query: /search?q=:query
  const qParam = searchParams.get('q')
  if (qParam && pathname.startsWith('/search')) {
    params.q = qParam
    return { viewId: 'search_query', pathname, params, searchParams }
  }

  // 6. Post listing / paginated stream: /search?... with pagination parameters
  if (pathname.startsWith('/search') && (searchParams.get('updated-max') || searchParams.get('updated-min') || searchParams.get('max-results'))) {
    return { viewId: 'post_listing', pathname, params, searchParams }
  }

  // 7. Static page: /p/:slug.html
  const pageMatch = pathname.match(/\/p\/([^/?#]+?)(?:\.html)?\/?$/)
  if (pageMatch) {
    params.slug = pageMatch[1]
    return { viewId: 'static_page', pathname, params, searchParams }
  }

  // 8. Individual Post: /:year/:month/:slug.html
  const postMatch = pathname.match(/\/(\d{4})\/(\d{2})\/([^/?#]+?)(?:\.html)?\/?$/)
  if (postMatch) {
    params.year = Number.parseInt(postMatch[1], 10)
    params.month = Number.parseInt(postMatch[2], 10)
    params.slug = postMatch[3]
    return { viewId: 'post', pathname, params, searchParams }
  }

  // 9. Daily/Weekly archive: /:year_:month_:day_archive.html
  const dailyMatch = pathname.match(/\/(\d{4})_(\d{2})_(\d{2})_archive\.html/)
  if (dailyMatch) {
    params.year = Number.parseInt(dailyMatch[1], 10)
    params.month = Number.parseInt(dailyMatch[2], 10)
    params.day = Number.parseInt(dailyMatch[3], 10)
    return { viewId: 'archive_weekly_daily', pathname, params, searchParams }
  }

  // 10. Monthly archive: /:year/:month/
  const monthlyMatch = pathname.match(/\/(\d{4})\/(\d{1,2})\/?$/)
  if (monthlyMatch) {
    params.year = Number.parseInt(monthlyMatch[1], 10)
    params.month = Number.parseInt(monthlyMatch[2], 10)
    return { viewId: 'archive_monthly', pathname, params, searchParams }
  }

  // 11. Yearly archive: /:year/
  const yearlyMatch = pathname.match(/\/(\d{4})\/?$/)
  if (yearlyMatch) {
    params.year = Number.parseInt(yearlyMatch[1], 10)
    return { viewId: 'archive_yearly', pathname, params, searchParams }
  }

  // 12. Homepage root or fallback
  return {
    viewId: 'homepage',
    pathname,
    params,
    searchParams,
  }
}
