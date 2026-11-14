import type { SpecCatalog } from '../catalogs/spec-catalog.js'
import type { DiscoveredWidget } from './types.js'
import type { UrlMapper } from './url-mapper.js'
import type { BloggerExtractedAuthor } from './widget-author.js'
import { buildArchiveHierarchy } from './archive-tree.js'
import {
  buildAttributionData,
  buildContactFormData,
  buildPopularPostsData,
} from './secondary-widgets.js'
import { normalizeLinkItem } from './widget-extractor.js'

export interface HydrateWidgetContext {
  readonly widgetId: string
  readonly widget: DiscoveredWidget
  readonly type: string
  readonly merged: Record<string, any>
  readonly catalogDefaults: Record<string, any>
  readonly templateSettings?: Record<string, any>
  readonly instanceConfig?: Record<string, any>
  readonly instanceOverrides?: Record<string, any>
  readonly genericTypeConfig?: Record<string, any>
  readonly context: Record<string, any>
  readonly spec: SpecCatalog
  readonly mapper: UrlMapper
  readonly blogLocale: string
  readonly blogTimeZone: string
  readonly currentPath?: string
  readonly normalizedPages: readonly any[]
  readonly normalizedLabels: readonly any[]
  readonly normalizedPosts: readonly any[]
  readonly activePosts: readonly any[]
  readonly headerData: any
  readonly blog1: any
  readonly blogAuthor: BloggerExtractedAuthor
}

function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    const sVal = (source as any)[key]
    const tVal = (result as any)[key]
    if (sVal && typeof sVal === 'object' && !Array.isArray(sVal) && tVal && typeof tVal === 'object' && !Array.isArray(tVal)) {
      (result as any)[key] = deepMerge(tVal, sVal)
    }
    else if (sVal !== undefined) {
      (result as any)[key] = sVal
    }
  }
  return result
}

