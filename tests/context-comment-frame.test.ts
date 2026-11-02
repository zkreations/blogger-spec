import { describe, expect, it } from 'vitest'
import {
  BloggerReferenceRenderer,
  getCommentFrameStubHtml,
  resolveBloggerContext,
} from '../src/index.js'

describe('commentFormIframeSrc and Local DX Emulation', () => {
  it('rewrites data:post.commentFormIframeSrc to local base URL in offline mode', async () => {
    const ctx = await resolveBloggerContext({
      offline: true,
      view: 'post',
      commentFrameBaseUrl: 'http://localhost:3000/__mock/comment-frame',
    })

    const iframeSrc = ctx.widgetData.Blog1.posts[0]?.commentFormIframeSrc
    expect(iframeSrc).toBeDefined()
    expect(iframeSrc).toContain('http://localhost:3000/__mock/comment-frame?')
    expect(iframeSrc).toContain('po=')
    expect(iframeSrc).toContain('hl=en')
  })

  it('honors commentFrameBaseUrl defined inside blogger.config.json', async () => {
    const ctx = await resolveBloggerContext({
      offline: true,
      view: 'post',
      config: {
        blog: {
          locale: 'es',
          commentFrameBaseUrl: 'http://localhost:5173/custom-comments',
        },
      },
    })

    const iframeSrc = ctx.widgetData.Blog1.posts[0]?.commentFormIframeSrc
    expect(iframeSrc).toBeDefined()
    expect(iframeSrc).toContain('http://localhost:5173/custom-comments?')
    expect(iframeSrc).toContain('hl=es')
    expect(iframeSrc).not.toContain('www.blogger.com')
  })

  it('preserves default www.blogger.com URL when commentFrameBaseUrl is omitted', async () => {
    const ctx = await resolveBloggerContext({
      offline: true,
      view: 'post',
    })

    const iframeSrc = ctx.widgetData.Blog1.posts[0]?.commentFormIframeSrc
    expect(iframeSrc).toBeDefined()
    expect(iframeSrc).toContain('https://www.blogger.com/comment/frame/')
  })

  it('normalizes commentFormIframeSrc with query params and params operator in templates', () => {
    const renderer = new BloggerReferenceRenderer()
    const ctx = {
      post: {
        commentFormIframeSrc: 'http://localhost:3000/__mock/comment-frame?po=12345&hl=es',
      },
    }
    const xml = `<iframe id='comment-editor' expr:src='data:post.commentFormIframeSrc params { skin: "emporio" }' height='66'/>`
    const html = renderer.compileFragment(xml, ctx)

    expect(html).toContain('src="http://localhost:3000/__mock/comment-frame?po=12345&hl=es&skin=emporio"')
    expect(html).toContain('id="comment-editor"')
  })

  it('getCommentFrameStubHtml produces valid zero-dependency HTML with bi-directional postMessage', () => {
    const html = getCommentFrameStubHtml({ locale: 'es', skin: 'soho' })

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('lang="es"')
    expect(html).toContain('Publicar un comentario')
    expect(html).toContain('id="comment-text"')
    expect(html).toContain('window.parent.postMessage')
    expect(html).toContain('setHeight')
  })
})
