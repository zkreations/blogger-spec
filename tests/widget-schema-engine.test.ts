import { describe, expect, it } from 'vitest'
import { getSpecCatalog } from '../src/catalogs/index.js'
import {
  evaluateWidgetCondition,
  instantiateWidgetFromCatalog,
} from '../src/context/widget-schema-engine.js'

describe('widget-schema-engine', () => {
  const spec = getSpecCatalog()

  describe('condition evaluation', () => {
    it('evaluates team == false condition correctly', () => {
      expect(evaluateWidgetCondition('team == false', { team: false })).toBe(true)
      expect(evaluateWidgetCondition('team == false', { team: true })).toBe(false)
      expect(evaluateWidgetCondition('team == false', {})).toBe(true)
    })

    it('evaluates team == true condition correctly', () => {
      expect(evaluateWidgetCondition('team == true', { team: true })).toBe(true)
      expect(evaluateWidgetCondition('team == true', { team: false })).toBe(false)
      expect(evaluateWidgetCondition('team == true', {})).toBe(false)
    })

    it('evaluates google_hosted_image condition', () => {
      expect(evaluateWidgetCondition('google_hosted_image', { sourceUrl: 'https://blogger.googleusercontent.com/img.jpg' })).toBe(true)
      expect(evaluateWidgetCondition('google_hosted_image', { sourceUrl: 'https://example.com/other.jpg' })).toBe(false)
    })
  })

  describe('universal catalog instantiation', () => {
    it('instantiates all 26 widgets with valid host metadata and titles', () => {
      const allWidgets = Object.keys(spec.getAllWidgets())
      expect(allWidgets.length).toBe(26)

      for (const type of allWidgets) {
        const widgetId = `${type}1`
        const res = instantiateWidgetFromCatalog({
          widget: { id: widgetId, type, sectionId: 'test-sec', version: 2 },
          type,
          merged: {},
          spec,
          blogLocale: 'en',
        })

        expect(res.title).toBeDefined()
        expect(typeof res.title).toBe('string')
      }
    })

    it('omits properties when condition is false (single author mode vs team mode)', () => {
      // Single-author mode (team == false)
      const single = instantiateWidgetFromCatalog({
        widget: { id: 'Profile1', type: 'Profile' },
        type: 'Profile',
        merged: { team: false, displayname: 'Iveth' },
        spec,
        blogLocale: 'en',
      })

      expect(single.displayname).toBe('Iveth')
      expect(single.authors).toBeUndefined() // authors requires team == true

      // Team mode (team == true)
      const team = instantiateWidgetFromCatalog({
        widget: { id: 'Profile1', type: 'Profile' },
        type: 'Profile',
        merged: {
          team: true,
          authors: [{ 'display-name': 'Iveth', 'userUrl': 'https://example.com' }],
        },
        spec,
        blogLocale: 'en',
      })

      expect(team.authors).toBeDefined()
      expect(team.displayname).toBeUndefined() // displayname condition is team == false
      expect(team.aboutme).toBeUndefined() // aboutme condition is team == false
    })

    it('honors unconfigured_state semantics (missing vs empty)', () => {
      const profile = instantiateWidgetFromCatalog({
        widget: { id: 'Profile1', type: 'Profile' },
        type: 'Profile',
        merged: {},
        spec,
        blogLocale: 'en',
      })

      // In catalogs/widgets.json: aboutme and location have unconfigured_state: 'missing'
      expect(profile.aboutme).toBeUndefined()
      expect(profile.location).toBeUndefined()

      // viewProfileMsg has translatable localization key -> populated
      expect(profile.viewProfileMsg).toBe('View my complete profile')
    })

    it('translates translatable properties based on blog locale', () => {
      const profileEs = instantiateWidgetFromCatalog({
        widget: { id: 'Profile1', type: 'Profile' },
        type: 'Profile',
        merged: {},
        spec,
        blogLocale: 'es',
      })

      expect(profileEs.viewProfileMsg).toBe('Ver todo mi perfil')
    })

    it('auto-maps <b:widget-setting> values to runtime properties', () => {
      // HTML widget
      const html = instantiateWidgetFromCatalog({
        widget: { id: 'HTML1', type: 'HTML' },
        type: 'HTML',
        templateSettings: { content: '<p>Custom Content</p>' },
        merged: {},
        spec,
        blogLocale: 'en',
      })
      expect(html.content).toBe('<p>Custom Content</p>')

      // Followers widget
      const followers = instantiateWidgetFromCatalog({
        widget: { id: 'Followers1', type: 'Followers' },
        type: 'Followers',
        templateSettings: { codeSnippet: '<iframe src="..."></iframe>' },
        merged: {},
        spec,
        blogLocale: 'en',
      })
      expect(followers.codeSnippet).toBe('<iframe src="..."></iframe>')

      // Stats widget with boolean settings
      const stats = instantiateWidgetFromCatalog({
        widget: { id: 'Stats1', type: 'Stats' },
        type: 'Stats',
        templateSettings: { showSparkline: true, showAnimatedCounter: false },
        merged: {},
        spec,
        blogLocale: 'en',
      })
      expect(stats.showSparkline).toBe(true)
      expect(stats.showAnimatedCounter).toBe(false)
    })

    it('normalizes developer aliases from configuration', () => {
      const profile = instantiateWidgetFromCatalog({
        widget: { id: 'Profile1', type: 'Profile' },
        type: 'Profile',
        instanceConfig: {
          author: 'Alice',
          snippet: 'Bio text',
          avatar: 'https://example.com/avatar.jpg',
        },
        merged: {},
        spec,
        blogLocale: 'en',
      })

      expect(profile.displayname).toBe('Alice')
      expect(profile.aboutme).toBe('Bio text')
      expect(profile.authorPhoto).toEqual({
        image: 'https://example.com/avatar.jpg',
        url: 'https://example.com/avatar.jpg',
        alt: '',
        width: 80,
        height: 80,
      })
    })
  })
})
