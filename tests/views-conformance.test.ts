import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BloggerReferenceRenderer,
  getMockContext,
  normalizeHtmlString,
  resolveBloggerContext,
  resolveHamletContext,
} from '../src/index.js'
import { getWorkspacePaths } from '../src/paths.js'

describe('canonical Views Conformance (hamlet.xml & ReferenceRenderer)', () => {
  const paths = getWorkspacePaths()
  const templatePath = join(paths.fixtures, 'templates', 'samples', 'hamlet.xml')
  const goldenDir = join(paths.fixtures, 'templates', 'golden', 'views')
  const hamletXml = readFileSync(templatePath, 'utf-8')
  const renderer = new BloggerReferenceRenderer({
    emitWrappers: true,
    normalizeProtocolRelativeUrls: true,
  })

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
    'preview',
  ] as const

  it('compiles homepage mock context without unresolved tags', () => {
    const context = getMockContext('homepage', {
      view: { title: 'Hamlet Conformance' },
    })

    const html = renderer.render(hamletXml, context)

    expect(html).toContain('<title>Hamlet Conformance</title>')
    expect(html).not.toMatch(/<b:(?:if|loop|with|switch|tag|eval|include)/)
    expect(html).not.toMatch(/<data:[^>]+>/)
  })

  it('compiles post view rendering article content and comments block from hamlet feed', async () => {
    const context = await resolveHamletContext('post')
    const html = renderer.render(hamletXml, context)

    expect(html).toContain('The Importance of Environmental Care')
    expect(html).toContain('Our planet is facing a crisis')
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

  it.each(canonicalViews)('matches exact Golden Master DOM and guarantees zero unresolved tags for view: %s', async (viewId) => {
    const goldenFile = join(goldenDir, `${viewId}.html`)
    expect(existsSync(goldenFile), `Golden Master must exist for ${viewId}`).toBe(true)
    const expectedGoldenHtml = readFileSync(goldenFile, 'utf8').trim()

    const ctx = await resolveHamletContext(viewId)
    const output = renderer.render(hamletXml, ctx)
    const normalizedActual = normalizeHtmlString(output)

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

    // Exact Golden Master DOM comparison
    expect(normalizedActual).toBe(expectedGoldenHtml)
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
