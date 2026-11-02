import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BloggerReferenceRenderer,
  getMockContext,
  resolveBloggerContext,
} from '../src/index.js'
import { getWorkspacePaths } from '../src/paths.js'

describe('canonical Views Conformance (hamlet.xml & ReferenceRenderer)', () => {
  const paths = getWorkspacePaths()
  const templatePath = join(paths.fixtures, 'templates', 'samples', 'hamlet.xml')
  const hamletXml = readFileSync(templatePath, 'utf-8')
  const renderer = new BloggerReferenceRenderer({
    emitWrappers: true,
    normalizeProtocolRelativeUrls: true,
  })

  it('compiles homepage mock context without unresolved tags', () => {
    const context = getMockContext('homepage', {
      view: { title: 'Hamlet Conformance' },
    })

    const html = renderer.render(hamletXml, context)

    expect(html).toContain('<title>Hamlet Conformance</title>')
    expect(html).not.toMatch(/<b:(?:if|loop|with|switch|tag|eval|include)/)
    expect(html).not.toMatch(/<data:[^>]+>/)
  })

  it('compiles post view rendering article content and comments block', () => {
    const context = getMockContext('post')
    const html = renderer.render(hamletXml, context)

    expect(html).toContain('Guía Definitiva de Plantillas Blogger')
    expect(html).toContain('Aprende las mejores prácticas para crear temas modernos en Blogger Layouts v3')
    expect(html).not.toMatch(/<b:(?:if|loop|with|switch|tag|eval|include)/)
  })

  it('renders 404 error view correctly activating status and localized messages', () => {
    const context = getMockContext('error_404')
    const html = renderer.render(hamletXml, context)

    expect(html).toContain('class="is-error"')
    expect(html).toContain('class="message error"')
    expect(html).not.toMatch(/<b:(?:if|loop|with|switch|tag|eval|include)/)
  })

  it('renders offline context resolution through resolveBloggerContext', async () => {
    const context = await resolveBloggerContext({
      offline: true,
      view: 'homepage',
      overrides: {
        blog: { title: 'Offline Hamlet Test' },
        view: { title: 'Offline Hamlet Test' },
      },
    })

    const html = renderer.render(hamletXml, context)

    expect(html).toContain('<title>Offline Hamlet Test</title>')
    expect(html).toContain('id="header"')
    expect(html).not.toMatch(/<b:(?:if|loop|with|switch|tag|eval)/)
  })

  it('guarantees zero unresolved blogger directives across all canonical views', () => {
    const canonicalViews = [
      'homepage',
      'post',
      'static_page',
      'label_search',
      'archive_yearly',
      'archive_monthly',
      'archive_weekly_daily',
      'post_listing',
      'search_query',
      'error_404',
    ] as const

    for (const viewId of canonicalViews) {
      const ctx = getMockContext(viewId)
      const output = renderer.render(hamletXml, ctx)

      expect(output.length).toBeGreaterThan(1000)
      expect(output).not.toMatch(/<b:(?:if|loop|with|switch|tag|eval|attr|class)/)
      expect(output).not.toMatch(/<data:[\w.:]+(?:\/>|>)/)

      // Verify structural containers and widgets are rendered
      expect(output).toContain('id="header"')
      expect(output).toContain('id="content"')
      expect(output).toContain('id="sidebar"')
      expect(output).toContain('id=\'page-skin-1\'')
      expect(output).toContain('Blog1')
      expect(output).toContain('Header1')

      // Verify clean attributes on <img> tags (Level 3 Dynamic Dereferencing)
      expect(output).not.toContain('id="data:id"')
      expect(output).not.toContain('sizes="data:sizes"')
      expect(output).not.toContain('loading="data:loading"')
      expect(output).not.toContain('alt="data:alt"')
    }
  })

  it('integrates cookieChoiceInfo singleton when blog.cookieChoices is enabled', () => {
    const ctx = getMockContext('homepage', {
      blog: {
        cookieChoices: true,
      },
    })

    const html = renderer.render(hamletXml, ctx)

    expect(html).toContain('id="cookieChoiceInfo"')
    expect(html).toContain('class="cookie-choices-info singleton-element"')
    expect(html).toContain('id="cookieChoiceDismiss"')
    expect(html).toMatch(/<\/body>/)
  })
})
