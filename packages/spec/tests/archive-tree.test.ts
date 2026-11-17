import type { BloggerPostData } from '../src/context/types.js'
import { describe, expect, it } from 'vitest'
import { buildArchiveHierarchy } from '../src/context/archive-tree.js'
import { createUrlMapper } from '../src/context/url-mapper.js'

describe('archive-tree hierarchy generator', () => {
  const mapper = createUrlMapper({ blogHost: 'myblog.example.com', urlMode: 'remote' })

  function createTestPost(id: string, title: string, url: string, publishedIso: string): BloggerPostData {
    return {
      id,
      title,
      url,
      absoluteUrl: url,
      body: '<p>Content</p>',
      date: 'April 2023',
      lastUpdated: 'April 2023',
      publishedIso,
      featuredImage: '',
      thumbnailUrl: '',
      snippets: { short: '', long: '' },
      author: { name: 'Admin', profileUrl: '', aboutMe: '', authorPhoto: { url: '', width: 80, height: 80, alt: '' } },
      labels: [],
      numberOfComments: 0,
      allowComments: true,
      allowNewComments: true,
      showThreadedComments: true,
      hasJumpLink: false,
      comments: [],
      commentFormIframeSrc: '',
    }
  }

  const samplePosts: BloggerPostData[] = [
    createTestPost('1', 'First Post in November 2023', 'https://myblog.example.com/2023/11/first.html', '2023-11-15T10:00:00Z'),
    createTestPost('2', 'Second Post in November 2023', 'https://myblog.example.com/2023/11/second.html', '2023-11-20T12:00:00Z'),
    createTestPost('3', 'Post in April 2023', 'https://myblog.example.com/2023/04/april.html', '2023-04-10T08:00:00Z'),
    createTestPost('4', 'Post in December 2022', 'https://myblog.example.com/2022/12/december.html', '2022-12-05T14:00:00Z'),
  ]

  it('handles empty posts array gracefully', () => {
    const result = buildArchiveHierarchy([], mapper)
    expect(result).toEqual([])
  })

  it('groups posts hierarchically by year descending and month descending', () => {
    const hierarchy = buildArchiveHierarchy(samplePosts, mapper, { locale: 'en' })

    expect(hierarchy.length).toBe(2)

    const year2023 = hierarchy[0]!
    expect(year2023.name).toBe('2023')
    expect(year2023.url).toBe('https://myblog.example.com/2023/')
    expect(year2023['post-count']).toBe(3)
    expect(year2023.toggleId).toBe('BlogArchive1_2023')
    expect(year2023.data.length).toBe(2)

    const nov = year2023.data[0]!
    expect(nov.name).toBe('November')
    expect(nov.url).toBe('https://myblog.example.com/2023/11/')
    expect(nov['post-count']).toBe(2)
    expect(nov.toggleId).toBe('BlogArchive1_2023_11')
    expect(nov.posts.length).toBe(2)
    expect(nov.posts[0]!.title).toBe('First Post in November 2023')
    expect(nov.posts[1]!.title).toBe('Second Post in November 2023')

    const apr = year2023.data[1]!
    expect(apr.name).toBe('April')
    expect(apr.url).toBe('https://myblog.example.com/2023/04/')
    expect(apr['post-count']).toBe(1)
    expect(apr.toggleId).toBe('BlogArchive1_2023_04')
    expect(apr.posts.length).toBe(1)

    const year2022 = hierarchy[1]!
    expect(year2022.name).toBe('2022')
    expect(year2022.url).toBe('https://myblog.example.com/2022/')
    expect(year2022['post-count']).toBe(1)
    expect(year2022.data.length).toBe(1)
  })

  it('supports localized month names', () => {
    const hierarchyEs = buildArchiveHierarchy(samplePosts, mapper, { locale: 'es' })
    const year2023 = hierarchyEs[0]!
    const nov = year2023.data[0]!
    expect(nov.name.toLowerCase()).toContain('noviembre')
  })

  it('honors custom widgetId in toggleId generation', () => {
    const hierarchy = buildArchiveHierarchy(samplePosts, mapper, { widgetId: 'BlogArchive2' })
    expect(hierarchy[0]!.toggleId).toBe('BlogArchive2_2023')
    expect(hierarchy[0]!.data[0]!.toggleId).toBe('BlogArchive2_2023_11')
  })
})
