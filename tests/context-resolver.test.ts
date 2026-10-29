import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { BloggerFeedClient } from '../src/context/client.js'
import { resolveBloggerContext } from '../src/context/resolver.js'
import { getWorkspacePaths } from '../src/paths.js'

describe('context resolver suite with 3-tier precedence', () => {
  const postsFeedJson = JSON.parse(
    readFileSync(join(getWorkspacePaths().fixtures, 'feeds/hamlet-posts-sample.json'), 'utf8'),
  )
  const pagesFeedJson = JSON.parse(
    readFileSync(join(getWorkspacePaths().fixtures, 'feeds/hamlet-pages-sample.json'), 'utf8'),
  )

  function createMockFetch(postsData: any = postsFeedJson, pagesData: any = pagesFeedJson) {
    return vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/posts/default')) {
        return {
          ok: true,
          json: async () => postsData,
        }
      }
      if (url.includes('/pages/default')) {
        return {
          ok: true,
          json: async () => pagesData,
        }
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({}),
      }
    })
  }

  describe('offline mode', () => {
    it('returns canonical mock context without network calls', async () => {
      const mockFetch = vi.fn()
      const ctx = await resolveBloggerContext({
        offline: true,
        fetch: mockFetch,
      })

      expect(mockFetch).not.toHaveBeenCalled()
      expect(ctx.blog.title).toBeDefined()
      expect(ctx.view.isHomepage).toBe(true)
    })

    it('applies overrides cleanly in offline mode', async () => {
      const ctx = await resolveBloggerContext({
        offline: true,
        overrides: {
          blog: { title: 'Offline Custom Blog' },
        },
      })

      expect(ctx.blog.title).toBe('Offline Custom Blog')
    })
  })

  describe('feed resolution with mock fetch', () => {
    it('populates blog metadata, posts, pages, and labels from feed', async () => {
      const mockFetch = createMockFetch()
      const ctx = await resolveBloggerContext({
        fetch: mockFetch,
        urlMode: 'relative',
      })

      expect(mockFetch).toHaveBeenCalled()
      expect(ctx.blog.title).toBe('Hamlet')
      expect(ctx.blog.url).toBe('/')
      expect(ctx.blog.blogId).toBe('5408826600056783247')

      const blogPosts = ctx.widgetData.Blog1.posts
      expect(blogPosts.length).toBe(5)
      expect(blogPosts[0].title).toBe('The Importance of Environmental Care')
      expect(blogPosts[0].url).toBe('/2023/04/the-importance-of-environmental-care.html')

      const pageLinks = ctx.widgetData.PageList1.links
      expect(pageLinks.length).toBe(2)
      expect(pageLinks[0].title).toBe('Typography')

      const labels = ctx.widgetData.Label1.labels
      expect(labels.length).toBeGreaterThan(0)
      expect(labels[0].url).toContain('/search/label/')

      // Canonical messages from mock must still be preserved
      expect(ctx.messages.archive).toBeDefined()
    })

    it('resolves post view with single active post', async () => {
      const mockFetch = createMockFetch()
      const ctx = await resolveBloggerContext({
        view: 'post',
        fetch: mockFetch,
      })

      expect(ctx.view.isPost).toBe(true)
      expect(ctx.widgetData.Blog1.posts.length).toBe(1)
      expect(ctx.view.postId).toBe('8389032230243957219')
      expect(ctx.view.title).toBe('The Importance of Environmental Care')
    })
  })

  describe('3-tier precedence (overrides > api > mock)', () => {
    it('lets overrides take precedence over feed and mock data', async () => {
      const mockFetch = createMockFetch()
      const ctx = await resolveBloggerContext({
        fetch: mockFetch,
        overrides: {
          blog: { title: 'Overridden Blog Title' },
          widgetData: {
            Blog1: {
              posts: [{ id: '999', title: 'Custom Injected Post' }],
            },
          },
        },
      })

      expect(ctx.blog.title).toBe('Overridden Blog Title')
      expect(ctx.widgetData.Blog1.posts.length).toBe(1)
      expect(ctx.widgetData.Blog1.posts[0].title).toBe('Custom Injected Post')
    })
  })

  describe('graceful degradation', () => {
    it('falls back to mock context on network 500 error without throwing', async () => {
      const failingFetch = vi.fn().mockImplementation(async () => {
        return {
          ok: false,
          status: 500,
          json: async () => ({}),
        }
      })

      const ctx = await resolveBloggerContext({
        fetch: failingFetch,
      })

      expect(ctx).toBeDefined()
      expect(ctx.blog.title).toBeDefined()
      expect(ctx.widgetData.Blog1.posts).toBeDefined()
    })

    it('falls back to mock context on network exception without throwing', async () => {
      const throwingFetch = vi.fn().mockImplementation(async () => {
        throw new Error('Connection refused')
      })

      const ctx = await resolveBloggerContext({
        fetch: throwingFetch,
      })

      expect(ctx).toBeDefined()
      expect(ctx.blog.title).toBeDefined()
    })
  })

  describe('feed client caching', () => {
    it('uses cached responses on successive requests within ttl', async () => {
      const mockFetch = createMockFetch()
      const client = new BloggerFeedClient({ fetchFn: mockFetch, defaultTtlMs: 5000 })

      const res1 = await client.fetchPosts('123')
      const res2 = await client.fetchPosts('123')

      expect(res1).toBeDefined()
      expect(res2).toBeDefined()
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})
