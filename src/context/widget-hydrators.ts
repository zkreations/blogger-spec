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
import { instantiateWidgetFromCatalog } from './widget-schema-engine.js'

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

export function hydrateProfileWidget(ctx: HydrateWidgetContext, baseWidget?: Record<string, any>): Record<string, any> {
  const base = baseWidget || instantiateWidgetFromCatalog({
    widget: ctx.widget,
    type: ctx.type,
    merged: ctx.merged,
    templateSettings: ctx.templateSettings,
    instanceConfig: ctx.instanceConfig,
    instanceOverrides: ctx.instanceOverrides,
    genericTypeConfig: ctx.genericTypeConfig,
    spec: ctx.spec,
    blogLocale: ctx.blogLocale,
  })

  const displayname = base.displayname || ctx.blogAuthor.displayname
  const userUrl = base.userUrl || ctx.blogAuthor.userUrl

  let authorPhoto = base.authorPhoto
  if (!authorPhoto || typeof authorPhoto !== 'object' || !authorPhoto.image) {
    authorPhoto = { ...ctx.blogAuthor.authorPhoto, alt: displayname }
  }
  else {
    const imgUrl = authorPhoto.image || authorPhoto.url || ctx.blogAuthor.authorPhoto.image
    authorPhoto = {
      image: imgUrl,
      url: imgUrl,
      alt: authorPhoto.alt || displayname,
      width: authorPhoto.width || 80,
      height: authorPhoto.height || 80,
    }
  }

  const aboutme = base.aboutme ?? ''
  const location = base.location ?? ''
  const showaboutme = base.showaboutme !== false
  const showlocation = base.showlocation !== false
  const team = Boolean(base.team ?? false)
  const hasgoogleprofile = base.hasgoogleprofile
    ?? (userUrl.includes('blogger.com') || userUrl.includes('google.com'))

  return {
    ...base,
    displayname,
    userUrl,
    authorPhoto,
    aboutme,
    location,
    showaboutme,
    showlocation,
    team,
    hasgoogleprofile,
  }
}

export function hydratePageListWidget(ctx: HydrateWidgetContext, baseWidget?: Record<string, any>): Record<string, any> {
  const base = baseWidget || instantiateWidgetFromCatalog({
    widget: ctx.widget,
    type: ctx.type,
    merged: ctx.merged,
    templateSettings: ctx.templateSettings,
    instanceConfig: ctx.instanceConfig,
    instanceOverrides: ctx.instanceOverrides,
    genericTypeConfig: ctx.genericTypeConfig,
    spec: ctx.spec,
    blogLocale: ctx.blogLocale,
  })

  const {
    instanceConfig,
    instanceOverrides,
    templateSettings,
    genericTypeConfig,
    mapper,
    currentPath,
    normalizedPages,
  } = ctx

  const rawLinks = instanceOverrides?.links
    || templateSettings?.links
    || instanceConfig?.links
    || genericTypeConfig?.links
    || base.links

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

  const explicitHomeTitle = instanceOverrides?.homeTitle || templateSettings?.homeTitle || instanceConfig?.homeTitle
  const hasOverridingLinks = Array.isArray(instanceOverrides?.links)
    || (Array.isArray(templateSettings?.links) && !templateSettings?.homeTitle)
  if (explicitHomeTitle && links.length > 0 && links[0] && !hasOverridingLinks) {
    if (links[0].href === '/' || links[0].href === mapper.mapUrl('/')) {
      links[0] = { ...links[0], title: String(explicitHomeTitle) }
    }
  }

  return {
    ...base,
    links,
  }
}

export function hydrateLabelWidget(ctx: HydrateWidgetContext, baseWidget?: Record<string, any>): Record<string, any> {
  const base = baseWidget || instantiateWidgetFromCatalog({
    widget: ctx.widget,
    type: ctx.type,
    merged: ctx.merged,
    templateSettings: ctx.templateSettings,
    instanceConfig: ctx.instanceConfig,
    instanceOverrides: ctx.instanceOverrides,
    genericTypeConfig: ctx.genericTypeConfig,
    spec: ctx.spec,
    blogLocale: ctx.blogLocale,
  })

  const sorting = (base.sorting || ctx.instanceOverrides?.sorting || 'ALPHA').toUpperCase()
  let labels = ctx.normalizedLabels
  if (sorting === 'FREQUENCY') {
    labels = [...ctx.normalizedLabels].sort((a: any, b: any) => (b.count ?? 0) - (a.count ?? 0) || a.name.localeCompare(b.name))
  }
  const showFreqNumbers = base.showFreqNumbers ?? (ctx.instanceOverrides?.showFreqNumbers ?? false)

  return {
    ...base,
    labels,
    showFreqNumbers,
  }
}

