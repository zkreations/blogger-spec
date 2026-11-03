import { describe, expect, it } from 'vitest'
import { parseTemplate } from '../src/parser/template-parser.js'
import {
  deserializeWidgetSettings,
  findWidgetSettingsNode,
  hydrateWidgetSettings,
  normalizeLinkItem,
  parsePageListJson,
} from '../src/widget-settings.js'

describe('widget-settings module', () => {
  describe('normalizeLinkItem', () => {
    it('normalizes standard { title, href } objects', () => {
      expect(normalizeLinkItem({ title: 'About', href: '/about' })).toEqual({
        title: 'About',
        href: '/about',
      })
    })

    it('normalizes alternative { name, target } objects', () => {
      expect(normalizeLinkItem({ name: 'github', target: 'https://github.com' })).toEqual({
        title: 'github',
        href: 'https://github.com',
      })
    })

    it('normalizes shorthand { "Home": "/" } dictionary format', () => {
      expect(normalizeLinkItem({ Home: '/' })).toEqual({
        title: 'Home',
        href: '/',
      })
    })

    it('preserves isCurrentPage boolean flag when defined', () => {
      expect(normalizeLinkItem({ title: 'Home', href: '/', isCurrentPage: true })).toEqual({
        title: 'Home',
        href: '/',
        isCurrentPage: true,
      })
    })
  })

  describe('parsePageListJson', () => {
    it('deserializes JSON array with standard and shorthand items', () => {
      const raw = JSON.stringify([
        { title: 'Home', href: '/' },
        { Docs: '/docs' },
      ])
      const links = parsePageListJson(raw)
      expect(links).toHaveLength(2)
      expect(links[0]).toEqual({ title: 'Home', href: '/' })
      expect(links[1]).toEqual({ title: 'Docs', href: '/docs' })
    })

    it('deserializes Blogger dictionary object sorted by position', () => {
      const raw = JSON.stringify({
        c2: { title: 'Contact', href: '/contact', position: 2 },
        c0: { title: 'Home', href: '/', position: 0 },
        c1: { title: 'Blog', href: '/blog', position: 1 },
      })
      const links = parsePageListJson(raw)
      expect(links).toHaveLength(3)
      expect(links[0]!.title).toBe('Home')
      expect(links[1]!.title).toBe('Blog')
      expect(links[2]!.title).toBe('Contact')
    })

    it('handles malformed JSON gracefully', () => {
      expect(parsePageListJson('not-json')).toEqual([])
    })
  })

  describe('hydrateWidgetSettings', () => {
    it('coerces booleans, numbers, and lowercase transforms according to catalog', () => {
      const raw = {
        showAuthor: 'true',
        showTimestamp: 'no',
        numPosts: '7',
        display: 'LIST',
      }
      const hydrated = hydrateWidgetSettings(raw, 'Blog')
      expect(hydrated).toBeDefined()
      expect(hydrated!.showAuthor).toBe(true)
      expect(hydrated!.showTimestamp).toBe(false)
      expect(hydrated!.numPosts).toBe(7)
    })

    it('binds deep runtime data paths (e.g. allBylineItems.author.label)', () => {
      const raw = {
        authorLabel: 'Escrito por',
      }
      const hydrated = hydrateWidgetSettings(raw, 'Blog')
      expect(hydrated).toBeDefined()
      expect((hydrated as any).allBylineItems?.author?.label).toBe('Escrito por')
    })

    it('binds homeTitle to links[0].title', () => {
      const raw = {
        homeTitle: 'Principal',
        pageListJson: JSON.stringify([{ title: 'Home', href: '/' }, { title: 'About', href: '/about' }]),
      }
      const hydrated = hydrateWidgetSettings(raw, 'PageList')
      expect(hydrated).toBeDefined()
      expect(hydrated!.homeTitle).toBe('Principal')
      expect((hydrated!.links as any[])[0].title).toBe('Principal')
    })

    it('deserializes LinkList indexed link/text pairs with sorting and shownum', () => {
      const raw = {
        'sorting': 'alphabetical',
        'shownum': '2',
        'link-0': 'https://z.com',
        'text-0': 'Zeta',
        'link-1': 'https://a.com',
        'text-1': 'Alfa',
        'link-2': 'https://m.com',
        'text-2': 'Metro',
      }
      const hydrated = hydrateWidgetSettings(raw, 'LinkList')
      expect(hydrated).toBeDefined()
      const links = hydrated!.links as Array<{ name: string, target: string }>
      expect(links).toHaveLength(2) // Truncated by shownum = 2
      expect(links[0]!.name).toBe('Alfa')
      expect(links[1]!.name).toBe('Metro')
    })

    it('deserializes TextList indexed item pairs with reverse alphabetical sorting', () => {
      const raw = {
        'sorting': 'reverse_alphabetical',
        'item-0': 'Beta',
        'item-1': 'Alfa',
        'item-2': 'Gamma',
      }
      const hydrated = hydrateWidgetSettings(raw, 'TextList')
      expect(hydrated).toBeDefined()
      const items = hydrated!.items as string[]
      expect(items).toEqual(['Gamma', 'Beta', 'Alfa'])
    })
  })

  describe('deserializeWidgetSettings from AST', () => {
    it('extracts settings directly from <b:widget> or children', () => {
      const xml = `
        <b:widget id='PageList1' type='PageList'>
          <b:widget-settings>
            <b:widget-setting name='homeTitle'>Inicio</b:widget-setting>
            <b:widget-setting name='pageListJson'>[{"title":"Home","href":"/"}]</b:widget-setting>
          </b:widget-settings>
          <b:includable id='main'/>
        </b:widget>
      `
      const doc = parseTemplate(xml)
      const widgetNode = doc.children.find(c => c.type === 'Directive' && c.name === 'b:widget') as any
      const settings = deserializeWidgetSettings(widgetNode, 'PageList')
      expect(settings).toBeDefined()
      expect(settings!.homeTitle).toBe('Inicio')
      expect((settings!.links as any[])[0].title).toBe('Inicio')

      // Also accepts children array directly
      const settingsFromChildren = deserializeWidgetSettings(widgetNode.children, 'PageList')
      expect(settingsFromChildren).toEqual(settings)
    })

    it('returns undefined when no <b:widget-settings> is present', () => {
      const xml = `<b:widget id='HTML1' type='HTML'><b:includable id='main'/></b:widget>`
      const doc = parseTemplate(xml)
      const widgetNode = doc.children[0] as any
      expect(deserializeWidgetSettings(widgetNode, 'HTML')).toBeUndefined()
    })

    it('findWidgetSettingsNode finds directive in node and in children array', () => {
      const xml = `<b:widget id='PageList1' type='PageList'><b:widget-settings><b:widget-setting name='test'>1</b:widget-setting></b:widget-settings></b:widget>`
      const doc = parseTemplate(xml)
      const widgetNode = doc.children[0] as any
      const settingsDirective = findWidgetSettingsNode(widgetNode)
      expect(settingsDirective).toBeDefined()
      expect(settingsDirective?.name).toBe('b:widget-settings')
      expect(findWidgetSettingsNode(widgetNode.children)).toBe(settingsDirective)
    })
  })
})
