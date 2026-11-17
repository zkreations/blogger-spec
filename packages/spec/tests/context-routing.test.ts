import { describe, expect, it } from 'vitest'
import { CANONICAL_VIEWS, resolveBloggerRoute } from '../src/index.js'

describe('context-routing and resolveBloggerRoute', () => {
  it('exports CANONICAL_VIEWS with exactly 12 views', () => {
    expect(CANONICAL_VIEWS.length).toBe(12)
    expect(CANONICAL_VIEWS).toContain('homepage')
    expect(CANONICAL_VIEWS).toContain('post')
    expect(CANONICAL_VIEWS).toContain('static_page')
    expect(CANONICAL_VIEWS).toContain('label_search')
    expect(CANONICAL_VIEWS).toContain('search_query')
    expect(CANONICAL_VIEWS).toContain('post_listing')
    expect(CANONICAL_VIEWS).toContain('error_404')
  })

  it('resolves homepage root url', () => {
    const route = resolveBloggerRoute('https://myblog.blogspot.com/')
    expect(route.viewId).toBe('homepage')
    expect(route.pathname).toBe('/')
  })

  it('resolves label search route and extracts decoded label', () => {
    const route = resolveBloggerRoute('/search/label/Artificial%20Intelligence?max-results=8')
    expect(route.viewId).toBe('label_search')
    expect(route.params.label).toBe('Artificial Intelligence')
  })

  it('resolves text query search route and extracts query param', () => {
    const route = resolveBloggerRoute('/search?q=Blogger+Spec&by-date=true')
    expect(route.viewId).toBe('search_query')
    expect(route.params.q).toBe('Blogger Spec')
  })

  it('resolves post_listing route on paginated stream without q or label', () => {
    const route = resolveBloggerRoute('/search?updated-max=2026-10-01T00:00:00Z&max-results=5')
    expect(route.viewId).toBe('post_listing')
  })

  it('resolves single post item route and extracts year, month, slug', () => {
    const route = resolveBloggerRoute('/2026/04/modern-theme-architecture.html')
    expect(route.viewId).toBe('post')
    expect(route.params.year).toBe(2026)
    expect(route.params.month).toBe(4)
    expect(route.params.slug).toBe('modern-theme-architecture')
  })

  it('resolves static page route and extracts slug', () => {
    const route = resolveBloggerRoute('/p/about-me.html')
    expect(route.viewId).toBe('static_page')
    expect(route.params.slug).toBe('about-me')
  })

  it('resolves archive yearly, monthly, and weekly/daily routes', () => {
    const yearly = resolveBloggerRoute('/2026/')
    expect(yearly.viewId).toBe('archive_yearly')
    expect(yearly.params.year).toBe(2026)

    const monthly = resolveBloggerRoute('/2026/09/')
    expect(monthly.viewId).toBe('archive_monthly')
    expect(monthly.params.year).toBe(2026)
    expect(monthly.params.month).toBe(9)

    const daily = resolveBloggerRoute('/2026_09_15_archive.html')
    expect(daily.viewId).toBe('archive_weekly_daily')
    expect(daily.params.year).toBe(2026)
    expect(daily.params.month).toBe(9)
    expect(daily.params.day).toBe(15)
  })

  it('resolves error_404 route', () => {
    expect(resolveBloggerRoute('/404').viewId).toBe('error_404')
    expect(resolveBloggerRoute('/error').viewId).toBe('error_404')
  })

  it('honors preview and layout_mode flags', () => {
    expect(resolveBloggerRoute('/?preview=true').viewId).toBe('preview')
    expect(resolveBloggerRoute('/?layout_mode=true').viewId).toBe('layout_mode')
  })
})