export function hydrateHeaderWidget(ctx: HydrateWidgetContext, baseWidget?: Record<string, any>): Record<string, any> {
  const base = baseWidget || instantiateWidgetFromCatalog({
    widget: ctx.widget,
    type: ctx.type,
    merged: ctx.merged,
    templateSettings: ctx.templateSettings,
    instanceConfig: ctx.instanceConfig,
    instanceOverrides: ctx.instanceOverrides,
    genericTypeConfig: ctx.genericTypeConfig,
    spec: ctx.spec,
    blogLocale: ctx.blogLocale,
  })

  const { instanceConfig, instanceOverrides, genericTypeConfig, headerData, widget } = ctx

  const title = instanceOverrides?.title
    || (widget.settings as any)?.title
    || widget.title
    || instanceConfig?.title
    || genericTypeConfig?.title
    || headerData.title
    || base.title
    || ctx.spec.getWidgetDefaultTitle('Header', ctx.blogLocale)

  const description = instanceOverrides?.description
    || (widget.settings as any)?.description
    || instanceConfig?.description
    || genericTypeConfig?.description
    || headerData.description
    || base.description

  const url = instanceOverrides?.url
    || (widget.settings as any)?.url
    || instanceConfig?.url
    || genericTypeConfig?.url
    || headerData.url
    || base.url

  return {
    ...headerData,
    ...base,
    title,
    description,
    url,
  }
}

export function hydrateBlogWidget(ctx: HydrateWidgetContext, baseWidget?: Record<string, any>): Record<string, any> {
  const base = baseWidget || instantiateWidgetFromCatalog({
    widget: ctx.widget,
    type: ctx.type,
    merged: ctx.merged,
    templateSettings: ctx.templateSettings,
    instanceConfig: ctx.instanceConfig,
    instanceOverrides: ctx.instanceOverrides,
    genericTypeConfig: ctx.genericTypeConfig,
    spec: ctx.spec,
    blogLocale: ctx.blogLocale,
  })

  const { spec, blogLocale, activePosts, blog1 } = ctx

  const baseBylineItems: Array<{ name: string, label: string }> = Array.isArray(base.allBylineItems) && base.allBylineItems.length > 0
    ? base.allBylineItems
    : (Array.isArray(blog1.allBylineItems) && blog1.allBylineItems.length > 0
        ? blog1.allBylineItems
        : getDefaultBylineItems(spec, blogLocale))

  const settingMap: Record<string, boolean | undefined> = {
    author: base.showAuthor !== false,
    timestamp: base.showTimestamp !== false,
    labels: base.showLabels !== false,
    location: base.showLocation !== false,
    comments: base.showCommentLink !== false,
    share: base.showShareButtons !== false,
    icons: base.showAuthorProfile === true,
  }

  const labelOverrides: Record<string, string | undefined> = {
    author: base.authorLabel,
    comments: base.commentLabel,
    labels: base.postLabelsLabel,
    location: base.postLocationLabel,
    timestamp: base.timestampLabel,
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

  const numPosts = base.numPosts !== undefined
    ? base.numPosts
    : (blog1.numPosts !== undefined ? blog1.numPosts : activePosts.length)

  return {
    ...blog1,
    ...base,
    posts: activePosts,
    numPosts,
    allBylineItems: activeBylineList,
  }
}

export function hydrateFeaturedPostWidget(ctx: HydrateWidgetContext, baseWidget?: Record<string, any>): Record<string, any> {
  const base = baseWidget || instantiateWidgetFromCatalog({
    widget: ctx.widget,
    type: ctx.type,
    merged: ctx.merged,
    templateSettings: ctx.templateSettings,
    instanceConfig: ctx.instanceConfig,
    instanceOverrides: ctx.instanceOverrides,
    genericTypeConfig: ctx.genericTypeConfig,
    spec: ctx.spec,
    blogLocale: ctx.blogLocale,
  })

  if (ctx.normalizedPosts.length > 0) {
    const targetPostId = ctx.instanceOverrides?.postId
      ?? ctx.templateSettings?.postId
      ?? ctx.instanceConfig?.postId
      ?? ctx.genericTypeConfig?.postId
      ?? base.postId

    const found = targetPostId && targetPostId !== 0 && targetPostId !== '0'
      ? ctx.normalizedPosts.find(p => String(p.id) === String(targetPostId))
      : undefined

    const featured = found || ctx.normalizedPosts[0]!

    const effectivePostDisplay = {
      showSnippet: true,
      showTitle: true,
      showAuthor: true,
      showDate: true,
      showFeaturedImage: true,
      ...base.postDisplay,
    }

    const featuredPostModel = {
      ...featured,
      postDisplay: { ...effectivePostDisplay },
    }

    return deepMerge(base, {
      title: base.title || ctx.spec.getWidgetDefaultTitle('FeaturedPost', ctx.blogLocale),
      postId: featured.id,
      postTitle: featured.title,
      snippet: featured.snippets.long,
      postUrl: featured.url,
      postDisplay: effectivePostDisplay,
      posts: [featuredPostModel],
    })
  }
  return base
}

export function hydrateBlogArchiveWidget(ctx: HydrateWidgetContext, baseWidget?: Record<string, any>): Record<string, any> {
  const base = baseWidget || instantiateWidgetFromCatalog({
    widget: ctx.widget,
    type: ctx.type,
    merged: ctx.merged,
    templateSettings: ctx.templateSettings,
    instanceConfig: ctx.instanceConfig,
    instanceOverrides: ctx.instanceOverrides,
    genericTypeConfig: ctx.genericTypeConfig,
    spec: ctx.spec,
    blogLocale: ctx.blogLocale,
  })

  const { widgetId, spec, mapper, blogLocale, blogTimeZone, normalizedPosts, context } = ctx
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
    }, base)
  }
  return base
}

