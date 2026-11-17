import { describe, expect, it } from 'vitest'
import { getSpecCatalog } from '../src/catalogs/index.js'
import { resolveBloggerContext } from '../src/context/resolver.js'
import { createUrlMapper } from '../src/context/url-mapper.js'
import { extractBlogAuthor } from '../src/context/widget-author.js'
import {
  dispatchWidgetHydration,
  hydrateContentWidget,
  hydrateFeaturedPostWidget,
  hydrateImageWidget,
  hydrateLabelWidget,
  hydrateProfileWidget,
} from '../src/context/widget-hydrators.js'

describe('widget-author', () => {
  it('extracts author from feed.author[0]', () => {
    const feed = {
      author: [
        {
          name: { $t: 'Iveth' },
          uri: { $t: 'http://www.blogger.com/profile/05162121526782264118' },
          gd$image: { src: '//blogger.googleusercontent.com/img/avatar.jpg' },
        },
      ],
    }
    const author = extractBlogAuthor({ feed })
    expect(author.displayname).toBe('Iveth')
    expect(author.userUrl).toBe('https://www.blogger.com/profile/05162121526782264118')
    expect(author.authorPhoto.image).toBe('https://blogger.googleusercontent.com/img/avatar.jpg')
    expect(author.hasgoogleprofile).toBe(true)
  })

  it('falls back to rawPosts author when feed author is absent', () => {
    const rawPosts = [
      {
        id: { $t: 'tag:blogger.com,1999:post-1' },
        author: [
          {
            name: { $t: 'Editor' },
            uri: { $t: 'https://example.com/profile' },
            gd$image: { src: 'https://example.com/avatar.png' },
          },
        ],
      },
    ] as any
    const author = extractBlogAuthor({ rawPosts })
    expect(author.displayname).toBe('Editor')
    expect(author.userUrl).toBe('https://example.com/profile')
    expect(author.authorPhoto.image).toBe('https://example.com/avatar.png')
    expect(author.hasgoogleprofile).toBe(false)
  })

  it('returns safe anonymous defaults when no author data is found', () => {
    const author = extractBlogAuthor({})
    expect(author.displayname).toBe('Anonymous')
    expect(author.userUrl).toBe('')
    expect(author.authorPhoto.image).toContain('default-user')
    expect(author.hasgoogleprofile).toBe(false)
  })
})

