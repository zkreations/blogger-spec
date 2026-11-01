import type {
  BloggerCommentData,
  BloggerFeedLink,
  BloggerHeaderData,
  BloggerLabelData,
  BloggerPageLink,
  BloggerPostData,
  BloggerPostLabel,
  BloggerRawEntry,
  BloggerRawFeed,
} from './types.js'
import type { UrlMapper } from './url-mapper.js'

export interface NormalizePostOptions {
  readonly saa?: string
  readonly titleAndEnclosureLinks?: boolean
  readonly dateFormat?: string
}

export function formatIcuDate(
  date: Date,
  pattern: string,
  locale = 'en',
): string {
  const intlLocale = locale === 'en' ? 'en-US' : (locale === 'es' ? 'es-ES' : locale)
  const fullWeekday = date.toLocaleString(intlLocale, { weekday: 'long' })
  const shortWeekday = date.toLocaleString(intlLocale, { weekday: 'short' })
  const fullMonth = date.toLocaleString(intlLocale, { month: 'long' })
  const shortMonth = date.toLocaleString(intlLocale, { month: 'short' })
  const yearFull = String(date.getFullYear())
  const yearShort = yearFull.slice(-2)
  const monthNum = String(date.getMonth() + 1)
  const month2 = monthNum.padStart(2, '0')
  const dayNum = String(date.getDate())
  const day2 = dayNum.padStart(2, '0')
  const h24Num = String(date.getHours())
  const h24_2 = h24Num.padStart(2, '0')
  const h12 = date.getHours() % 12 || 12
  const h12Num = String(h12)
  const h12_2 = h12Num.padStart(2, '0')
  const minNum = String(date.getMinutes())
  const min2 = minNum.padStart(2, '0')
  const secNum = String(date.getSeconds())
  const sec2 = secNum.padStart(2, '0')
  const isSpanish = intlLocale.startsWith('es')
  const dayPeriod = date.getHours() >= 12 ? (isSpanish ? 'p. m.' : 'PM') : (isSpanish ? 'a. m.' : 'AM')

  const tokenRegex = /'([^']+)'|EEEE|EEE|MMMM|MMM|MM|M|dd|d|yyyy|yy|HH|H|hh|h|mm|m|ss|[saz]/g

  return pattern.replace(tokenRegex, (match, quoted) => {
    if (quoted !== undefined)
      return quoted
    switch (match) {
      case 'EEEE': return fullWeekday
      case 'EEE': return shortWeekday
      case 'MMMM': return fullMonth
      case 'MMM': return shortMonth
      case 'MM': return month2
      case 'M': return monthNum
      case 'dd': return day2
      case 'd': return dayNum
      case 'yyyy': return yearFull
      case 'yy': return yearShort
      case 'HH': return h24_2
      case 'H': return h24Num
      case 'hh': return h12_2
      case 'h': return h12Num
      case 'mm': return min2
      case 'm': return minNum
      case 'ss': return sec2
      case 's': return secNum
      case 'a': return dayPeriod
      case 'z': return 'UTC'
      default: return match
    }
  })
}

export function stripHtml(html: string): string {
  if (!html)
    return ''
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, '\'')
    .replace(/&#39;/g, '\'')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function createSnippets(contentOrSummary: string): { short: string, long: string } {
  const clean = stripHtml(contentOrSummary)
  const short = clean.length > 100 ? `${clean.slice(0, 100).trim()}...` : clean
  const long = clean.length > 250 ? `${clean.slice(0, 250).trim()}...` : clean
  return { short, long }
}

export function extractId(rawId: string | undefined): string {
  if (!rawId)
    return ''
  const match = rawId.match(/(?:post|page|blog)-(\d+)$/)
  return match ? match[1] : rawId
}

export function extractFirstImage(html: string): string {
  if (!html)
    return ''
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (!match)
    return ''
  const src = match[1]
  return src.startsWith('//') ? `https:${src}` : src
}