export function hydrateAttributionWidget(ctx: HydrateWidgetContext, baseWidget?: Record<string, any>): Record<string, any> {
  const base = baseWidget || instantiateWidgetFromCatalog({
    widget: ctx.widget,
    type: ctx.type,
    merged: ctx.merged,
    templateSettings: ctx.templateSettings,
    instanceConfig: ctx.instanceConfig,
    instanceOverrides: ctx.instanceOverrides,
    genericTypeConfig: ctx.genericTypeConfig,
    spec: ctx.spec,
    blogLocale: ctx.blogLocale,
  })

  const { spec, blogLocale, normalizedPosts, context, headerData } = ctx
  const blogTitle = (context.blog as any)?.title || headerData?.title || ''
  const attributionDefaults = buildAttributionData(blogTitle, spec, blogLocale, {
    posts: normalizedPosts,
  })
  const cleanBase = { ...base }
  if (cleanBase.copyright === null || cleanBase.copyright === undefined) {
    delete cleanBase.copyright
  }
  return deepMerge(attributionDefaults, cleanBase)
}

export function hydrateContactFormWidget(ctx: HydrateWidgetContext, baseWidget?: Record<string, any>): Record<string, any> {
  const base = baseWidget || instantiateWidgetFromCatalog({
    widget: ctx.widget,
    type: ctx.type,
    merged: ctx.merged,
    templateSettings: ctx.templateSettings,
    instanceConfig: ctx.instanceConfig,
    instanceOverrides: ctx.instanceOverrides,
    genericTypeConfig: ctx.genericTypeConfig,
    spec: ctx.spec,
    blogLocale: ctx.blogLocale,
  })

  const contactDefaults = buildContactFormData(ctx.spec, ctx.blogLocale)
  return deepMerge(contactDefaults, base)
}

export function hydratePopularPostsWidget(ctx: HydrateWidgetContext, baseWidget?: Record<string, any>): Record<string, any> {
  const base = baseWidget || instantiateWidgetFromCatalog({
    widget: ctx.widget,
    type: ctx.type,
    merged: ctx.merged,
    templateSettings: ctx.templateSettings,
    instanceConfig: ctx.instanceConfig,
    instanceOverrides: ctx.instanceOverrides,
    genericTypeConfig: ctx.genericTypeConfig,
    spec: ctx.spec,
    blogLocale: ctx.blogLocale,
  })

  const { widgetId, spec, blogLocale, normalizedPosts, context } = ctx
  if (normalizedPosts.length > 0 && !context.widgetData[widgetId]?.posts) {
    const canonicalLimit = (spec.getWidgetSettings('PopularPosts')?.canonical?.numItemsToShow?.default as number) ?? 10
    const limit = base.numPosts ?? base.numItemsToShow ?? canonicalLimit
    const popularData = buildPopularPostsData(normalizedPosts, spec, blogLocale, limit, base.postDisplay)
    return deepMerge(popularData, base)
  }
  return base
}

