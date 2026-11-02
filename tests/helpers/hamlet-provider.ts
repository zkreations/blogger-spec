import type { BloggerViewId } from '../../src/types.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveBloggerContext } from '../../src/context/resolver.js'
import { createStaticFeedFetch } from '../../src/context/static-feed-fetch.js'
import { getWorkspacePaths } from '../../src/paths.js'

export const HAMLET_BLOG_ID = '5408826600056783247'
export const HAMLET_BASE_URL = 'https://hamlet.zkreations.com'

export interface HamletViewRoute {
  readonly viewId: BloggerViewId
  readonly targetUrl: string
  readonly overrides?: Record<string, any>
}

export const HAMLET_ROUTES: Record<BloggerViewId, HamletViewRoute> = {
  homepage: {
    viewId: 'homepage',
    targetUrl: 'https://hamlet.zkreations.com/',
  },
  post: {
    viewId: 'post',
    targetUrl: 'https://hamlet.zkreations.com/2023/04/the-importance-of-environmental-care.html',
    overrides: { view: { saa: '85391' } },
  },
  static_page: {
    viewId: 'static_page',
    targetUrl: 'https://hamlet.zkreations.com/p/typography.html',
  },
  label_search: {
    viewId: 'label_search',
    targetUrl: 'https://hamlet.zkreations.com/search/label/biodiversity',
    overrides: { view: { search: { label: 'biodiversity' } } },
  },
  archive_yearly: {
    viewId: 'archive_yearly',
    targetUrl: 'https://hamlet.zkreations.com/2023/',
  },
  archive_monthly: {
    viewId: 'archive_monthly',
    targetUrl: 'https://hamlet.zkreations.com/2023/11/',
  },
  archive_weekly_daily: {
    viewId: 'archive_weekly_daily',
    targetUrl: 'https://hamlet.zkreations.com/2023_11_17_archive.html',
  },
  post_listing: {
    viewId: 'post_listing',
    targetUrl: 'https://hamlet.zkreations.com/search?updated-max=2025-04-01T18:11:27.102-07:00',
  },
  search_query: {
    viewId: 'search_query',
    targetUrl: 'https://hamlet.zkreations.com/search?q=The',
    overrides: { view: { search: { query: 'The' } } },
  },
  error_404: {
    viewId: 'error_404',
    targetUrl: 'https://hamlet.zkreations.com/404',
  },
  preview: {
    viewId: 'preview',
    targetUrl: 'https://hamlet.zkreations.com/2023/04/the-importance-of-environmental-care.html',
  },
  layout_mode: {
    viewId: 'layout_mode',
    targetUrl: 'https://hamlet.zkreations.com/',
  },
}

let cachedPostsFeed: any
let cachedPagesFeed: any
let cachedCommentsFeed: any

function getHamletFeeds() {
  if (!cachedPostsFeed) {
    const fixturesDir = getWorkspacePaths().fixtures
    cachedPostsFeed = JSON.parse(readFileSync(join(fixturesDir, 'feeds', 'hamlet-posts-sample.json'), 'utf8'))
    cachedPagesFeed = JSON.parse(readFileSync(join(fixturesDir, 'feeds', 'hamlet-pages-sample.json'), 'utf8'))
    cachedCommentsFeed = JSON.parse(readFileSync(join(fixturesDir, 'feeds', 'hamlet-comments-sample.json'), 'utf8'))
  }
  return { postsFeed: cachedPostsFeed, pagesFeed: cachedPagesFeed, commentsFeed: cachedCommentsFeed }
}

export function createLocalHamletFeedFetch(): typeof fetch {
  const { postsFeed, pagesFeed, commentsFeed } = getHamletFeeds()
  return createStaticFeedFetch({
    posts: postsFeed,
    pages: pagesFeed,
    comments: commentsFeed,
  })
}

export async function resolveHamletContext(
  viewId: BloggerViewId,
  extraOverrides?: Record<string, any>,
): Promise<Record<string, any>> {
  const route = HAMLET_ROUTES[viewId] || HAMLET_ROUTES.homepage
  const fetchFn = createLocalHamletFeedFetch()

  const baseOverrides = route.overrides || {}
  const mergedOverrides = extraOverrides ? { ...baseOverrides, ...extraOverrides } : baseOverrides

  return resolveBloggerContext({
    blogId: HAMLET_BLOG_ID,
    view: viewId,
    targetUrl: route.targetUrl,
    urlMode: 'remote',
    fetch: fetchFn,
    config: {
      blog: {
        locale: 'en',
      },
    },
    overrides: Object.keys(mergedOverrides).length > 0 ? mergedOverrides : undefined,
  })
}
