import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createSnippets,
  extractId,
  normalizeBlogMetadata,
  normalizeCommentEntry,
  normalizeHeader,
  normalizeLabels,
  normalizePageEntry,
  normalizePostEntry,
  stripHtml,
} from '../src/context/normalizer.js'
import { createUrlMapper } from '../src/context/url-mapper.js'
import { getWorkspacePaths } from '../src/paths.js'

describe('context normalizer suite with real Hamlet fixtures', () => {
  const postsFeedJson = JSON.parse(
    readFileSync(join(getWorkspacePaths().fixtures, 'feeds/hamlet-posts-sample.json'), 'utf8'),
  )
  const pagesFeedJson = JSON.parse(
    readFileSync(join(getWorkspacePaths().fixtures, 'feeds/hamlet-pages-sample.json'), 'utf8'),
  )
  const commentsFeedJson = JSON.parse(
    readFileSync(join(getWorkspacePaths().fixtures, 'feeds/hamlet-comments-sample.json'), 'utf8'),
  )

  const blogId = '5408826600056783247'
  const mapper = createUrlMapper({
    blogHost: 'hamlet.zkreations.com',
    urlMode: 'relative',
  })

  describe('stripHtml and createSnippets', () => {
    it('cleans tags, collapses spaces, and decodes entities', () => {
      const html = '<p>Texto con &quot;comillas&quot; y &amp; s&iacute;mbolos &lt;b&gt;negrita&lt;/b&gt;</p>'
      const stripped = stripHtml(html)
      expect(stripped).toContain('"comillas"')
      expect(stripped).toContain('&')
      expect(stripped).not.toContain('<p>')
    })

    it('enforces 100 character short and 250 character long snippets', () => {
      const longText = 'A'.repeat(500)
      const { short, long } = createSnippets(longText)
      expect(short.length).toBeLessThanOrEqual(103) // 100 + '...'
      expect(short.endsWith('...')).toBe(true)
      expect(long.length).toBeLessThanOrEqual(253) // 250 + '...'
      expect(long.endsWith('...')).toBe(true)
    })
  })

  describe('extractId', () => {
    it('extracts numeric ID from Blogger tag URNs', () => {
      expect(extractId('tag:blogger.com,1999:blog-5408826600056783247.post-8389032230243957219'))
        .toBe('8389032230243957219')
      expect(extractId('tag:blogger.com,1999:blog-5408826600056783247.page-1234567'))
        .toBe('1234567')
      expect(extractId('99999')).toBe('99999')
    })
  })

  describe('normalizePostEntry', () => {
    const rawPost = postsFeedJson.feed.entry[0]

    it('normalizes a full post entry accurately to canonical Blogger post model', () => {
      const post = normalizePostEntry(rawPost, mapper, blogId)

      expect(post.id).toBe('8389032230243957219')
      expect(post.title).toBe('The Importance of Environmental Care')
      expect(post.url).toBe('/2023/04/the-importance-of-environmental-care.html')
      expect(post.absoluteUrl).toBe('https://hamlet.zkreations.com/2023/04/the-importance-of-environmental-care.html')
      expect(post.numberOfComments).toBe(4)
      expect(post.author.name).toBe('Iveth')
      expect(post.author.authorPhoto.url).toBeDefined()
      expect(post.labels.length).toBe(3)
      expect(post.labels.map(l => l.name)).toEqual(['biodiversity', 'essay', 'nature'])
      expect(post.labels[0].url).toBe('/search/label/biodiversity')
      expect(post.commentFormIframeSrc).toContain(blogId)
      expect(post.commentFormIframeSrc).toContain('8389032230243957219')
    })
  })

  describe('normalizePageEntry', () => {
    const rawPages = pagesFeedJson.feed.entry

    it('normalizes pages into PageList link objects', () => {
      const page0 = normalizePageEntry(rawPages[0], mapper, '/p/typography.html')
      const page1 = normalizePageEntry(rawPages[1], mapper, '/p/typography.html')

      expect(page0.title).toBe('Typography')
      expect(page0.href).toBe('/p/typography.html')
      expect(page0.isCurrentPage).toBe(true)

      expect(page1.title).toBe('Contact')
      expect(page1.href).toBe('/p/contact.html')
      expect(page1.isCurrentPage).toBe(false)
    })
  })

  describe('normalizeLabels', () => {
    it('sorts alphabetically by default per Blogger canonical specification', () => {
      const labels = normalizeLabels(postsFeedJson.feed.entry, mapper)
      expect(labels.length).toBeGreaterThan(0)
      expect(labels[0].name.localeCompare(labels[1].name)).toBeLessThanOrEqual(0)
      expect(labels[0].url).toContain('/search/label/')
    })

    it('aggregates category occurrences and sorts descending by frequency when requested', () => {
      const labels = normalizeLabels(postsFeedJson.feed.entry, mapper, 'FREQUENCY')
      expect(labels.length).toBeGreaterThan(0)
      expect(labels[0].count).toBeGreaterThanOrEqual(labels[labels.length - 1].count)
      expect(labels[0].url).toContain('/search/label/')
    })
  })

  describe('normalizeCommentEntry', () => {
    it('normalizes comment entry with threading, admin classes, and author data', () => {
      const entries = commentsFeedJson.feed.entry
      const rootComment = normalizeCommentEntry(entries[3], mapper, blogId)
      const replyComment = normalizeCommentEntry(entries[1], mapper, blogId)

      expect(rootComment.id).toBe('5032424365300934236')
      expect(rootComment.author).toBe('Anonymous')
      expect(rootComment.inReplyTo).toBe('')
      expect(rootComment.adminClass).toBe('blog-admin pid-1793582710')
      expect(rootComment.deleteUrl).toBe(`https://www.blogger.com/comment/delete/${blogId}/5032424365300934236`)

      expect(replyComment.id).toBe('4084576595224636469')
      expect(replyComment.author).toBe('Kai Haruto')
      expect(replyComment.authorUrl).toBe('https://www.blogger.com/profile/05991519695825559144')
      expect(replyComment.authorUserType).toBe('BLOGGER')
      expect(replyComment.inReplyTo).toBe('5032424365300934236')
      expect(replyComment.adminClass).toBe('blog-admin pid-1462240053')
    })
  })

  describe('normalizeBlogMetadata and Header', () => {
    it('normalizes blog header and metadata from feed root', () => {
      const header = normalizeHeader(postsFeedJson.feed, mapper)
      const meta = normalizeBlogMetadata(postsFeedJson.feed, mapper, blogId)

      expect(header.title).toBe('Hamlet')
      expect(header.url).toBe('/')
      expect(meta.title).toBe('Hamlet')
      expect(meta.blogId).toBe(blogId)
      expect(meta.homepageUrl).toBe('/')
      expect(meta.searchUrl).toBe('/search')
    })
  })
})