export function hydrateListWidget(ctx: HydrateWidgetContext, baseWidget?: Record<string, any>): Record<string, any> {
  const base = baseWidget || instantiateWidgetFromCatalog({
    widget: ctx.widget,
    type: ctx.type,
    merged: ctx.merged,
    templateSettings: ctx.templateSettings,
    instanceConfig: ctx.instanceConfig,
    instanceOverrides: ctx.instanceOverrides,
    genericTypeConfig: ctx.genericTypeConfig,
    spec: ctx.spec,
    blogLocale: ctx.blogLocale,
  })

  const rawLinks = ctx.instanceOverrides?.links
    || ctx.templateSettings?.links
    || ctx.instanceConfig?.links
    || ctx.genericTypeConfig?.links
    || base.links
    || []

  if (Array.isArray(rawLinks)) {
    let links = rawLinks
      .map((l: any) => normalizeLinkItem(l))
      .map((l: any) => ({ name: l.title, target: l.href, ...l }))

    if (base.sorting === 'alphabetical' || base.sorting === 'alpha') {
      links = [...links].sort((a, b) => a.name.localeCompare(b.name))
    }
    else if (base.sorting === 'reverse_alphabetical' || base.sorting === 'reverse-alpha') {
      links = [...links].sort((a, b) => b.name.localeCompare(a.name))
    }
    const explicitShownum = ctx.instanceOverrides?.shownum ?? ctx.templateSettings?.shownum ?? ctx.instanceConfig?.shownum
    if (typeof explicitShownum === 'number' && explicitShownum > 0) {
      links = links.slice(0, explicitShownum)
    }
    return { ...base, links }
  }
  return { ...base, links: [] }
}

export function hydrateContentWidget(ctx: HydrateWidgetContext, baseWidget?: Record<string, any>): Record<string, any> {
  return baseWidget || instantiateWidgetFromCatalog({
    widget: ctx.widget,
    type: ctx.type,
    merged: ctx.merged,
    templateSettings: ctx.templateSettings,
    instanceConfig: ctx.instanceConfig,
    instanceOverrides: ctx.instanceOverrides,
    genericTypeConfig: ctx.genericTypeConfig,
    spec: ctx.spec,
    blogLocale: ctx.blogLocale,
  })
}

export function hydrateImageWidget(ctx: HydrateWidgetContext, baseWidget?: Record<string, any>): Record<string, any> {
  const base = baseWidget || instantiateWidgetFromCatalog({
    widget: ctx.widget,
    type: ctx.type,
    merged: ctx.merged,
    templateSettings: ctx.templateSettings,
    instanceConfig: ctx.instanceConfig,
    instanceOverrides: ctx.instanceOverrides,
    genericTypeConfig: ctx.genericTypeConfig,
    spec: ctx.spec,
    blogLocale: ctx.blogLocale,
  })

  const alt = ctx.instanceOverrides?.alt
    ?? ctx.templateSettings?.alt
    ?? ctx.instanceConfig?.alt
    ?? ctx.genericTypeConfig?.alt
    ?? base.alt
    ?? base.caption
    ?? base.title

  return {
    ...base,
    alt,
  }
}

export function hydrateGenericWidget(ctx: HydrateWidgetContext, baseWidget?: Record<string, any>): Record<string, any> {
  return baseWidget || instantiateWidgetFromCatalog({
    widget: ctx.widget,
    type: ctx.type,
    merged: ctx.merged,
    templateSettings: ctx.templateSettings,
    instanceConfig: ctx.instanceConfig,
    instanceOverrides: ctx.instanceOverrides,
    genericTypeConfig: ctx.genericTypeConfig,
    spec: ctx.spec,
    blogLocale: ctx.blogLocale,
  })
}

export function dispatchWidgetHydration(ctx: HydrateWidgetContext): Record<string, any> {
  const base = instantiateWidgetFromCatalog({
    widget: ctx.widget,
    type: ctx.type,
    merged: ctx.merged,
    templateSettings: ctx.templateSettings,
    instanceConfig: ctx.instanceConfig,
    instanceOverrides: ctx.instanceOverrides,
    genericTypeConfig: ctx.genericTypeConfig,
    spec: ctx.spec,
    blogLocale: ctx.blogLocale,
  })

  switch (ctx.type) {
    case 'Profile':
      return hydrateProfileWidget(ctx, base)
    case 'PageList':
      return hydratePageListWidget(ctx, base)
    case 'Label':
      return hydrateLabelWidget(ctx, base)
    case 'Header':
      return hydrateHeaderWidget(ctx, base)
    case 'Blog':
      return hydrateBlogWidget(ctx, base)
    case 'FeaturedPost':
      return hydrateFeaturedPostWidget(ctx, base)
    case 'BlogArchive':
      return hydrateBlogArchiveWidget(ctx, base)
    case 'Attribution':
      return hydrateAttributionWidget(ctx, base)
    case 'ContactForm':
      return hydrateContactFormWidget(ctx, base)
    case 'PopularPosts':
      return hydratePopularPostsWidget(ctx, base)
    case 'LinkList':
    case 'TextList':
      return hydrateListWidget(ctx, base)
    case 'HTML':
    case 'Text':
      return hydrateContentWidget(ctx, base)
    case 'Image':
      return hydrateImageWidget(ctx, base)
    default:
      // Remaining 16 widget types (Stats, Followers, BlogSearch, Translate, etc.) are pure schema!
      return base
  }
}
