import type { BloggerViewId } from '../src/types.js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getGlobals, getMockContext, getSpecCatalog } from '../src/index.js'
import { getWorkspacePaths } from '../src/paths.js'

describe('canonical mock contexts suite (Plan 05)', () => {
  const views: BloggerViewId[] = [
    'homepage',
    'post_listing',
    'search_query',
    'label_search',
    'archive_yearly',
    'archive_monthly',
    'archive_weekly_daily',
    'post',
    'static_page',
    'error_404',
    'preview',
    'layout_mode',
  ]

  const globals = getGlobals()
  const viewMatrix: Record<string, any> = globals.domain_metadata?.views || {}

  it('exposes getMockContext on SpecCatalog instance and as standalone function', () => {
    const standaloneCtx = getMockContext('homepage')
    const catalogCtx = getSpecCatalog().getMockContext('homepage')
    expect(standaloneCtx).toBeDefined()
    expect(catalogCtx).toBeDefined()
    expect(standaloneCtx.blog.title).toBe(catalogCtx.blog.title)
  })

  it('provides all 12 views matching canonical matrix flags and view_type', () => {
    for (const viewId of views) {
      const ctx = getMockContext(viewId)
      const matrixDef = viewMatrix[viewId]
      expect(matrixDef, `Matrix definition for ${viewId} must exist`).toBeDefined()

      expect(ctx.view.type).toBe(matrixDef.view_type)

      for (const [flag, expectedState] of Object.entries(matrixDef.flags || {})) {
        const actualVal = ctx.view[flag]
        if (expectedState === 'true') {
          expect(actualVal, `${viewId}.view.${flag} must be true`).toBe(true)
        }
        else if (expectedState === 'false') {
          expect(actualVal, `${viewId}.view.${flag} must be false`).toBe(false)
        }
        else if (expectedState === 'missing') {
          expect(actualVal, `${viewId}.view.${flag} must be MISSING (undefined)`).toBeUndefined()
        }
      }

      expect(ctx.blog).toBeDefined()
      expect(ctx.blog.locale).toBe('es')
      expect(ctx.blog.encoding).toBe('UTF-8')
      expect(ctx.messages).toBeDefined()
      expect(ctx.widgets).toBeDefined()
      expect(ctx.widgetData).toBeDefined()
      expect(ctx.widgetData.Blog1).toBeDefined()
    }
  })

  it('evaluates data:view.featuredImage as missing on non-post views and populated on post view', () => {
    const homeCtx = getMockContext('homepage')
    expect(homeCtx.view.featuredImage).toBeUndefined()

    const archiveCtx = getMockContext('archive_monthly')
    expect(archiveCtx.view.featuredImage).toBeUndefined()

    const postCtx = getMockContext('post')
    expect(postCtx.view.featuredImage).toBeDefined()
    expect(typeof postCtx.view.featuredImage).toBe('string')
    expect(postCtx.view.featuredImage).toContain('http')
  })

  it('ensures allBylineItems supports both array iteration and direct keyed access', () => {
    const ctx = getMockContext('homepage')
    const byline = ctx.widgetData.Blog1.allBylineItems

    expect(Array.isArray(byline)).toBe(true)
    expect(byline.length).toBe(7)

    // Iteration works
    const names = byline.map((item: any) => item.name)
    expect(names).toEqual(['share', 'author', 'timestamp', 'comments', 'icons', 'labels', 'location'])

    // Direct keyed property access
    expect(byline.author).toBeDefined()
    expect(byline.author.name).toBe('author')
    expect(byline.author.label).toBe('Por')
    expect(byline.comments).toBeDefined()
    expect(byline.comments.label).toBe('Comentarios')

    // Boolean evaluation of item
    expect(Boolean(byline.author)).toBe(true)
  })

  it('provides flat comments list with threading via inReplyTo', () => {
    const ctx = getMockContext('post')
    const post = ctx.widgetData.Blog1.posts[0]
    expect(post).toBeDefined()
    expect(Array.isArray(post.comments)).toBe(true)
    expect(post.comments.length).toBeGreaterThanOrEqual(2)

    // Root comments filter: c => !c.inReplyTo
    const rootComments = post.comments.filter((c: any) => !c.inReplyTo)
    expect(rootComments.length).toBe(1)
    expect(rootComments[0].id).toBe('c1001')
    expect(rootComments[0].author).toBe('Carlos')

    // Reply comments filter: c => c.inReplyTo == rootComment.id
    const replies = post.comments.filter((c: any) => c.inReplyTo === rootComments[0].id)
    expect(replies.length).toBe(1)
    expect(replies[0].id).toBe('c1002')
    expect(replies[0].author).toBe('Abel')
    expect(replies[0].adminClass).toBe('is-admin')

    // Comment form iframe
    expect(post.commentFormIframeSrc).toBeDefined()
    expect(post.commentFormIframeSrc).toContain('comment-iframe.g')
  })

  it('validates canonical structure of secondary widgets (HTML, LinkList, BlogSearch, PopularPosts)', () => {
    const ctx = getMockContext('homepage')
    const data = ctx.widgetData

    // HTML1
    expect(data.HTML1).toBeDefined()
    expect(data.HTML1.title).toBe('HTML Personalizado')
    expect(data.HTML1.content).toContain('Contenido HTML')
    expect(ctx.widgets.HTML[0].id).toBe('HTML1')

    // LinkList1
    expect(data.LinkList1).toBeDefined()
    expect(data.LinkList1.title).toBe('Enlaces Útiles')
    expect(data.LinkList1.shownum).toBe(3)
    expect(data.LinkList1.sorting).toBe('none')
    expect(Array.isArray(data.LinkList1.links)).toBe(true)
    expect(data.LinkList1.links[0].name).toBe('Inicio')
    expect(data.LinkList1.links[0].target).toContain('ejemplo.blogspot.com')
    expect(ctx.widgets.LinkList[0].id).toBe('LinkList1')

    // BlogSearch1
    expect(data.BlogSearch1).toBeDefined()
    expect(data.BlogSearch1.title).toBe('Buscar en el blog')
    expect(ctx.widgets.BlogSearch[0].id).toBe('BlogSearch1')

    // PopularPosts1
    expect(data.PopularPosts1).toBeDefined()
    expect(typeof data.PopularPosts1.postDisplay).toBe('object')
    expect(data.PopularPosts1.postDisplay.showSnippet).toBe(true)
    expect(data.PopularPosts1.postDisplay.showTitle).toBe(true)
    expect(data.PopularPosts1.postDisplay.showAuthor).toBe(true)

    // Global blog canonical search and adsense properties
    expect(ctx.blog.searchUrl).toBe('https://ejemplo.blogspot.com/search')
    expect(ctx.blog.adsenseClientId).toBe('ca-pub-1234567890123456')
    expect(ctx.blog.adsenseHostId).toBe('ca-host-pub-1556223355139109')
  })

  it('validates canonical structure of BlogArchive, PageList, and Label gadgets', () => {
    const ctx = getMockContext('homepage')
    const data = ctx.widgetData

    // BlogArchive
    expect(data.BlogArchive1).toBeDefined()
    expect(data.BlogArchive1.style).toBe('HIERARCHY')
    expect(data.BlogArchive1.data[0].name).toBe('2026')
    expect(data.BlogArchive1.data[0].data[0].name).toBe('octubre')
    expect(data.BlogArchive1.data[0].data[0].posts.length).toBe(3)

    // PageList
    expect(data.PageList1).toBeDefined()
    expect(data.PageList1.links.length).toBe(3)
    const homeLink = data.PageList1.links.find((l: any) => l.id === 'c0')
    expect(homeLink.isCurrentPage).toBe(true)

    // Label
    expect(data.Label1).toBeDefined()
    expect(data.Label1.labels.length).toBe(3)
    expect(data.Label1.labels[0].name).toBe('blogger')
    expect(data.Label1.labels[0].count).toBe(5)
  })

  it('performs deep merge of overrides without mutating base embedded mock', () => {
    const customSkinColor = '#ff0077'
    const overridden = getMockContext('homepage', {
      skin: {
        vars: {
          keycolor: customSkinColor,
          brand_custom: 'custom-val',
        },
      },
      blog: {
        title: 'Blog Personalizado',
      },
    })

    expect(overridden.blog.title).toBe('Blog Personalizado')
    expect(overridden.skin.vars.keycolor).toBe(customSkinColor)
    expect(overridden.skin.vars.brand_custom).toBe('custom-val')
    // Untouched properties retained
    expect(overridden.blog.locale).toBe('es')
    expect(overridden.skin.vars.body_font).toBe('16px Arial, sans-serif')

    // Fresh call retains original clean state
    const cleanHome = getMockContext('homepage')
    expect(cleanHome.blog.title).toBe('Mi Blog de Pruebas')
    expect(cleanHome.skin.vars.keycolor).toBe('#1a73e8')
    expect(cleanHome.skin.vars.brand_custom).toBeUndefined()
  })

  it('throws descriptive error on invalid viewId', () => {
    expect(() => getMockContext('unknown_view' as any)).toThrowError(/Unknown Blogger view ID/)
  })

  it('supports real-world production template paths from hamlet.xml', () => {
    const hamletPath = join(getWorkspacePaths().fixtures, 'templates/samples/hamlet.xml')
    expect(existsSync(hamletPath)).toBe(true)
    const xml = readFileSync(hamletPath, 'utf-8')

    const home = getMockContext('homepage')
    const post = getMockContext('post')

    // Key properties consumed by basico.xml
    expect(home.view.isSingleItem).toBe(false)
    expect(home.view.isHomepage).toBe(true)
    expect(home.widgetData.Blog1.posts.length).toBeGreaterThan(0)
    expect(home.widgetData.Blog1.allBylineItems.author.label).toBe('Por')

    expect(post.view.isSingleItem).toBe(true)
    expect(post.view.isPost).toBe(true)
    expect(post.view.postId).toBe(1001)
    expect(post.widgetData.Blog1.posts[0].comments.length).toBeGreaterThan(0)
    expect(post.widgetData.Blog1.posts[0].commentFormIframeSrc).toBeDefined()

    // Template includes expected widgets
    expect(xml).toContain('id=\'Blog1\'')
    expect(xml).toContain('id=\'Header1\'')
  })
})
