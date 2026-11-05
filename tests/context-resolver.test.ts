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

  const blogId = '5408826600056783247'

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

  describe('blogId requirement in live/online mode', () => {
    it('throws when blogId is missing and not offline', async () => {
      const mockFetch = vi.fn()
      await expect(resolveBloggerContext({ fetch: mockFetch })).rejects.toThrow('blogId is required to resolve Blogger context')
    })

    it('sets cookieChoices when configured', async () => {
      const ctx = await resolveBloggerContext({
        offline: true,
        cookieChoices: true,
      })
      expect(ctx.blog.cookieChoices).toBe(true)
    })
  })

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
        blogId,
        fetch: mockFetch,
        urlMode: 'relative',
      })

      expect(mockFetch).toHaveBeenCalled()
      expect(ctx.blog.title).toBe('Hamlet')
      expect(ctx.blog.url).toBe('/')
      expect(ctx.blog.blogId).toBe('5408826600056783247')

      const blogPosts = ctx.widgetData.Blog1.posts
      expect(blogPosts.length).toBe(9)
      expect(blogPosts[0].title).toBe('The Importance of Environmental Care')
      expect(blogPosts[0].url).toBe('/2023/04/the-importance-of-environmental-care.html')

      const pageLinks = ctx.widgetData.PageList1.links
      expect(pageLinks.length).toBe(2)
      expect(pageLinks[0].title).toBe('Typography')

      const labels = ctx.widgetData.Label1.labels
      expect(labels.length).toBeGreaterThan(0)
      expect(labels[0].url).toContain('/search/label/')

      // Dynamically populated BlogArchive and PopularPosts
      expect(ctx.widgetData.BlogArchive1).toBeDefined()
      expect(ctx.widgetData.BlogArchive1.data.length).toBeGreaterThan(0)
      expect(ctx.widgetData.PopularPosts1).toBeDefined()
      expect(ctx.widgetData.PopularPosts1.posts.length).toBeGreaterThan(0)
      expect(ctx.widgetData.PopularPosts1.postDisplay.showFeaturedImage).toBe(true)

      // Canonical messages from mock must still be preserved
      expect(ctx.messages.archive).toBeDefined()
    })

    it('resolves post view with single active post', async () => {
      const mockFetch = createMockFetch()
      const ctx = await resolveBloggerContext({
        view: 'post',
        blogId,
        fetch: mockFetch,
      })

      expect(ctx.view.isPost).toBe(true)
      expect(ctx.widgetData.Blog1.posts.length).toBe(1)
      expect(ctx.view.postId).toBe(Number.parseInt('8389032230243957219', 10))
      expect(ctx.view.title).toBe('The Importance of Environmental Care')
    })
  })

  describe('3-tier precedence (overrides > api > mock)', () => {
    it('lets overrides take precedence over feed and mock data', async () => {
      const mockFetch = createMockFetch()
      const ctx = await resolveBloggerContext({
        blogId,
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
        blogId,
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
        blogId,
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

    it('honors custom apiBaseUrl for local proxying or tests', async () => {
      const mockFetch = createMockFetch()
      const client = new BloggerFeedClient({
        fetchFn: mockFetch,
        apiBaseUrl: 'http://localhost:3000/mock-feeds',
      })

      await client.fetchPosts('123')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:3000/mock-feeds/123/posts/default?alt=json'),
        expect.any(Object),
      )
    })
  })

  describe('url parameter filtering and pagination resolution', () => {
    it('filters active posts and computes canonical pagination URLs in remote mode', async () => {
      const mockFetch = createMockFetch()
      const ctx = await resolveBloggerContext({
        view: 'post_listing',
        urlMode: 'remote',
        blogId,
        fetch: mockFetch,
        overrides: {
          view: {
            url: 'https://hamlet.zkreations.com/search?updated-max=2025-04-01T18:11:27.102-07:00&max-results=3&by-date=false',
          },
        },
      })

      // Title on post_listing falls back to blogMeta.title
      expect(ctx.view.title).toBe('Hamlet')
      expect(ctx.widgetData.Blog1.posts.length).toBe(3)
      expect(ctx.widgetData.Blog1.numPosts).toBe(3)

      expect(ctx.widgetData.Blog1.newerPageUrl).toBe('https://hamlet.zkreations.com/')
      expect(ctx.widgetData.Blog1.olderPageUrl).toContain('https://hamlet.zkreations.com/search?updated-max=')
      expect(ctx.widgetData.Blog1.olderPageUrl).toContain('max-results=3')
      expect(ctx.widgetData.Blog1.olderPageUrl).toContain('start=3')
      expect(ctx.widgetData.Blog1.olderPageUrl).toContain('by-date=false')

      expect(ctx.messages.newerPosts).toBe('Newer Posts')
      expect(ctx.messages.olderPosts).toBe('Older Posts')
    })

    it('computes relative pagination URLs when urlMode is relative', async () => {
      const mockFetch = createMockFetch()
      const ctx = await resolveBloggerContext({
        view: 'post_listing',
        urlMode: 'relative',
        blogId,
        fetch: mockFetch,
        overrides: {
          view: {
            url: '/search?updated-max=2025-04-01T18:11:27.102-07:00&max-results=3&by-date=false',
          },
        },
      })

      expect(ctx.widgetData.Blog1.newerPageUrl).toBe('/')
      expect(ctx.widgetData.Blog1.olderPageUrl).toContain('/search?updated-max=')
    })

    it('handles search queries by ranking posts by keyword relevance and populating view.search.query', async () => {
      const mockFetch = createMockFetch()
      const ctx = await resolveBloggerContext({
        view: 'search_query',
        urlMode: 'remote',
        blogId,
        fetch: mockFetch,
        overrides: {
          view: {
            url: 'https://hamlet.zkreations.com/search?q=The',
          },
        },
      })

      expect(ctx.view.title).toBe('Hamlet')
      expect(ctx.view.search.query).toBe('The')
      expect(ctx.widgetData.Blog1.posts.length).toBeGreaterThan(0)
      // Highest frequency of 'the' among feed posts comes first
      expect(ctx.widgetData.Blog1.posts[0].title).toBe('Islands rising above the sea')
    })

    it('resolves static page view into Blog1.posts with allowComments false and marks active PageList link', async () => {
      const mockFetch = createMockFetch()
      const ctx = await resolveBloggerContext({
        view: 'static_page',
        urlMode: 'remote',
        blogId,
        fetch: mockFetch,
        overrides: {
          view: {
            url: 'https://hamlet.zkreations.com/p/typography.html',
          },
        },
      })

      expect(ctx.view.isPage).toBe(true)
      expect(ctx.view.isSingleItem).toBe(true)
      expect(ctx.view.title).toBe('Typography')
      expect(ctx.view.url).toBe('https://hamlet.zkreations.com/p/typography.html')
      expect(ctx.view.pageId).toBe(Number.parseInt('2772603359269059586', 10))

      const blogPosts = ctx.widgetData.Blog1.posts
      expect(blogPosts.length).toBe(1)
      expect(blogPosts[0].title).toBe('Typography')
      expect(blogPosts[0].allowComments).toBe(false)
      expect(blogPosts[0].labels).toEqual([])

      const pageLinks = ctx.widgetData.PageList1.links
      const typographyLink = pageLinks.find((l: any) => l.title === 'Typography')
      expect(typographyLink).toBeDefined()
      expect(typographyLink.isCurrentPage).toBe(true)
    })
  })

  describe('blog1 byline items and homepage pagination hydration', () => {
    it('reacts to widget settings by omitting falsy items from allBylineItems and exposing named properties', async () => {
      const mockFetch = createMockFetch()
      const ctx = await resolveBloggerContext({
        blogId,
        fetch: mockFetch,
        config: {
          widgets: {
            Blog1: {
              showAuthor: false,
              showTimestamp: true,
              showLabels: true,
            },
          },
        },
      })

      const blog1 = ctx.widgetData.Blog1
      expect(blog1.allBylineItems).toBeDefined()
      // author was set to false, so it must not be present in allBylineItems
      expect(blog1.allBylineItems.author).toBeUndefined()
      expect(blog1.allBylineItems.some((item: any) => item.name === 'author')).toBe(false)

      // timestamp and labels were true, so they must exist both in array and as named properties
      expect(blog1.allBylineItems.timestamp).toBeDefined()
      expect(blog1.allBylineItems.timestamp.name).toBe('timestamp')
      expect(blog1.allBylineItems.labels).toBeDefined()
      expect(blog1.allBylineItems.labels.name).toBe('labels')
    })

    it('generates synthetic olderPageUrl on homepage when active posts exceed postsPerPage', async () => {
      const mockFetch = createMockFetch()
      const ctx = await resolveBloggerContext({
        blogId,
        fetch: mockFetch,
        view: 'homepage',
        config: {
          blog: {
            postsPerPage: 3,
          },
        },
      })

      const blog1 = ctx.widgetData.Blog1
      expect(blog1.posts.length).toBe(3)
      expect(blog1.olderPageUrl).toBeDefined()
      expect(blog1.olderPageUrl).toContain('updated-max=')
      expect(blog1.olderPageUrl).toContain('max-results=3')
    })

    it('hydrates LinkList with canonical name and target, avoiding mock leakage in external blogs', async () => {
      const mockFetch = createMockFetch()
      const ctx = await resolveBloggerContext({
        blogId: '9999999999999999999', // External blog
        fetch: mockFetch,
        config: {
          widgets: {
            LinkList1: {
              links: [
                { name: 'facebook', target: 'https://facebook.com/zkreations' },
                { name: 'github', target: 'https://github.com/zkreations' },
              ],
            },
          },
        },
      })

      const linkList = ctx.widgetData.LinkList1
      expect(linkList).toBeDefined()
      expect(linkList.links).toHaveLength(2)
      expect(linkList.links[0].name).toBe('facebook')
      expect(linkList.links[0].target).toBe('https://facebook.com/zkreations')
      expect(linkList.links[0].title).toBe('facebook')
      expect(linkList.links[0].href).toBe('https://facebook.com/zkreations')
    })

    it('defaults LinkList to empty array when unconfigured, preventing mock leakage', async () => {
      const mockFetch = createMockFetch()
      const ctx = await resolveBloggerContext({
        blogId: '9999999999999999999',
        fetch: mockFetch,
        config: {
          widgets: {
            LinkList1: {},
          },
        },
      })

      const linkList = ctx.widgetData.LinkList1
      expect(linkList).toBeDefined()
      expect(linkList.links).toEqual([])
    })

    it('synthesizes canonical defaults for Attribution and ContactForm when discovered in template', async () => {
      const mockFetch = createMockFetch()
      const templateXml = `
        <b:section id='footer'>
          <b:widget id='Attribution1' type='Attribution'><b:includable id='main'/></b:widget>
          <b:widget id='ContactForm1' type='ContactForm'><b:includable id='main'/></b:widget>
        </b:section>
      `
      const ctx = await resolveBloggerContext({
        blogId,
        fetch: mockFetch,
        templateXml,
      })

      const attribution = ctx.widgetData.Attribution1
      expect(attribution).toBeDefined()
      expect(attribution.title).toBe('Attribution')
      expect(attribution.copyright).toContain('Hamlet')
      expect(attribution.copyright).toContain('Powered by Blogger')
      expect(attribution.bloggerUrl).toBe('https://www.blogger.com')

      const contactForm = ctx.widgetData.ContactForm1
      expect(contactForm).toBeDefined()
      expect(contactForm.title).toBe('Contact Form')
      expect(contactForm.submitUrl).toBe('https://www.blogger.com/contact-form.do')
      expect(contactForm.contactFormNameMsg).toBe('Name')
      expect(contactForm.contactFormSendMsg).toBe('Send')
    })

    it('empirically normalizes archive_weekly_daily routes to monthly archive without day filter', async () => {
      const mockFetch = createMockFetch()
      const ctx = await resolveBloggerContext({
        blogId,
        fetch: mockFetch,
        view: 'archive_weekly_daily',
        targetUrl: 'https://hamlet.zkreations.com/2023_11_17_archive.html',
      })

      expect(ctx.view.url).toBe('https://hamlet.zkreations.com/2023/11/')
      expect(ctx.blog.canonicalUrl).toBe('https://hamlet.zkreations.com/2023/11/')
      expect(ctx.view.archive).toBeDefined()
      expect(ctx.view.archive.year).toBe(2023)
      expect(ctx.view.archive.month).toBe(11)
      expect(ctx.view.archive.day).toBeUndefined()
      expect(ctx.widgetData.Blog1.posts.length).toBeGreaterThan(0)
    })

    it('resolves custom404Message for error_404 views in both offline and online modes', async () => {
      const mockFetch = createMockFetch()
      const customHtml = '<div class="custom-404">Not Found</div>'

      // Offline mode with blog.custom404Message
      const offlineCtx = await resolveBloggerContext({
        view: 'error_404',
        offline: true,
        config: {
          blog: {
            custom404Message: customHtml,
          },
        },
      })
      expect(offlineCtx.widgetData.Blog1.navMessage).toBe(customHtml)

      // Online mode with blog.custom404Message
      const onlineCtx = await resolveBloggerContext({
        blogId,
        fetch: mockFetch,
        view: 'error_404',
        config: {
          blog: {
            custom404Message: customHtml,
          },
        },
      })
      expect(onlineCtx.widgetData.Blog1.navMessage).toBe(customHtml)

      // Default fallback when custom404Message is not provided
      const defaultCtx = await resolveBloggerContext({
        view: 'error_404',
        offline: true,
      })
      expect(defaultCtx.widgetData.Blog1.navMessage).toBe('Sorry, the page you were looking for in this blog does not exist.')
    })
  })
})
