import { describe, expect, it } from 'vitest'
import { createUrlMapper } from '../src/context/url-mapper.js'

describe('context UrlMapper suite', () => {
  const host = 'hamlet.zkreations.com'

  describe('relative mode (default)', () => {
    const mapper = createUrlMapper({ blogHost: host, urlMode: 'relative' })

    it('rewrites internal blog URLs to root-relative paths', () => {
      expect(mapper.mapUrl('https://hamlet.zkreations.com/2023/04/post.html')).toBe('/2023/04/post.html')
      expect(mapper.mapUrl('https://hamlet.zkreations.com/p/contact.html')).toBe('/p/contact.html')
      expect(mapper.mapUrl('https://hamlet.zkreations.com/search/label/nature')).toBe('/search/label/nature')
      expect(mapper.mapUrl('https://hamlet.zkreations.com/')).toBe('/')
    })

    it('preserves query strings and hashes on internal URLs', () => {
      expect(mapper.mapUrl('https://hamlet.zkreations.com/search?q=trees#top')).toBe('/search?q=trees#top')
      expect(mapper.mapUrl('https://hamlet.zkreations.com/2023/04/post.html?m=1#comments')).toBe('/2023/04/post.html?m=1#comments')
    })

    it('does not touch external third-party domains', () => {
      expect(mapper.mapUrl('https://google.com')).toBe('https://google.com')
      expect(mapper.mapUrl('https://twitter.com/hamlet')).toBe('https://twitter.com/hamlet')
      expect(mapper.mapUrl('https://lh3.googleusercontent.com/a/photo.jpg')).toBe('https://lh3.googleusercontent.com/a/photo.jpg')
    })

    it('preserves relative, anchor and special protocol URLs', () => {
      expect(mapper.mapUrl('/already/relative')).toBe('/already/relative')
      expect(mapper.mapUrl('#anchor')).toBe('#anchor')
      expect(mapper.mapUrl('mailto:info@example.com')).toBe('mailto:info@example.com')
      expect(mapper.mapUrl('javascript:void(0)')).toBe('javascript:void(0)')
      expect(mapper.mapUrl('')).toBe('')
      expect(mapper.mapUrl(undefined)).toBe('')
    })
  })

  describe('local mode with baseUrl', () => {
    it('rewrites internal URLs with local development baseUrl', () => {
      const mapper = createUrlMapper({
        blogHost: host,
        urlMode: 'local',
        baseUrl: 'http://localhost:3000',
      })

      expect(mapper.mapUrl('https://hamlet.zkreations.com/2023/04/post.html'))
        .toBe('http://localhost:3000/2023/04/post.html')
      expect(mapper.mapUrl('https://hamlet.zkreations.com/p/contact.html'))
        .toBe('http://localhost:3000/p/contact.html')
    })

    it('cleans trailing slash from baseUrl cleanly', () => {
      const mapper = createUrlMapper({
        blogHost: host,
        urlMode: 'local',
        baseUrl: 'http://localhost:8080///',
      })

      expect(mapper.mapUrl('https://hamlet.zkreations.com/p/contact.html'))
        .toBe('http://localhost:8080/p/contact.html')
    })

    it('leaves external URLs intact even in local mode', () => {
      const mapper = createUrlMapper({
        blogHost: host,
        urlMode: 'local',
        baseUrl: 'http://localhost:3000',
      })

      expect(mapper.mapUrl('https://github.com/project')).toBe('https://github.com/project')
    })
  })

  describe('remote mode', () => {
    it('preserves original remote URLs completely', () => {
      const mapper = createUrlMapper({ blogHost: host, urlMode: 'remote' })

      expect(mapper.mapUrl('https://hamlet.zkreations.com/2023/04/post.html'))
        .toBe('https://hamlet.zkreations.com/2023/04/post.html')
      expect(mapper.mapUrl('https://hamlet.zkreations.com/p/contact.html'))
        .toBe('https://hamlet.zkreations.com/p/contact.html')
    })
  })

  describe('host normalization', () => {
    it('normalizes blogHost with protocol or trailing slashes', () => {
      const mapper = createUrlMapper({
        blogHost: 'https://HAMLET.zkreations.com/',
        urlMode: 'relative',
      })

      expect(mapper.blogHost).toBe('hamlet.zkreations.com')
      expect(mapper.mapUrl('https://hamlet.zkreations.com/page.html')).toBe('/page.html')
    })
  })
})
