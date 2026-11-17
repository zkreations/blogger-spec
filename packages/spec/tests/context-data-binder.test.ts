import { describe, expect, it } from 'vitest'
import { getSpecCatalog } from '../src/catalogs/index.js'
import {
  bindWidgetSettingsToData,
  getDeepDataProperty,
  parseDataPathSegments,
  setDeepDataProperty,
} from '../src/context/data-binder.js'

describe('context-data-binder', () => {
  const spec = getSpecCatalog()

  describe('parseDataPathSegments', () => {
    it('parses standard dot-separated data paths', () => {
      expect(parseDataPathSegments('data:postDisplay.showFeaturedImage')).toEqual([
        'postDisplay',
        'showFeaturedImage',
      ])
      expect(parseDataPathSegments('data:allBylineItems.author.label')).toEqual([
        'allBylineItems',
        'author',
        'label',
      ])
      expect(parseDataPathSegments('copyright')).toEqual(['copyright'])
    })

    it('parses array bracket index notation into numeric segments', () => {
      expect(parseDataPathSegments('data:links[0].title')).toEqual(['links', '0', 'title'])
      expect(parseDataPathSegments('items[12]')).toEqual(['items', '12'])
    })
  })

  describe('setDeepDataProperty & getDeepDataProperty', () => {
    it('sets and gets flat and deeply nested properties', () => {
      const target: Record<string, any> = { existing: 'preserved' }

      setDeepDataProperty(target, 'data:postDisplay.showFeaturedImage', true)
      setDeepDataProperty(target, 'data:postDisplay.showSnippet', false)

      expect(target.existing).toBe('preserved')
      expect(target.postDisplay).toEqual({
        showFeaturedImage: true,
        showSnippet: false,
      })
      expect(getDeepDataProperty(target, 'data:postDisplay.showFeaturedImage')).toBe(true)
      expect(getDeepDataProperty(target, 'data:postDisplay.missing')).toBeUndefined()
    })

    it('instantiates arrays when encountering numeric segments', () => {
      const target: Record<string, any> = {}

      setDeepDataProperty(target, 'data:links[0].title', 'Home')
      expect(Array.isArray(target.links)).toBe(true)
      expect(target.links[0]).toEqual({ title: 'Home' })
      expect(getDeepDataProperty(target, 'data:links[0].title')).toBe('Home')
    })
  })

  describe('bindWidgetSettingsToData', () => {
    it('binds PopularPosts catalog defaults and exposes canonical postDisplay', () => {
      const bound = bindWidgetSettingsToData({}, 'PopularPosts', spec)

      expect(bound.numItemsToShow).toBe(10)
      expect(bound.showSnippets).toBe(true)
      expect(bound.showThumbnails).toBe(true)
      expect(bound.postDisplay).toEqual({
        showTitle: true,
        showAuthor: true,
        showSnippet: true,
        showFeaturedImage: true,
      })
    })

    it('projects custom PopularPosts settings into postDisplay and limit', () => {
      const bound = bindWidgetSettingsToData(
        {
          numItemsToShow: 5,
          showSnippets: false,
          showThumbnails: true,
        },
        'PopularPosts',
        spec,
      )

      expect(bound.numItemsToShow).toBe(5)
      expect(bound.showSnippets).toBe(false)
      expect(bound.showThumbnails).toBe(true)
      expect(bound.postDisplay).toEqual({
        showTitle: true,
        showAuthor: true,
        showSnippet: false,
        showFeaturedImage: true,
      })
    })

    it('binds FeaturedPost settings into canonical postDisplay', () => {
      const bound = bindWidgetSettingsToData(
        {
          showFirstImage: false,
          showSnippet: false,
        },
        'FeaturedPost',
        spec,
      )

      expect(bound.postDisplay.showFeaturedImage).toBe(false)
      expect(bound.postDisplay.showSnippet).toBe(false)
      expect(bound.postDisplay.showTitle).toBe(true)
    })

    it('binds Attribution settings according to bound_runtime_data', () => {
      const bound = bindWidgetSettingsToData(
        { copyright: '© 2026 Test' },
        'Attribution',
        spec,
      )

      expect(bound.copyright).toBe('© 2026 Test')
    })
  })
})