export function formatBloggerDate(
  isoString: string | undefined,
  locale = 'en',
  pattern?: string,
): { date: string, timestamp: number } {
  if (!isoString) {
    return { date: '', timestamp: 0 }
  }

  const parsed = new Date(isoString)
  if (Number.isNaN(parsed.getTime())) {
    return { date: isoString, timestamp: 0 }
  }

  const timestamp = parsed.getTime()
  try {
    const intlLocale = locale === 'en' ? 'en-US' : (locale === 'es' ? 'es-ES' : locale)
    if (!pattern) {
      const formatter = new Intl.DateTimeFormat(intlLocale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      return { date: formatter.format(parsed), timestamp }
    }
    return { date: formatIcuDate(parsed, pattern, locale), timestamp }
  }
  catch {
    return { date: isoString, timestamp }
  }
}

export function normalizePostEntry(
  entry: BloggerRawEntry,
  mapper: UrlMapper,
  blogId: string,
  locale = 'en',
  saaOrOptions?: string | NormalizePostOptions,
): BloggerPostData {
  const options = typeof saaOrOptions === 'object' ? saaOrOptions : { saa: saaOrOptions }
  const saa = options.saa
  const dateFormat = options.dateFormat
  const titleAndEnclosureLinks = options.titleAndEnclosureLinks !== false

  const id = extractId(entry.id?.$t)
  const title = entry.title?.$t || ''
  const alternateLink = entry.link?.find(l => l.rel === 'alternate')?.href || ''
  const url = mapper.mapUrl(alternateLink)
  const body = entry.content?.$t || entry.summary?.$t || ''
  const snippets = createSnippets(entry.summary?.$t || entry.content?.$t || '')

  const published = formatBloggerDate(entry.published?.$t, locale, dateFormat)
  const updated = formatBloggerDate(entry.updated?.$t, locale, dateFormat)

  let thumbnail = entry.media$thumbnail?.url || ''
  if (thumbnail.startsWith('//')) {
    thumbnail = `https:${thumbnail}`
  }
  let featuredImage = thumbnail
    ? thumbnail.replace(/\/s\d+(-c)?\//, '/s1600/')
    : extractFirstImage(body)
  if (featuredImage.startsWith('//')) {
    featuredImage = `https:${featuredImage}`
  }

  const rawAuthor = entry.author?.[0]
  const authorName = rawAuthor?.name?.$t || 'Blogger'
  const authorProfile = rawAuthor?.uri?.$t || ''
  let authorAvatar = rawAuthor?.gd$image?.src || 'https://lh3.googleusercontent.com/a/default-user=s80-c'
  if (authorAvatar.startsWith('//')) {
    authorAvatar = `https:${authorAvatar}`
  }

  const labels: BloggerPostLabel[] = (entry.category || []).map((cat) => {
    const term = cat.term
    const rawLabelUrl = mapper.blogHost
      ? `https://${mapper.blogHost}/search/label/${encodeURIComponent(term)}`
      : `/search/label/${encodeURIComponent(term)}`

    return {
      name: term,
      url: mapper.mapUrl(rawLabelUrl),
    }
  })

  const numberOfComments = Number.parseInt(entry.thr$total?.$t || '0', 10) || 0
  const allowComments = entry.link ? entry.link.some(l => l.rel === 'replies') : true

  const titleLink = titleAndEnclosureLinks
    ? (entry.link?.find(l => l.rel === 'enclosure')?.href || alternateLink)
    : undefined

  const feedLinks: BloggerFeedLink[] | undefined = titleAndEnclosureLinks
    ? (entry.link?.filter(l => l.rel === 'replies' || l.type?.includes('atom') || l.type?.includes('rss')) || []).map(l => ({
        url: mapper.mapUrl(l.href),
        name: l.title || 'Comments',
        feedType: l.type?.includes('atom') ? 'atom' : 'rss',
        mimeType: l.type || 'application/atom+xml',
      }))
    : undefined

  return {
    id,
    title,
    url,
    absoluteUrl: alternateLink,
    ...(titleLink !== undefined ? { link: titleLink } : {}),
    ...(feedLinks !== undefined ? { feedLinks } : {}),
    body,
    date: published.date,
    timestamp: published.timestamp,
    publishedIso: entry.published?.$t || '',
    lastUpdated: updated.date,
    featuredImage,
    thumbnailUrl: thumbnail,
    author: {
      name: authorName,
      profileUrl: authorProfile,
      aboutMe: '',
      authorPhoto: {
        url: authorAvatar,
        width: 80,
        height: 80,
        alt: authorName,
      },
    },
    labels,
    snippets,
    numberOfComments,
    allowComments,
    allowNewComments: allowComments,
    showThreadedComments: true,
    hasJumpLink: body.includes('<!--more-->'),
    comments: [],
    commentFormIframeSrc: (() => {
      const origin = mapper.blogHost
        ? `https://${mapper.blogHost}`
        : (alternateLink.startsWith('http') ? new URL(alternateLink).origin : '')
      const queryParts = [
        `po=${encodeURIComponent(id)}`,
        `hl=${encodeURIComponent(locale)}`,
      ]
      const effectiveSaa = saa || (entry as any).saa
      if (effectiveSaa) {
        queryParts.push(`saa=${encodeURIComponent(effectiveSaa)}`)
      }
      if (origin) {
        queryParts.push(`origin=${encodeURIComponent(origin)}`)
      }
      return `https://www.blogger.com/comment/frame/${blogId}?${queryParts.join('&')}`
    })(),
  }
}

export function normalizePageEntry(
  entry: BloggerRawEntry,
  mapper: UrlMapper,
  currentPath?: string,
): BloggerPageLink {
  const id = extractId(entry.id?.$t)
  const title = entry.title?.$t || ''
  const alternateLink = entry.link?.find(l => l.rel === 'alternate')?.href || ''
  const href = mapper.mapUrl(alternateLink)

  const isCurrentPage = Boolean(
    currentPath
    && (href === currentPath || alternateLink === currentPath),
  )

  return {
    id,
    title,
    href,
    isCurrentPage,
  }
}

export function normalizePageAsPostEntry(
  entry: BloggerRawEntry,
  mapper: UrlMapper,
  blogId: string,
  locale = 'en',
  saaOrOptions?: string | NormalizePostOptions,
): BloggerPostData {
  const options = typeof saaOrOptions === 'object' ? saaOrOptions : { saa: saaOrOptions }
  const saa = options.saa
  const dateFormat = options.dateFormat
  const titleAndEnclosureLinks = options.titleAndEnclosureLinks !== false

  const id = extractId(entry.id?.$t)
  const title = entry.title?.$t || ''
  const alternateLink = entry.link?.find(l => l.rel === 'alternate')?.href || ''
  const url = mapper.mapUrl(alternateLink)
  const body = entry.content?.$t || entry.summary?.$t || ''
  const snippets = createSnippets(entry.summary?.$t || entry.content?.$t || '')

  const published = formatBloggerDate(entry.published?.$t, locale, dateFormat)
  const updated = formatBloggerDate(entry.updated?.$t, locale, dateFormat)

  let thumbnail = entry.media$thumbnail?.url || ''
  if (thumbnail.startsWith('//')) {
    thumbnail = `https:${thumbnail}`
  }
  let featuredImage = thumbnail
    ? thumbnail.replace(/\/s\d+(-c)?\//, '/s1600/')
    : extractFirstImage(body)
  if (featuredImage.startsWith('//')) {
    featuredImage = `https:${featuredImage}`
  }

  const rawAuthor = entry.author?.[0]
  const authorName = rawAuthor?.name?.$t || 'Blogger'
  const authorProfile = rawAuthor?.uri?.$t || ''
  let authorAvatar = rawAuthor?.gd$image?.src || 'https://lh3.googleusercontent.com/a/default-user=s80-c'
  if (authorAvatar.startsWith('//')) {
    authorAvatar = `https:${authorAvatar}`
  }

  const titleLink = titleAndEnclosureLinks
    ? (entry.link?.find(l => l.rel === 'enclosure')?.href || alternateLink)
    : undefined

  return {
    id,
    title,
    url,
    absoluteUrl: alternateLink,
    ...(titleLink !== undefined ? { link: titleLink } : {}),
    body,
    date: published.date,
    timestamp: published.timestamp,
    publishedIso: entry.published?.$t || '',
    lastUpdated: updated.date,
    featuredImage,
    thumbnailUrl: thumbnail,
    author: {
      name: authorName,
      profileUrl: authorProfile,
      aboutMe: '',
      authorPhoto: {
        url: authorAvatar,
        width: 80,
        height: 80,
        alt: authorName,
      },
    },
    labels: [],
    snippets,
    numberOfComments: 0,
    allowComments: Boolean(entry.link?.some(l => l.rel === 'replies')),
    allowNewComments: Boolean(entry.link?.some(l => l.rel === 'replies')),
    showThreadedComments: false,
    hasJumpLink: false,
    comments: [],
    commentFormIframeSrc: (() => {
      const origin = mapper.blogHost
        ? `https://${mapper.blogHost}`
        : (alternateLink.startsWith('http') ? new URL(alternateLink).origin : '')
      const originParam = origin ? `&origin=${origin}` : ''
      const saaParam = saa ? `&saa=${saa}` : ''
      return `https://www.blogger.com/comment/frame/${blogId}?pa=${id}&hl=${locale}${saaParam}${originParam}`
    })(),
  }
}

export function normalizeCommentEntry(
  entry: BloggerRawEntry,
  mapper: UrlMapper,
  blogId: string,
  locale = 'en',
  dateFormat?: string,
): BloggerCommentData {
  const id = extractId(entry.id?.$t)
  const rawAuthor = entry.author?.[0]
  const author = rawAuthor?.name?.$t || 'Anonymous'
  let authorAvatarSrc = rawAuthor?.gd$image?.src || 'https://img1.blogblog.com/img/blank.gif'
  if (authorAvatarSrc.startsWith('//')) {
    authorAvatarSrc = `https:${authorAvatarSrc}`
  }
  const rawAuthorUri = rawAuthor?.uri?.$t || ''
  const authorUrl = rawAuthorUri ? mapper.mapUrl(rawAuthorUri) : ''

  let authorUserType = 'ANONYMOUS'
  if (authorUrl.includes('blogger.com/profile')) {
    authorUserType = 'BLOGGER'
  }
  else if (authorUrl) {
    authorUserType = 'OPENID'
  }

  const body = entry.content?.$t || entry.summary?.$t || ''

  const extProps = entry.gd$extendedProperty || []
  const displayTimeProp = extProps.find(p => p.name === 'blogger.displayTime')
  const timestamp = (dateFormat ? formatBloggerDate(entry.published?.$t, locale, dateFormat).date : displayTimeProp?.value)
    || formatBloggerDate(entry.published?.$t, locale, dateFormat).date

  const pubDate = new Date(entry.published?.$t || Date.now())
  const timestampValue = Number.isNaN(pubDate.getTime()) ? 0 : pubDate.getTime()
  const timestampAbs = Math.floor(timestampValue / 1000)

  const relatedLink = entry.link?.find(l => l.rel === 'related')?.href
  let inReplyTo = ''
  if (relatedLink) {
    const match = relatedLink.match(/\/(\d+)$/)
    if (match) {
      inReplyTo = match[1]
    }
  }

  const itemClassProp = extProps.find(p => p.name === 'blogger.itemClass')
  const adminClass = itemClassProp?.value ? `blog-admin ${itemClassProp.value}` : ''

  const deleteUrl = `https://www.blogger.com/comment/delete/${blogId}/${id}`
  const alternateLink = entry.link?.find(l => l.rel === 'alternate')?.href || ''
  const url = alternateLink ? mapper.mapUrl(alternateLink) : ''
  const anchorName = `c${id}`

  return {
    id,
    author,
    authorAvatarSrc,
    authorUrl,
    authorUserType,
    body,
    timestamp,
    timestampValue,
    timestampAbs,
    inReplyTo,
    isDeleted: false,
    adminClass,
    deleteUrl,
    url,
    anchorName,
  }
}

export function normalizeLabels(
  entries: readonly BloggerRawEntry[],
  mapper: UrlMapper,
  sorting: 'ALPHA' | 'FREQUENCY' = 'ALPHA',
): readonly BloggerLabelData[] {
  const counts = new Map<string, number>()

  for (const entry of entries) {
    if (!entry.category)
      continue
    for (const cat of entry.category) {
      if (!cat.term)
        continue
      counts.set(cat.term, (counts.get(cat.term) || 0) + 1)
    }
  }

  const result: BloggerLabelData[] = []
  for (const [name, count] of counts.entries()) {
    const rawUrl = mapper.blogHost
      ? `https://${mapper.blogHost}/search/label/${encodeURIComponent(name)}`
      : `/search/label/${encodeURIComponent(name)}`

    result.push({
      name,
      count,
      url: mapper.mapUrl(rawUrl),
    })
  }

  if (sorting === 'FREQUENCY') {
    return result.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }
  return result.sort((a, b) => a.name.localeCompare(b.name))
}

export function normalizeHeader(
  feed: BloggerRawFeed,
  mapper: UrlMapper,
): BloggerHeaderData {
  const title = feed.title?.$t || ''
  const description = feed.subtitle?.$t || ''
  const alternateLink = feed.link?.find(l => l.rel === 'alternate')?.href || ''

  return {
    title,
    description,
    url: mapper.mapUrl(alternateLink || '/'),
  }
}

export function normalizeBlogMetadata(
  feed: BloggerRawFeed,
  mapper: UrlMapper,
  blogId: string,
): Record<string, any> {
  const alternateLink = feed.link?.find(l => l.rel === 'alternate')?.href || ''
  const title = feed.title?.$t || ''
  const description = feed.subtitle?.$t || ''
  const homepageUrl = mapper.mapUrl(alternateLink || '/')

  return {
    title,
    description,
    homepageUrl,
    url: homepageUrl,
    canonicalUrl: homepageUrl,
    blogId,
    blogspotFaviconUrl: alternateLink
      ? `${alternateLink.replace(/\/+$/, '')}/favicon.ico`
      : '/favicon.ico',
    searchUrl: mapper.mapUrl(alternateLink ? `${alternateLink.replace(/\/+$/, '')}/search` : '/search'),
  }
}
