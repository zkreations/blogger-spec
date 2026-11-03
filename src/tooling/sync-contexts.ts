/* eslint-disable no-console */
import type { BloggerViewId } from '../types.js'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import addFormats from 'ajv-formats'
import Ajv2020 from 'ajv/dist/2020.js'
import { resolveHamletContext } from '../../tests/helpers/hamlet-provider.js'
import { getWorkspacePaths } from '../paths.js'

const CANONICAL_VIEWS: readonly BloggerViewId[] = [
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
  'layout_mode',
] as const

function canonicalizeEnglishContext(context: Record<string, any>, viewId: BloggerViewId): Record<string, any> {
  const blog = context.blog || {}
  blog.locale = 'en'
  blog.language = 'en'
  blog.title = 'Hamlet'
  blog.description = 'Theme for development'
  blog.metaDescription = 'Theme for development'
  blog.searchUrl = 'https://hamlet.zkreations.com/search'
  blog.homepageUrl = 'https://hamlet.zkreations.com/'
  blog.adsenseClientId = 'ca-pub-1234567890123456'
  blog.adsenseHostId = 'ca-host-pub-1556223355139109'

  const pageTitles: Record<BloggerViewId, string> = {
    homepage: 'Hamlet',
    post: 'The Importance of Environmental Care - Hamlet',
    static_page: 'Typography - Hamlet',
    label_search: 'Posts with label biodiversity - Hamlet',
    archive_yearly: 'Archive 2023 - Hamlet',
    archive_monthly: 'Archive November 2023 - Hamlet',
    archive_weekly_daily: 'Archive November 17, 2023 - Hamlet',
    post_listing: 'Older Posts - Hamlet',
    search_query: 'Search Results for The - Hamlet',
    error_404: 'Page Not Found - Hamlet',
    preview: 'Preview - Hamlet',
    layout_mode: 'Layout Mode - Hamlet',
  }

  blog.pageTitle = pageTitles[viewId] || 'Hamlet'
  blog.pageName = blog.pageTitle
  context.blog = blog

  if (viewId === 'error_404' && context.view) {
    context.view.type = 'error'
  }

  if (context.view?.search) {
    if (viewId === 'post_listing') {
      context.view.search.resultsMessage = 'Showing older posts'
      context.view.search.resultsMessageHtml = 'Showing older posts'
    }
    else if (viewId === 'search_query') {
      context.view.search.resultsMessage = 'Showing posts matching the search for The'
      context.view.search.resultsMessageHtml = 'Showing posts matching the search for <b>The</b>'
    }
  }

  context.skin = {
    vars: {
      keycolor: '#1a73e8',
      body_font: '16px Arial, sans-serif',
    },
  }

  context.messages = context.messages || {}
  context.messages.location = 'Location'

  context.widgets = {
    Blog: [{ id: 'Blog1', type: 'Blog', title: 'Blog Posts', sectionId: 'content' }],
    Header: [{ id: 'Header1', type: 'Header', title: 'Hamlet', description: 'Theme for development', sectionId: 'header' }],
    PageList: [{ id: 'PageList1', type: 'PageList', title: 'Pages', sectionId: 'sidebar' }],
    Label: [{ id: 'Label1', type: 'Label', title: 'Labels', sectionId: 'sidebar' }],
    BlogArchive: [{ id: 'BlogArchive1', type: 'BlogArchive', title: 'Blog Archive', sectionId: 'sidebar' }],
    PopularPosts: [{ id: 'PopularPosts1', type: 'PopularPosts', title: 'Popular Posts', sectionId: 'sidebar' }],
    LinkList: [{ id: 'LinkList1', type: 'LinkList', title: 'Useful Links', sectionId: 'sidebar' }],
    ContactForm: [{ id: 'ContactForm1', type: 'ContactForm', title: 'Contact Form', sectionId: 'sidebar' }],
    Stats: [{ id: 'Stats1', type: 'Stats', title: 'Total Pageviews', sectionId: 'footer' }],
    Attribution: [{ id: 'Attribution1', type: 'Attribution', title: 'Attribution', sectionId: 'footer' }],
    Profile: [{ id: 'Profile1', type: 'Profile', title: 'About Me', sectionId: 'sidebar' }],
    HTML: [{ id: 'HTML1', type: 'HTML', title: 'Custom HTML', sectionId: 'sidebar' }],
    BlogSearch: [{ id: 'BlogSearch1', type: 'BlogSearch', title: 'Search This Blog', sectionId: 'sidebar' }],
    FeaturedPost: [{ id: 'FeaturedPost1', type: 'FeaturedPost', title: 'Featured Post', sectionId: 'sidebar' }],
    Translate: [{ id: 'Translate1', type: 'Translate', title: 'Translate', sectionId: 'sidebar' }],
  }

  const wd = context.widgetData || {}

  if (wd.Blog1) {
    wd.Blog1.title = 'Blog Posts'
    if (Array.isArray(wd.Blog1.allBylineItems)) {
      wd.Blog1.allBylineItems = [
        { name: 'share', label: 'Share' },
        { name: 'author', label: 'By' },
        { name: 'timestamp', label: 'at' },
        { name: 'comments', label: 'Comments' },
        { name: 'icons', label: 'Icons' },
        { name: 'labels', label: 'Labels' },
        { name: 'location', label: 'Location' },
      ]
    }
  }

  if (wd.PageList1) {
    wd.PageList1.title = 'Pages'
  }

  if (wd.Label1) {
    wd.Label1.title = 'Labels'
  }

  wd.BlogArchive1 = {
    title: 'Blog Archive',
    style: 'HIERARCHY',
    data: [
      {
        'name': '2023',
        'url': 'https://hamlet.zkreations.com/2023/',
        'post-count': 3,
        'expclass': 'expanded',
        'toggleId': 'BlogArchive1_2023',
        'posts': [],
        'data': [
          {
            'name': 'November',
            'url': 'https://hamlet.zkreations.com/2023/11/',
            'post-count': 3,
            'expclass': 'expanded',
            'toggleId': 'BlogArchive1_2023_11',
            'posts': [
              {
                title: 'The Importance of Environmental Care',
                url: 'https://hamlet.zkreations.com/2023/04/the-importance-of-environmental-care.html',
              },
              {
                title: 'Submerged in Beauty',
                url: 'https://hamlet.zkreations.com/2023/04/submerged-in-beauty.html',
              },
              {
                title: 'The Mysterious Black House',
                url: 'https://hamlet.zkreations.com/2023/04/the-mysterious-black-house.html',
              },
            ],
          },
        ],
      },
    ],
  }

  wd.PopularPosts1 = {
    title: 'Popular Posts',
    postDisplay: {
      showSnippet: true,
      showTitle: true,
      showAuthor: true,
    },
    posts: [
      {
        id: '8389032230243957219',
        title: 'The Importance of Environmental Care',
        url: 'https://hamlet.zkreations.com/2023/04/the-importance-of-environmental-care.html',
        absoluteUrl: 'https://hamlet.zkreations.com/2023/04/the-importance-of-environmental-care.html',
        body: '<p>Our planet is facing a crisis. From rising temperatures to devastating natural disasters, it\'s clear that human activity is taking a toll on the environment.</p>',
        date: 'April 22, 2023',
        lastUpdated: 'November 1, 2026',
        featuredImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200',
        thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=150',
        author: {
          name: 'Iveth',
          profileUrl: 'https://www.blogger.com/profile/05162121526782264118',
          aboutMe: 'Theme designer and web developer.',
          authorPhoto: {
            url: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh2_arOdF_6xLjOEaKR63hFWGqRcV9DoUrWdx1TLNCPeA29Gp1z1A1CzQSTLSbm28yBf4heS79dKKGO7KSn_FqIVYVNE6RFlwD_MZZecjOK__-RC04tgn5vHo_qdvA57UiBnOvISHO8j5zjzmV0UcZrgg0gx_ClEEpSJXZShICyPhY6iA/s220/IMG_20230925_145047.jpg',
            width: 80,
            height: 80,
            alt: 'Iveth',
          },
        },
        labels: [
          { name: 'biodiversity', url: 'https://hamlet.zkreations.com/search/label/biodiversity' },
          { name: 'nature', url: 'https://hamlet.zkreations.com/search/label/nature' },
        ],
        snippets: {
          short: 'Our planet is facing a crisis. From rising temperatures to devastating...',
          long: 'Our planet is facing a crisis. From rising temperatures to devastating natural disasters, it\'s clear that human activity is taking a toll on the environment.',
        },
        numberOfComments: 2,
        allowComments: true,
        allowNewComments: true,
        showThreadedComments: true,
        hasJumpLink: true,
        comments: [
          {
            id: '7495685752728051999',
            author: 'Iveth',
            authorAvatarSrc: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh2_arOdF_6xLjOEaKR63hFWGqRcV9DoUrWdx1TLNCPeA29Gp1z1A1CzQSTLSbm28yBf4heS79dKKGO7KSn_FqIVYVNE6RFlwD_MZZecjOK__-RC04tgn5vHo_qdvA57UiBnOvISHO8j5zjzmV0UcZrgg0gx_ClEEpSJXZShICyPhY6iA/s220/IMG_20230925_145047.jpg',
            authorUrl: 'https://www.blogger.com/profile/05162121526782264118',
            authorUserType: 'BLOGGER',
            body: '<p>Thank you for sharing your thoughts! I believe that awareness is the first step.</p>',
            timestamp: 'November 1, 2026 at 5:58 PM',
            timestampValue: 1793584722190,
            timestampAbs: 1793584722,
            inReplyTo: '',
            isDeleted: false,
            adminClass: 'blog-admin pid-672146995',
            deleteUrl: 'https://www.blogger.com/comment/delete/5408826600056783247/7495685752728051999',
            url: 'https://hamlet.zkreations.com/2023/04/the-importance-of-environmental-care.html?showComment=1793584722190#c7495685752728051999',
            anchorName: 'c7495685752728051999',
          },
        ],
        commentFormIframeSrc: 'https://www.blogger.com/comment/frame/5408826600056783247?po=8389032230243957219&hl=en&origin=https%3A%2F%2Fhamlet.zkreations.com',
      },
    ],
  }

  wd.Profile1 = {
    title: 'About Me',
    team: false,
    displayname: 'Iveth',
    aboutme: 'Theme designer and web developer for Blogger Layouts v3.',
    location: 'United States',
    showlocation: true,
    showaboutme: true,
    hasgoogleprofile: true,
    userUrl: 'https://www.blogger.com/profile/05162121526782264118',
    authorPhoto: {
      url: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh2_arOdF_6xLjOEaKR63hFWGqRcV9DoUrWdx1TLNCPeA29Gp1z1A1CzQSTLSbm28yBf4heS79dKKGO7KSn_FqIVYVNE6RFlwD_MZZecjOK__-RC04tgn5vHo_qdvA57UiBnOvISHO8j5zjzmV0UcZrgg0gx_ClEEpSJXZShICyPhY6iA/s220/IMG_20230925_145047.jpg',
      width: 80,
      height: 80,
    },
  }

  wd.HTML1 = {
    title: 'Custom HTML',
    content: '<div class="widget-content">Sample custom HTML content</div>',
  }

  wd.LinkList1 = {
    title: 'Useful Links',
    shownum: 3,
    sorting: 'none',
    links: [
      { name: 'Home', target: 'https://hamlet.zkreations.com/' },
      { name: 'Typography', target: 'https://hamlet.zkreations.com/p/typography.html' },
      { name: 'Contact', target: 'https://hamlet.zkreations.com/p/contact.html' },
    ],
  }

  wd.BlogSearch1 = {
    title: 'Search This Blog',
  }

  wd.ContactForm1 = {
    title: 'Contact Form',
    submitUrl: 'https://www.blogger.com/contact-form.do',
    contactFormNameMsg: 'Name',
    contactFormEmailMsg: 'Email',
    contactFormMessageMsg: 'Message',
    contactFormSendMsg: 'Send',
    contactFormSendingMsg: 'Sending...',
    contactFormSentMsg: 'Your message has been sent.',
    contactFormNotSentMsg: 'Could not send message. Please try again later.',
    contactFormMessageSendingMsg: 'Sending...',
    contactFormMessageSentMsg: 'Your message has been sent.',
    contactFormMessageNotSentMsg: 'Could not send message. Please try again later.',
    contactFormEmptyMessageMsg: 'Message field cannot be empty.',
    contactFormInvalidEmailMsg: 'A valid email is required.',
  }

  wd.Stats1 = {
    title: 'Total Pageviews',
    showAnimatedCounter: true,
    showGraphicalCounter: false,
    showSparkline: true,
    statsUrl: '//www.blogger.com/stats.g',
    totalVisits: 125430,
  }

  wd.Translate1 = {
    title: 'Translate',
    layout: 'VERTICAL',
    pageLanguage: 'en',
  }

  wd.Attribution1 = {
    title: 'Attribution',
    copyright: 'Copyright 2026 Hamlet. Powered by Blogger.',
    bloggerUrl: 'https://www.blogger.com',
    imageAuthor: '',
  }

  context.widgetData = wd
  return context
}