export function getDefaultBylineItems(spec: SpecCatalog, locale: string): Array<{ name: string, label: string }> {
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
      label: spec.getTranslation('widgets.Blog.byline.timestamp.label', locale) || '',
    },
    {
      name: 'comments',
      label: spec.getTranslation('widgets.Blog.byline.comments.label', locale) || spec.getLocalizedMessage('comments', locale) || 'Comments',
    },
    {
      name: 'icons',
      label: '',
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

export function hydrateProfileWidget(ctx: HydrateWidgetContext): Record<string, any> {
  const {
    widget,
    merged,
    instanceConfig,
    instanceOverrides,
    genericTypeConfig,
    spec,
    blogLocale,
    blogAuthor,
  } = ctx

  const displayname = instanceOverrides?.displayname
    ?? instanceConfig?.displayname
    ?? genericTypeConfig?.displayname
    ?? merged.displayname
    ?? instanceOverrides?.author
    ?? instanceConfig?.author
    ?? genericTypeConfig?.author
    ?? merged.author
    ?? blogAuthor.displayname

  const aboutme = instanceOverrides?.aboutme
    ?? instanceConfig?.aboutme
    ?? genericTypeConfig?.aboutme
    ?? merged.aboutme
    ?? instanceOverrides?.snippet
    ?? instanceConfig?.snippet
    ?? genericTypeConfig?.snippet
    ?? merged.snippet
    ?? ''

  const location = instanceOverrides?.location
    ?? instanceConfig?.location
    ?? genericTypeConfig?.location
    ?? merged.location
    ?? ''

  const userUrl = instanceOverrides?.userUrl
    ?? instanceConfig?.userUrl
    ?? genericTypeConfig?.userUrl
    ?? merged.userUrl
    ?? instanceOverrides?.profileUrl
    ?? instanceConfig?.profileUrl
    ?? genericTypeConfig?.profileUrl
    ?? merged.profileUrl
    ?? blogAuthor.userUrl

  // Resolve authorPhoto: handle object or string avatar alias
  const rawPhoto = instanceOverrides?.authorPhoto
    ?? instanceConfig?.authorPhoto
    ?? genericTypeConfig?.authorPhoto
    ?? merged.authorPhoto
  const rawAvatarStr = instanceOverrides?.avatar
    ?? instanceConfig?.avatar
    ?? genericTypeConfig?.avatar
    ?? merged.avatar

  let authorPhoto: Record<string, any>
  if (rawPhoto && typeof rawPhoto === 'object') {
    const imgUrl = rawPhoto.image || rawPhoto.url || blogAuthor.authorPhoto.image
    authorPhoto = {
      image: imgUrl,
      url: imgUrl,
      alt: rawPhoto.alt || displayname,
      width: rawPhoto.width || 80,
      height: rawPhoto.height || 80,
    }
  }
  else if (typeof rawAvatarStr === 'string' && rawAvatarStr) {
    authorPhoto = {
      image: rawAvatarStr,
      url: rawAvatarStr,
      alt: displayname,
      width: 80,
      height: 80,
    }
  }
  else {
    authorPhoto = { ...blogAuthor.authorPhoto, alt: displayname }
  }

  const team = Boolean(merged.team ?? false)
  const showaboutme = merged.showaboutme !== false
  const showlocation = merged.showlocation !== false
  const hasgoogleprofile = merged.hasgoogleprofile
    ?? (userUrl.includes('blogger.com') || userUrl.includes('google.com'))

  const title = instanceOverrides?.title
    ?? instanceConfig?.title
    ?? widget.title
    ?? genericTypeConfig?.title
    ?? merged.title
    ?? spec.getWidgetDefaultTitle('Profile', blogLocale)

  const viewProfileMsg = merged.viewProfileMsg
    ?? spec.getTranslation('widgets.Profile.viewProfileMsg', blogLocale)
    ?? spec.getLocalizedMessage('widgets.Profile.viewProfileMsg', blogLocale)
    ?? 'View my complete profile'

  return {
    ...merged,
    title,
    displayname,
    aboutme,
    location,
    userUrl,
    authorPhoto,
    team,
    showaboutme,
    showlocation,
    hasgoogleprofile,
    viewProfileMsg,
  }
}

export function hydratePageListWidget(ctx: HydrateWidgetContext): Record<string, any> {
  const {
    widget,
    merged,
    instanceConfig,
    instanceOverrides,
    genericTypeConfig,
    templateSettings,
    spec,
    mapper,
    currentPath,
    blogLocale,
    normalizedPages,
  } = ctx

  const rawLinks = instanceOverrides?.links
    || instanceConfig?.links
    || templateSettings?.links
    || genericTypeConfig?.links
    || merged.links

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

  const title = instanceOverrides?.title
    || instanceConfig?.title
    || widget.title
    || genericTypeConfig?.title
    || merged.title
    || spec.getWidgetDefaultTitle('PageList', blogLocale)

  return {
    ...merged,
    title,
    links,
  }
}

export function hydrateLabelWidget(ctx: HydrateWidgetContext): Record<string, any> {
  const {
    widget,
    merged,
    instanceConfig,
    instanceOverrides,
    genericTypeConfig,
    spec,
    blogLocale,
    normalizedLabels,
  } = ctx

  const sorting = (merged.sorting || instanceOverrides?.sorting || 'ALPHA').toUpperCase()
  let labels = normalizedLabels
  if (sorting === 'FREQUENCY') {
    labels = [...normalizedLabels].sort((a: any, b: any) => (b.count ?? 0) - (a.count ?? 0) || a.name.localeCompare(b.name))
  }
  const showFreqNumbers = merged.showFreqNumbers ?? (instanceOverrides?.showFreqNumbers ?? false)
  const title = instanceOverrides?.title
    || instanceConfig?.title
    || widget.title
    || genericTypeConfig?.title
    || merged.title
    || spec.getWidgetDefaultTitle('Label', blogLocale)

  return {
    ...merged,
    title,
    labels,
    showFreqNumbers,
  }
}

export function hydrateHeaderWidget(ctx: HydrateWidgetContext): Record<string, any> {
  const {
    widget,
    merged,
    instanceConfig,
    instanceOverrides,
    genericTypeConfig,
    spec,
    blogLocale,
    headerData,
  } = ctx

  const title = instanceOverrides?.title
    || instanceConfig?.title
    || widget.title
    || genericTypeConfig?.title
    || headerData.title
    || spec.getWidgetDefaultTitle('Header', blogLocale)

  const description = instanceOverrides?.description
    || instanceConfig?.description
    || (widget.settings as any)?.description
    || genericTypeConfig?.description
    || headerData.description

  const url = instanceOverrides?.url
    || instanceConfig?.url
    || (widget.settings as any)?.url
    || genericTypeConfig?.url
    || headerData.url

  return {
    ...headerData,
    ...merged,
    title,
    description,
    url,
  }
}

export function hydrateBlogWidget(ctx: HydrateWidgetContext): Record<string, any> {
  const {
    widget,
    merged,
    spec,
    blogLocale,
    activePosts,
    blog1,
  } = ctx

  const title = merged.title || widget.title || spec.getWidgetDefaultTitle('Blog', blogLocale)
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

  return {
    ...blog1,
    ...merged,
    title,
    posts: activePosts,
    numPosts,
    allBylineItems: activeBylineList,
  }
}

export function hydrateFeaturedPostWidget(ctx: HydrateWidgetContext): Record<string, any> {
  const { merged, spec, blogLocale, normalizedPosts } = ctx

  if (normalizedPosts.length > 0) {
    const featured = normalizedPosts[0]!
    return deepMerge({
      title: spec.getWidgetDefaultTitle('FeaturedPost', blogLocale),
      postId: featured.id,
      postTitle: featured.title,
      snippet: featured.snippets.long,
      postUrl: featured.url,
    }, merged)
  }
  return merged
}

export function hydrateBlogArchiveWidget(ctx: HydrateWidgetContext): Record<string, any> {
  const { widgetId, merged, spec, mapper, blogLocale, blogTimeZone, normalizedPosts, context } = ctx

  if (normalizedPosts.length > 0 && !context.widgetData[widgetId]?.data) {
    const archiveHierarchy = buildArchiveHierarchy(normalizedPosts, mapper, {
      locale: blogLocale,
      timeZone: blogTimeZone,
      widgetId,
    })
    return deepMerge({
      title: spec.getWidgetDefaultTitle('BlogArchive', blogLocale),
      style: 'HIERARCHY',
      data: archiveHierarchy,
    }, merged)
  }
  return merged
}

export function hydrateAttributionWidget(ctx: HydrateWidgetContext): Record<string, any> {
  const { merged, spec, blogLocale, normalizedPosts, context, headerData } = ctx
  const blogTitle = (context.blog as any)?.title || headerData?.title || ''
  const attributionDefaults = buildAttributionData(blogTitle, spec, blogLocale, {
    posts: normalizedPosts,
  })
  const cleanMerged = { ...merged }
  if (cleanMerged.copyright === null || cleanMerged.copyright === undefined) {
    delete cleanMerged.copyright
  }
  return deepMerge(attributionDefaults, cleanMerged)
}

export function hydrateContactFormWidget(ctx: HydrateWidgetContext): Record<string, any> {
  const { merged, spec, blogLocale } = ctx
  const contactDefaults = buildContactFormData(spec, blogLocale)
  return deepMerge(contactDefaults, merged)
}

export function hydratePopularPostsWidget(ctx: HydrateWidgetContext): Record<string, any> {
  const { widgetId, merged, spec, blogLocale, normalizedPosts, context } = ctx
  if (normalizedPosts.length > 0 && !context.widgetData[widgetId]?.posts) {
    const canonicalLimit = (spec.getWidgetSettings('PopularPosts')?.canonical?.numItemsToShow?.default as number) ?? 10
    const limit = merged.numPosts ?? merged.numItemsToShow ?? canonicalLimit
    const popularData = buildPopularPostsData(normalizedPosts, spec, blogLocale, limit, merged.postDisplay)
    return deepMerge(popularData, merged)
  }
  return merged
}

export function hydrateListWidget(ctx: HydrateWidgetContext): Record<string, any> {
  const {
    widget,
    type,
    merged,
    instanceConfig,
    instanceOverrides,
    genericTypeConfig,
    templateSettings,
    spec,
    blogLocale,
  } = ctx

  const title = instanceOverrides?.title
    || instanceConfig?.title
    || widget.title
    || genericTypeConfig?.title
    || merged.title
    || spec.getWidgetDefaultTitle(type, blogLocale)
    || type

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
    return { ...merged, title, links }
  }
  return { ...merged, title, links: [] }
}