describe('widget-hydrators', () => {
  const spec = getSpecCatalog()
  const mapper = createUrlMapper()

  const baseAuthor = {
    displayname: 'Iveth',
    userUrl: 'https://www.blogger.com/profile/05162121526782264118',
    authorPhoto: {
      url: 'https://blogger.googleusercontent.com/img/avatar.jpg',
      image: 'https://blogger.googleusercontent.com/img/avatar.jpg',
      alt: 'Iveth',
      width: 80,
      height: 80,
    },
    hasgoogleprofile: true,
  }

  it('hydrates Profile widget with default feed author when no config overrides exist', () => {
    const res = hydrateProfileWidget({
      widgetId: 'Profile1',
      widget: { id: 'Profile1', type: 'Profile', version: '2' } as any,
      type: 'Profile',
      merged: { showaboutme: true, showlocation: true },
      catalogDefaults: { showaboutme: true, showlocation: true },
      context: { widgetData: {} } as any,
      spec,
      mapper,
      blogLocale: 'en',
      blogTimeZone: 'UTC',
      normalizedPages: [],
      normalizedLabels: [],
      normalizedPosts: [],
      activePosts: [],
      headerData: {},
      blog1: {},
      blogAuthor: baseAuthor,
    })

    expect(res.displayname).toBe('Iveth')
    expect(res.userUrl).toBe('https://www.blogger.com/profile/05162121526782264118')
    expect(res.authorPhoto.image).toBe('https://blogger.googleusercontent.com/img/avatar.jpg')
    expect(res.aboutme).toBe('')
    expect(res.location).toBe('')
    expect(res.showaboutme).toBe(true)
    expect(res.showlocation).toBe(true)
    expect(res.team).toBe(false)
  })

  it('hydrates Profile widget with explicit config values for aboutme and location', () => {
    const res = hydrateProfileWidget({
      widgetId: 'Profile1',
      widget: { id: 'Profile1', type: 'Profile', version: '2' } as any,
      type: 'Profile',
      merged: {},
      catalogDefaults: {},
      instanceConfig: {
        title: 'About Me',
        displayname: 'Iveth Custom',
        aboutme: 'La manera de conocer la vida es amar muchas cosas',
        location: 'Babahoyo, Los Ríos, Ecuador',
      },
      context: { widgetData: {} } as any,
      spec,
      mapper,
      blogLocale: 'en',
      blogTimeZone: 'UTC',
      normalizedPages: [],
      normalizedLabels: [],
      normalizedPosts: [],
      activePosts: [],
      headerData: {},
      blog1: {},
      blogAuthor: baseAuthor,
    })

    expect(res.title).toBe('About Me')
    expect(res.displayname).toBe('Iveth Custom')
    expect(res.aboutme).toBe('La manera de conocer la vida es amar muchas cosas')
    expect(res.location).toBe('Babahoyo, Los Ríos, Ecuador')
    expect(res.userUrl).toBe(baseAuthor.userUrl)
    expect(res.authorPhoto.image).toBe(baseAuthor.authorPhoto.image)
  })

  it('normalizes legacy and convenience aliases (author, snippet, avatar)', () => {
    const res = hydrateProfileWidget({
      widgetId: 'Profile1',
      widget: { id: 'Profile1', type: 'Profile' } as any,
      type: 'Profile',
      merged: {},
      catalogDefaults: {},
      instanceConfig: {
        author: 'Alias Author',
        snippet: 'Alias Snippet',
        avatar: 'https://example.com/custom-avatar.jpg',
      },
      context: { widgetData: {} } as any,
      spec,
      mapper,
      blogLocale: 'en',
      blogTimeZone: 'UTC',
      normalizedPages: [],
      normalizedLabels: [],
      normalizedPosts: [],
      activePosts: [],
      headerData: {},
      blog1: {},
      blogAuthor: baseAuthor,
    })

    expect(res.displayname).toBe('Alias Author')
    expect(res.aboutme).toBe('Alias Snippet')
    expect(res.authorPhoto.image).toBe('https://example.com/custom-avatar.jpg')
    expect(res.authorPhoto.alt).toBe('Alias Author')
  })

  it('hydrates HTML and Text widgets from templateSettings and instanceConfig', () => {
    const res = hydrateContentWidget({
      widgetId: 'HTML1',
      widget: { id: 'HTML1', type: 'HTML' } as any,
      type: 'HTML',
      merged: {},
      catalogDefaults: {},
      templateSettings: {
        content: '<p>Template HTML Content</p>',
      },
      context: { widgetData: {} } as any,
      spec,
      mapper,
      blogLocale: 'en',
      blogTimeZone: 'UTC',
      normalizedPages: [],
      normalizedLabels: [],
      normalizedPosts: [],
      activePosts: [],
      headerData: {},
      blog1: {},
      blogAuthor: baseAuthor,
    })

    expect(res.content).toBe('<p>Template HTML Content</p>')
  })

  it('hydrates Image widget with sourceUrl, caption, and alt', () => {
    const res = hydrateImageWidget({
      widgetId: 'Image1',
      widget: { id: 'Image1', type: 'Image' } as any,
      type: 'Image',
      merged: {},
      catalogDefaults: {},
      templateSettings: {
        sourceUrl: 'https://example.com/banner.png',
        caption: 'Header Banner',
      },
      context: { widgetData: {} } as any,
      spec,
      mapper,
      blogLocale: 'en',
      blogTimeZone: 'UTC',
      normalizedPages: [],
      normalizedLabels: [],
      normalizedPosts: [],
      activePosts: [],
      headerData: {},
      blog1: {},
      blogAuthor: baseAuthor,
    })

    expect(res.sourceUrl).toBe('https://example.com/banner.png')
    expect(res.caption).toBe('Header Banner')
    expect(res.alt).toBe('Header Banner')
  })

  it('hydrates FeaturedPost widget with canonical v2 posts array and resolves by postId', () => {
    const samplePosts = [
      { id: '101', title: 'First Post', url: '/post-1.html', snippets: { short: 'Short 1', long: 'Long 1' } },
      { id: '202', title: 'Target Featured Post', url: '/post-2.html', snippets: { short: 'Short 2', long: 'Long 2' } },
    ] as any[]

    const res = hydrateFeaturedPostWidget({
      widgetId: 'FeaturedPost1',
      widget: { id: 'FeaturedPost1', type: 'FeaturedPost' } as any,
      type: 'FeaturedPost',
      merged: {},
      catalogDefaults: {},
      instanceConfig: {
        postId: '202',
        showSnippet: true,
        showFirstImage: true,
      },
      context: { widgetData: {} } as any,
      spec,
      mapper,
      blogLocale: 'en',
      blogTimeZone: 'UTC',
      normalizedPages: [],
      normalizedLabels: [],
      normalizedPosts: samplePosts,
      activePosts: samplePosts,
      headerData: {},
      blog1: {},
      blogAuthor: baseAuthor,
    })

    expect(res.posts).toHaveLength(1)
    expect(res.posts[0].id).toBe('202')
    expect(res.posts[0].title).toBe('Target Featured Post')
    expect(res.postDisplay.showSnippet).toBe(true)
    expect(res.postDisplay.showFeaturedImage).toBe(true)
    expect(res.postId).toBe('202')
    expect(res.postTitle).toBe('Target Featured Post')
  })

  it('dispatches widget hydration cleanly for all supported types', () => {
    const res = dispatchWidgetHydration({
      widgetId: 'Text1',
      widget: { id: 'Text1', type: 'Text' } as any,
      type: 'Text',
      merged: { content: 'Text content' },
      catalogDefaults: {},
      context: { widgetData: {} } as any,
      spec,
      mapper,
      blogLocale: 'en',
      blogTimeZone: 'UTC',
      normalizedPages: [],
      normalizedLabels: [],
      normalizedPosts: [],
      activePosts: [],
      headerData: {},
      blog1: {},
      blogAuthor: baseAuthor,
    })

    expect(res.content).toBe('Text content')
  })

  it('filters Label widget labels when showType is USER_SELECTED and preserves sorting', () => {
    const sampleLabels = [
      { name: 'api', count: 2, url: '/search/label/api' },
      { name: 'blogger', count: 22, url: '/search/label/blogger' },
      { name: 'bots', count: 3, url: '/search/label/bots' },
      { name: 'css', count: 3, url: '/search/label/css' },
      { name: 'tutorial', count: 6, url: '/search/label/tutorial' },
    ]

    const baseCtx = {
      widgetId: 'Label1',
      widget: { id: 'Label1', type: 'Label' } as any,
      type: 'Label',
      merged: {},
      catalogDefaults: {},
      context: { widgetData: {} } as any,
      spec,
      mapper,
      blogLocale: 'en',
      blogTimeZone: 'UTC',
      normalizedPages: [],
      normalizedLabels: sampleLabels,
      normalizedPosts: [],
      activePosts: [],
      headerData: {},
      blog1: {},
      blogAuthor: baseAuthor,
    }

    const alphaFiltered = hydrateLabelWidget({
      ...baseCtx,
      templateSettings: {
        showType: 'USER_SELECTED',
        selectedLabelsList: 'tutorial, bots, nonexistent, blogger',
        sorting: 'ALPHA',
      },
    })
    expect(alphaFiltered.labels.map((l: any) => l.name)).toEqual(['blogger', 'bots', 'tutorial'])

    const freqFiltered = hydrateLabelWidget({
      ...baseCtx,
      templateSettings: {
        showType: 'USER_SELECTED',
        selectedLabelsList: 'tutorial, bots, blogger',
        sorting: 'FREQUENCY',
      },
    })
    expect(freqFiltered.labels.map((l: any) => l.name)).toEqual(['blogger', 'tutorial', 'bots'])

    const emptySelected = hydrateLabelWidget({
      ...baseCtx,
      templateSettings: {
        showType: 'USER_SELECTED',
        selectedLabelsList: '',
      },
    })
    expect(emptySelected.labels).toEqual([])
  })
})

