import type { BloggerPostData } from './types.js'
import type { UrlMapper } from './url-mapper.js'
import { getSpecCatalog } from '../catalogs/index.js'

export interface BloggerArchivePostLink {
  readonly title: string
  readonly url: string
}

export interface BloggerArchiveMonthInterval {
  readonly 'name': string
  readonly 'url': string
  readonly 'post-count': number
  readonly 'expclass': 'expanded' | 'collapsed'
  readonly 'toggleId': string
  readonly 'posts': readonly BloggerArchivePostLink[]
}

export interface BloggerArchiveYearInterval {
  readonly 'name': string
  readonly 'url': string
  readonly 'post-count': number
  readonly 'expclass': 'expanded' | 'collapsed'
  readonly 'toggleId': string
  readonly 'posts': readonly BloggerArchivePostLink[]
  readonly 'data': readonly BloggerArchiveMonthInterval[]
}

export interface BuildArchiveHierarchyOptions {
  readonly widgetId?: string
  readonly locale?: string
  readonly timeZone?: string
  readonly defaultExpclass?: 'expanded' | 'collapsed'
}

export function buildArchiveHierarchy(
  posts: readonly BloggerPostData[],
  mapper: UrlMapper,
  options: BuildArchiveHierarchyOptions = {},
): BloggerArchiveYearInterval[] {
  if (!posts || posts.length === 0) {
    return []
  }

  const widgetId = options.widgetId || 'BlogArchive1'
  const locale = options.locale || 'en'
  const timeZone = options.timeZone
  const expclass = options.defaultExpclass || 'expanded'
  const blogOrigin = mapper.blogHost ? `https://${mapper.blogHost}` : ''

  const yearMap = new Map<number, Map<number, BloggerPostData[]>>()

  for (const post of posts) {
    let year: number | undefined
    let month: number | undefined

    if (!timeZone && post.publishedIso) {
      const isoMatch = /^(\d{4})-(\d{2})/.exec(post.publishedIso)
      if (isoMatch) {
        year = Number.parseInt(isoMatch[1]!, 10)
        month = Number.parseInt(isoMatch[2]!, 10)
      }
    }

    if (year === undefined || month === undefined) {
      const date = post.publishedIso ? new Date(post.publishedIso) : (post.timestamp ? new Date(post.timestamp) : null)
      if (!date || Number.isNaN(date.getTime())) {
        continue
      }
      if (timeZone && timeZone !== 'UTC') {
        try {
          const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric' }).formatToParts(date)
          year = Number.parseInt(parts.find(p => p.type === 'year')?.value || '', 10)
          month = Number.parseInt(parts.find(p => p.type === 'month')?.value || '', 10)
        }
        catch {
          year = date.getUTCFullYear()
          month = date.getUTCMonth() + 1
        }
      }
      else {
        year = date.getUTCFullYear()
        month = date.getUTCMonth() + 1
      }
    }

    if (!year || !month || Number.isNaN(year) || Number.isNaN(month)) {
      continue
    }

    let monthMap = yearMap.get(year)
    if (!monthMap) {
      monthMap = new Map()
      yearMap.set(year, monthMap)
    }

    let postList = monthMap.get(month)
    if (!postList) {
      postList = []
      monthMap.set(month, postList)
    }
    postList.push(post)
  }

  const sortedYears = Array.from(yearMap.keys()).sort((a, b) => b - a)
  const result: BloggerArchiveYearInterval[] = []

  const intlLocale = getSpecCatalog().resolveBcp47Locale(locale)
  const monthFormatter = new Intl.DateTimeFormat(intlLocale, { month: 'long', timeZone: 'UTC' })

  for (const year of sortedYears) {
    const monthMap = yearMap.get(year)!
    const sortedMonths = Array.from(monthMap.keys()).sort((a, b) => b - a)

    const monthIntervals: BloggerArchiveMonthInterval[] = []
    let totalYearPosts = 0

    for (const month of sortedMonths) {
      const monthPosts = monthMap.get(month)!
      totalYearPosts += monthPosts.length

      const sampleDate = new Date(Date.UTC(year, month - 1, 1))
      const rawMonthName = monthFormatter.format(sampleDate)
      const monthName = rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1)
      const monthStr = String(month).padStart(2, '0')
      const monthUrl = mapper.mapUrl(`${blogOrigin}/${year}/${monthStr}/`)
      const toggleId = `${widgetId}_${year}_${monthStr}`

      const postLinks: BloggerArchivePostLink[] = monthPosts.map(p => ({
        title: p.title,
        url: p.url,
      }))

      monthIntervals.push({
        'name': monthName,
        'url': monthUrl,
        'post-count': monthPosts.length,
        'expclass': expclass,
        'toggleId': toggleId,
        'posts': postLinks,
      })
    }

    const yearUrl = mapper.mapUrl(`${blogOrigin}/${year}/`)
    const yearToggleId = `${widgetId}_${year}`

    result.push({
      'name': String(year),
      'url': yearUrl,
      'post-count': totalYearPosts,
      'expclass': expclass,
      'toggleId': yearToggleId,
      'posts': [],
      'data': monthIntervals,
    })
  }

  return result
}