export function hydrateContentWidget(ctx: HydrateWidgetContext): Record<string, any> {
  const {
    widget,
    type,
    merged,
    instanceConfig,
    instanceOverrides,
    genericTypeConfig,
    templateSettings,
    spec,
    blogLocale,
  } = ctx

  const title = instanceOverrides?.title
    || instanceConfig?.title
    || widget.title
    || genericTypeConfig?.title
    || merged.title
    || spec.getWidgetDefaultTitle(type, blogLocale)
    || type

  const content = instanceOverrides?.content
    ?? instanceConfig?.content
    ?? templateSettings?.content
    ?? genericTypeConfig?.content
    ?? merged.content
    ?? ''

  return {
    ...merged,
    title,
    content,
  }
}

export function hydrateImageWidget(ctx: HydrateWidgetContext): Record<string, any> {
  const {
    widget,
    type,
    merged,
    instanceConfig,
    instanceOverrides,
    genericTypeConfig,
    templateSettings,
    spec,
    blogLocale,
  } = ctx

  const title = instanceOverrides?.title
    || instanceConfig?.title
    || widget.title
    || genericTypeConfig?.title
    || merged.title
    || spec.getWidgetDefaultTitle(type, blogLocale)
    || type

  const sourceUrl = instanceOverrides?.sourceUrl
    ?? instanceConfig?.sourceUrl
    ?? templateSettings?.sourceUrl
    ?? genericTypeConfig?.sourceUrl
    ?? merged.sourceUrl
    ?? ''

  const caption = instanceOverrides?.caption
    ?? instanceConfig?.caption
    ?? templateSettings?.caption
    ?? genericTypeConfig?.caption
    ?? merged.caption
    ?? ''

  const alt = instanceOverrides?.alt
    ?? instanceConfig?.alt
    ?? templateSettings?.alt
    ?? genericTypeConfig?.alt
    ?? merged.alt
    ?? caption
    ?? title

  const linkUrl = instanceOverrides?.linkUrl
    ?? instanceConfig?.linkUrl
    ?? templateSettings?.linkUrl
    ?? genericTypeConfig?.linkUrl
    ?? merged.linkUrl
    ?? ''

  return {
    ...merged,
    title,
    sourceUrl,
    caption,
    alt,
    linkUrl,
  }
}