export async function syncMockContexts(): Promise<boolean> {
  const paths = getWorkspacePaths()
  const contextsDir = join(paths.fixtures, 'contexts')
  const schemaPath = join(paths.schemas, 'mock-context.schema.json')

  console.log(`=== Synchronizing Canonical Mock Contexts from Hamlet Feeds ===\n`)
  console.log(`Target directory: ${contextsDir}\n`)

  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'))
  const ajv = new (Ajv2020 as any)({ allErrors: true, strict: false })
  ;(addFormats as any)(ajv)
  const validate = ajv.compile(schema)

  let allSuccess = true

  for (const viewId of CANONICAL_VIEWS) {
    try {
      const rawContext = await resolveHamletContext(viewId)
      const context = canonicalizeEnglishContext(rawContext, viewId)

      const isValid = validate(context)
      if (!isValid) {
        console.error(`  [FAIL] Schema validation failed for view: ${viewId}`)
        console.error(validate.errors)
        allSuccess = false
        continue
      }

      const filePath = join(contextsDir, `${viewId}.json`)
      const formattedJson = `${JSON.stringify(context, null, 2)}\n`.replace(/\u202F/g, '\\u202f')
      writeFileSync(filePath, formattedJson, 'utf-8')
      console.log(`  [PASS] Generated context fixture: ${viewId}.json`)
    }
    catch (err: any) {
      console.error(`  [ERROR] Failed to generate context for ${viewId}:`, err.message)
      allSuccess = false
    }
  }

  if (allSuccess) {
    console.log(`\n[SUCCESS] Successfully synchronized all 12 canonical mock contexts!`)
  }
  else {
    console.error(`\n[ERROR] One or more mock contexts failed validation or generation.`)
  }

  return allSuccess
}

if (process.argv[1] && (process.argv[1].endsWith('sync-contexts.ts') || process.argv[1].endsWith('sync-contexts.js'))) {
  void syncMockContexts().then((success) => {
    if (!success) {
      process.exit(1)
    }
  })
}