describe('resolveBloggerContext with Profile widget', () => {
  it('resolves Profile1 with blog author in template context', async () => {
    const templateXml = `
      <html>
        <body>
          <b:section id='sidebar'>
            <b:widget id='Profile1' type='Profile' version='2'/>
          </b:section>
        </body>
      </html>
    `
    const ctx = await resolveBloggerContext({
      view: 'homepage',
      templateXml,
      offline: true,
      config: {
        widgets: {
          Profile1: {
            title: 'About Me',
            displayname: 'Iveth',
            aboutme: 'Bio text',
            location: 'Babahoyo, Ecuador',
          },
        },
      },
    })

    const profile = ctx.widgetData.Profile1
    expect(profile).toBeDefined()
    expect(profile.title).toBe('About Me')
    expect(profile.displayname).toBe('Iveth')
    expect(profile.aboutme).toBe('Bio text')
    expect(profile.location).toBe('Babahoyo, Ecuador')
    expect(profile.authorPhoto).toBeDefined()
    expect(profile.showaboutme).toBe(true)
    expect(profile.showlocation).toBe(true)

    // Layouts v3 global widgets collection
    expect(ctx.widgets.Profile1).toBeDefined()
    expect(ctx.widgets.Profile1.id).toBe('Profile1')
    expect(ctx.widgets.Profile1.sectionId).toBe('sidebar')
    expect(ctx.widgets.Profile1.title).toBe('About Me')
    expect(Array.isArray(ctx.widgets.Profile)).toBe(true)
    expect(ctx.widgets.Profile[0].id).toBe('Profile1')
  })
})