export function hydrateGenericWidget(ctx: HydrateWidgetContext): Record<string, any> {
  const {
    widget,
    type,
    merged,
    spec,
    blogLocale,
  } = ctx

  const title = merged.title || widget.title || spec.getWidgetDefaultTitle(type, blogLocale) || type
  return { ...merged, title }
}

export function dispatchWidgetHydration(ctx: HydrateWidgetContext): Record<string, any> {
  switch (ctx.type) {
    case 'Profile':
      return hydrateProfileWidget(ctx)
    case 'PageList':
      return hydratePageListWidget(ctx)
    case 'Label':
      return hydrateLabelWidget(ctx)
    case 'Header':
      return hydrateHeaderWidget(ctx)
    case 'Blog':
      return hydrateBlogWidget(ctx)
    case 'FeaturedPost':
      return hydrateFeaturedPostWidget(ctx)
    case 'BlogArchive':
      return hydrateBlogArchiveWidget(ctx)
    case 'Attribution':
      return hydrateAttributionWidget(ctx)
    case 'ContactForm':
      return hydrateContactFormWidget(ctx)
    case 'PopularPosts':
      return hydratePopularPostsWidget(ctx)
    case 'LinkList':
    case 'TextList':
      return hydrateListWidget(ctx)
    case 'HTML':
    case 'Text':
      return hydrateContentWidget(ctx)
    case 'Image':
      return hydrateImageWidget(ctx)
    default:
      return hydrateGenericWidget(ctx)
  }
}
