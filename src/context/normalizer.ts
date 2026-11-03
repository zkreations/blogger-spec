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
import { getSpecCatalog } from '../catalogs/index.js'
import { formatIcuDate } from './date-formatter.js'

export { formatIcuDate }

export interface NormalizePostOptions {
  readonly saa?: string
  readonly titleAndEnclosureLinks?: boolean
  readonly configuredLink?: string
  readonly dateFormat?: string
  readonly timeZone?: string
  readonly commentFrameBaseUrl?: string
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

export interface CreateSnippetsOptions {
  readonly shortLength?: number
  readonly longLength?: number
  readonly ellipsis?: string
}

export function createSnippets(
  contentOrSummary: string,
  options?: CreateSnippetsOptions,
): { short: string, long: string } {
  const clean = stripHtml(contentOrSummary)
  const ellipsis = options?.ellipsis ?? '…'
  const shortLen = options?.shortLength ?? 100
  const longLen = options?.longLength ?? 250

  const short = clean.length > shortLen ? `${clean.slice(0, shortLen).trim()}${ellipsis}` : clean
  const long = clean.length > longLen ? `${clean.slice(0, longLen).trim()}${ellipsis}` : clean
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
  timeZone?: string,
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
    if (pattern) {
      return { date: formatIcuDate(isoString, pattern, locale, timeZone), timestamp }
    }
    const intlLocale = getSpecCatalog().resolveBcp47Locale(locale)
    let displayDate = parsed
    let fmtTz = timeZone || 'UTC'
    if (!timeZone) {
      const offsetMatch = /([+-])(\d{2}):?(\d{2})$/.exec(isoString.trim())
      if (offsetMatch) {
        const sign = offsetMatch[1] === '-' ? -1 : 1
        const totalOffsetMs = sign * (Number.parseInt(offsetMatch[2]!, 10) * 60 + Number.parseInt(offsetMatch[3]!, 10)) * 60000
        displayDate = new Date(timestamp + totalOffsetMs)
        fmtTz = 'UTC'
      }
    }
    const formatter = new Intl.DateTimeFormat(intlLocale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: fmtTz,
    })
    return { date: formatter.format(displayDate), timestamp }
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

  const published = formatBloggerDate(entry.published?.$t, locale, dateFormat, options.timeZone)
  const updated = formatBloggerDate(entry.updated?.$t, locale, dateFormat, options.timeZone)

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

  const titleLink = options.configuredLink !== undefined
    ? options.configuredLink
    : undefined

  const feedLinks: BloggerFeedLink[] | undefined = titleAndEnclosureLinks
    ? (entry.link?.filter(l => l.rel === 'replies' || l.rel === 'enclosure' || l.type?.includes('atom') || l.type?.includes('rss')) || []).map(l => ({
        url: mapper.mapUrl(l.href),
        name: l.title || (l.rel === 'enclosure' ? 'Enclosure' : 'Comments'),
        feedType: l.type?.includes('atom') ? 'atom' : (l.rel === 'enclosure' ? 'enclosure' : 'rss'),
        mimeType: l.type || (l.rel === 'enclosure' ? 'application/octet-stream' : 'application/atom+xml'),
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
    cmtfpIframe: '',
    noNewCommentsText: '',
    commentRangeText: '',
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
      if (options.commentFrameBaseUrl) {
        const base = options.commentFrameBaseUrl
        const separator = base.includes('?') ? '&' : '?'
        return `${base}${separator}${queryParts.join('&')}`
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

  const published = formatBloggerDate(entry.published?.$t, locale, dateFormat, options.timeZone)
  const updated = formatBloggerDate(entry.updated?.$t, locale, dateFormat, options.timeZone)

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

  const titleLink = options.configuredLink !== undefined
    ? options.configuredLink
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
      const queryParts = [
        `pa=${encodeURIComponent(id)}`,
        `hl=${encodeURIComponent(locale)}`,
      ]
      if (saa) {
        queryParts.push(`saa=${encodeURIComponent(saa)}`)
      }
      if (origin) {
        queryParts.push(`origin=${encodeURIComponent(origin)}`)
      }
      if (options.commentFrameBaseUrl) {
        const base = options.commentFrameBaseUrl
        const separator = base.includes('?') ? '&' : '?'
        return `${base}${separator}${queryParts.join('&')}`
      }
      return `https://www.blogger.com/comment/frame/${blogId}?${queryParts.join('&')}`
    })(),
  }
}

export function normalizeCommentEntry(
  entry: BloggerRawEntry,
  mapper: UrlMapper,
  blogId: string,
  locale = 'en',
  dateFormat?: string,
  timeZone?: string,
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
  const timestamp = (dateFormat ? formatBloggerDate(entry.published?.$t, locale, dateFormat, timeZone).date : displayTimeProp?.value)
    || formatBloggerDate(entry.published?.$t, locale, dateFormat, timeZone).date

  const pubDate = entry.published?.$t ? new Date(entry.published.$t) : null
  const timestampValue = !pubDate || Number.isNaN(pubDate.getTime()) ? 0 : pubDate.getTime()
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
