import { describe, expect, it } from 'vitest'
import {
  createDefaultBlogConfig,
  formatBloggerDate,
  formatIcuDate,
  resolveBloggerContext,
  validateBlogConfig,
} from '../src/index.js'

describe('blogger blog configuration & context subsystem', () => {
  describe('createDefaultBlogConfig', () => {
    it('returns valid default configuration conforming to Blogger specifications', () => {
      const config = createDefaultBlogConfig()
      expect(config.blog?.locale).toBe('en')
      expect(config.blog?.adultContent).toBe(false)
      expect(config.blog?.isPrivate).toBe(false)
      expect(config.blog?.postsPerPage).toBe(7)
      expect(config.blog?.commentLocation).toBe('EMBEDDED')
      expect(config.blog?.titleAndEnclosureLinks).toBe(true)

      const validation = validateBlogConfig(config)
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })
  })

  describe('validateBlogConfig', () => {
    it('rejects non-object configurations', () => {
      expect(validateBlogConfig(null).valid).toBe(false)
      expect(validateBlogConfig('invalid').valid).toBe(false)
      expect(validateBlogConfig([]).valid).toBe(false)
    })

    it('validates searchDescription 150 character limit', () => {
      const validConfig = {
        entries: {
          post123: {
            searchDescription: 'Valid short description',
          },
        },
      }
      expect(validateBlogConfig(validConfig).valid).toBe(true)

      const invalidConfig = {
        entries: {
          post123: {
            searchDescription: 'A'.repeat(151),
          },
        },
      }
      const res = validateBlogConfig(invalidConfig)
      expect(res.valid).toBe(false)
      expect(res.errors.some(e => e.code === 'SEARCH_DESCRIPTION_TOO_LONG')).toBe(true)
    })

    it('validates entry link as optional string', () => {
      expect(validateBlogConfig({ entries: { e1: { link: 'https://example.com' } } }).valid).toBe(true)
      const res = validateBlogConfig({ entries: { e1: { link: 12345 as any } } })
      expect(res.valid).toBe(false)
      expect(res.errors.some(e => e.code === 'INVALID_ENTRY_LINK_TYPE')).toBe(true)
    })

    it('validates commentFormMessage 4096 character limit', () => {
      const validConfig = {
        blog: {
          commentFormMessage: 'Leave a thoughtful comment.',
        },
      }
      expect(validateBlogConfig(validConfig).valid).toBe(true)

      const invalidConfig = {
        blog: {
          commentFormMessage: 'X'.repeat(4097),
        },
      }
      const res = validateBlogConfig(invalidConfig)
      expect(res.valid).toBe(false)
      expect(res.errors.some(e => e.code === 'COMMENT_FORM_MESSAGE_TOO_LONG')).toBe(true)
    })

    it('validates commentMode enum', () => {
      for (const mode of ['ALLOWED', 'RESTRICTED', 'DISABLED'] as const) {
        expect(validateBlogConfig({ entries: { e1: { commentMode: mode } } }).valid).toBe(true)
      }
      const res = validateBlogConfig({ entries: { e1: { commentMode: 'INVALID_MODE' as any } } })
      expect(res.valid).toBe(false)
      expect(res.errors.some(e => e.code === 'INVALID_COMMENT_MODE')).toBe(true)
    })

    it('validates commentLocation enum', () => {
      for (const loc of ['EMBEDDED', 'FULL_PAGE', 'POPUP', 'HIDDEN'] as const) {
        expect(validateBlogConfig({ blog: { commentLocation: loc } }).valid).toBe(true)
      }
      const res = validateBlogConfig({ blog: { commentLocation: 'FLOATING' as any } })
      expect(res.valid).toBe(false)
      expect(res.errors.some(e => e.code === 'INVALID_COMMENT_LOCATION')).toBe(true)
    })

    it('validates blog locale against the 61 canonical Blogger locales', () => {
      expect(validateBlogConfig({ blog: { locale: 'es' } }).valid).toBe(true)
      expect(validateBlogConfig({ blog: { locale: 'en' } }).valid).toBe(true)
      expect(validateBlogConfig({ blog: { locale: 'fr' } }).valid).toBe(true)
      expect(validateBlogConfig({ blog: { locale: 'ja' } }).valid).toBe(true)

      const invalid = validateBlogConfig({ blog: { locale: 'unsupported-xyz' } })
      expect(invalid.valid).toBe(false)
      expect(invalid.errors.some(e => e.code === 'UNKNOWN_LOCALE')).toBe(true)
    })

    it('validates widget settings against catalogs/settings.json', () => {
      const validWidgetConfig = {
        widgets: {
          Blog1: {
            showAuthor: true,
            authorLabel: 'Escrito por',
            postsPerAd: 3,
          },
        },
      }
      expect(validateBlogConfig(validWidgetConfig).valid).toBe(true)

      const invalidTypeConfig = {
        widgets: {
          Blog1: {
            showAuthor: 'should-be-boolean' as any,
          },
        },
      }
      const resType = validateBlogConfig(invalidTypeConfig)
      expect(resType.valid).toBe(false)
      expect(resType.errors.some(e => e.code === 'INVALID_SETTING_TYPE')).toBe(true)

      const unknownSettingConfig = {
        widgets: {
          Blog1: {
            nonExistentSetting: 123,
          },
        },
      }
      const resUnknown = validateBlogConfig(unknownSettingConfig)
      expect(resUnknown.valid).toBe(false)
      expect(resUnknown.errors.some(e => e.code === 'UNKNOWN_WIDGET_SETTING')).toBe(true)
    })
  })

  describe('formatIcuDate & formatBloggerDate', () => {
    const testDate = new Date('2026-11-01T08:41:30.000Z')

    it('formats date using Unicode ICU TR35 patterns with single-pass replacement', () => {
      expect(formatIcuDate(testDate, 'yyyy', 'en')).toBe('2026')
      expect(formatIcuDate(testDate, 'd.M.yy', 'en')).toBe('1.11.26')
      expect(formatIcuDate(testDate, 'HH:mm', 'en')).toMatch(/\d{2}:\d{2}/)
    })

    it('preserves single-quoted literals in date format strings', () => {
      const formatted = formatIcuDate(testDate, 'EEEE, MMMM dd, yyyy \'a las\' h:mm:ss a', 'es')
      expect(formatted).toContain('a las')
    })

    it('falls back to default long date formatting when pattern is omitted', () => {
      const res = formatBloggerDate('2026-11-01T08:41:30.000Z', 'es')
      expect(res.date).toBeTruthy()
      expect(res.timestamp).toBe(testDate.getTime())
    })
  })

  describe('resolveBloggerContext with BloggerBlogConfiguration', () => {
    it('applies global blog settings (adultContent, isPrivate, analytics, postsPerPage)', async () => {
      const context = await resolveBloggerContext({
        offline: true,
        config: {
          blog: {
            adultContent: true,
            isPrivate: true,
            analyticsMeasurementId: 'G-TEST123456',
            postsPerPage: 5,
            commentLocation: 'POPUP',
            commentFormMessage: 'Bienvenidos a los comentarios',
          },
        },
      })

      expect(context.blog.adultContent).toBe(true)
      expect(context.blog.isPrivate).toBe(true)
      expect(context.blog.isPrivateBlog).toBe(true)
      expect(context.blog.analyticsAccountNumber).toBe('G-TEST123456')
      expect(context.blog.analytics4).toBe(true)
      expect(context.widgetData.Blog1.numPosts).toBe(5)
      expect(context.widgetData.Blog1.showCmtPopup).toBe(true)
      expect(context.widgetData.Blog1.embedCommentForm).toBe(false)
      expect(context.widgetData.Blog1.messages.blogComment).toBe('Bienvenidos a los comentarios')
      expect(context.messages.blogComment).toBe('Bienvenidos a los comentarios')
    })

    it('applies per-entry searchDescription and commentMode triads', async () => {
      const postId = '8389032230243957219'
      const context = await resolveBloggerContext({
        offline: true,
        view: 'post',
        targetId: postId,
        config: {
          entries: {
            [postId]: {
              searchDescription: 'Custom meta description for post 1001',
              commentMode: 'RESTRICTED',
            },
          },
        },
      })

      const post = context.widgetData.Blog1.posts[0]
      expect(post.snippets.short).toBe('Custom meta description for post 1001')
      expect(post.allowComments).toBe(true)
      expect(post.allowNewComments).toBe(false)
      expect(context.view.description).toBe('Custom meta description for post 1001')
      expect(context.blog.metaDescription).toBe('Custom meta description for post 1001')
    })

    it('binds configured title link to post.link', async () => {
      const postId = '8389032230243957219'
      const context = await resolveBloggerContext({
        offline: true,
        view: 'post',
        targetId: postId,
        config: {
          entries: {
            [postId]: {
              link: 'https://example.com/external-article',
            },
          },
        },
      })

      const post = context.widgetData.Blog1.posts[0]
      expect(post.link).toBe('https://example.com/external-article')
    })

    it('disables comments entirely when commentLocation is HIDDEN or commentMode is DISABLED', async () => {
      const postId = '8389032230243957219'
      const context = await resolveBloggerContext({
        offline: true,
        view: 'post',
        targetId: postId,
        config: {
          entries: {
            [postId]: {
              commentMode: 'DISABLED',
            },
          },
        },
      })

      const post = context.widgetData.Blog1.posts[0]
      expect(post.allowComments).toBe(false)
      expect(post.allowNewComments).toBe(false)
    })

    it('ensures explicit overrides take precedence over BloggerBlogConfiguration', async () => {
      const context = await resolveBloggerContext({
        offline: true,
        config: {
          blog: {
            adultContent: false,
            postsPerPage: 5,
          },
        },
        overrides: {
          blog: {
            adultContent: true,
          },
          widgetData: {
            Blog1: {
              numPosts: 10,
            },
          },
        },
      })

      expect(context.blog.adultContent).toBe(true)
      expect(context.widgetData.Blog1.numPosts).toBe(10)
    })

    it('merges widget settings into context.widgetData and context.widgets', async () => {
      const context = await resolveBloggerContext({
        offline: true,
        config: {
          widgets: {
            Blog1: {
              showAuthor: false,
              authorLabel: 'Par',
            },
            Header1: {
              showDescription: false,
            },
          },
        },
      })

      expect(context.widgetData.Blog1.showAuthor).toBe(false)
      expect(context.widgetData.Blog1.authorLabel).toBe('Par')
      expect(context.widgetData.Header1.showDescription).toBe(false)
    })
  })
})
