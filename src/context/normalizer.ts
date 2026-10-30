import type {
  BloggerCommentData,
  BloggerHeaderData,
  BloggerLabelData,
  BloggerPageLink,
  BloggerPostData,
  BloggerPostLabel,
  BloggerRawEntry,
  BloggerRawFeed,
} from './types.js'
import type { UrlMapper } from './url-mapper.js'

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
    const formatter = new Intl.DateTimeFormat(intlLocale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    return { date: formatter.format(parsed), timestamp }
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
  saa?: string,
): BloggerPostData {
  const id = extractId(entry.id?.$t)
  const title = entry.title?.$t || ''
  const alternateLink = entry.link?.find(l => l.rel === 'alternate')?.href || ''
  const url = mapper.mapUrl(alternateLink)
  const body = entry.content?.$t || entry.summary?.$t || ''
  const snippets = createSnippets(entry.summary?.$t || entry.content?.$t || '')

  const published = formatBloggerDate(entry.published?.$t, locale)
  const updated = formatBloggerDate(entry.updated?.$t, locale)

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

  return {
    id,
    title,
    url,
    absoluteUrl: alternateLink,
    body,
    date: published.date,
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
    allowComments: true,
    allowNewComments: true,
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

export function normalizeCommentEntry(
  entry: BloggerRawEntry,
  mapper: UrlMapper,
  blogId: string,
  locale = 'en',
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
  const timestamp = displayTimeProp?.value || formatBloggerDate(entry.published?.$t, locale).date

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
