import { describe, expect, it } from 'vitest'
import {
  CANONICAL_WIDGET_ID_REGEX,
  extractTemplateWidgets,
  isValidWidgetIdForType,
  normalizeLinkItem,
  parseCanonicalWidgetId,
  parsePageListJson,
} from '../src/context/widget-extractor.js'

describe('widget-extractor', () => {
  describe('canonical widget ID validation (BX1047)', () => {
    it('accepts valid canonical widget IDs from 1 to 999', () => {
      expect(CANONICAL_WIDGET_ID_REGEX.test('PageList1')).toBe(true)
      expect(CANONICAL_WIDGET_ID_REGEX.test('PageList2')).toBe(true)
      expect(CANONICAL_WIDGET_ID_REGEX.test('PageList999')).toBe(true)
      expect(CANONICAL_WIDGET_ID_REGEX.test('Blog1')).toBe(true)
      expect(CANONICAL_WIDGET_ID_REGEX.test('Header1')).toBe(true)
      expect(CANONICAL_WIDGET_ID_REGEX.test('HTML5')).toBe(true)
      expect(CANONICAL_WIDGET_ID_REGEX.test('FeaturedPost12')).toBe(true)
    })

    it('rejects invalid widget IDs violating BX1047', () => {
      expect(CANONICAL_WIDGET_ID_REGEX.test('PageList0')).toBe(false)
      expect(CANONICAL_WIDGET_ID_REGEX.test('PageList1000')).toBe(false)
      expect(CANONICAL_WIDGET_ID_REGEX.test('page_list_1')).toBe(false)
      expect(CANONICAL_WIDGET_ID_REGEX.test('MenuPrincipal')).toBe(false)
      expect(CANONICAL_WIDGET_ID_REGEX.test('custom1')).toBe(false)
    })

    it('parses type and index from canonical ID', () => {
      expect(parseCanonicalWidgetId('PageList1')).toEqual({ type: 'PageList', index: 1 })
      expect(parseCanonicalWidgetId('PageList42')).toEqual({ type: 'PageList', index: 42 })
      expect(parseCanonicalWidgetId('HTML999')).toEqual({ type: 'HTML', index: 999 })
      expect(parseCanonicalWidgetId('InvalidId')).toBeUndefined()
    })

    it('validates widget ID matches its declared type', () => {
      expect(isValidWidgetIdForType('PageList1', 'PageList')).toBe(true)
      expect(isValidWidgetIdForType('PageList2', 'PageList')).toBe(true)
      expect(isValidWidgetIdForType('Header1', 'PageList')).toBe(false)
      expect(isValidWidgetIdForType('PageList0', 'PageList')).toBe(false)
    })
  })

  describe('link normalization and shorthand parsing', () => {
    it('normalizes standard object format', () => {
      const item = normalizeLinkItem({ title: 'Home', href: '/', isCurrentPage: true })
      expect(item).toEqual({ title: 'Home', href: '/', isCurrentPage: true })
    })

    it('normalizes shorthand format { "Title": "/path" }', () => {
      const item = normalizeLinkItem({ Home: '/' })
      expect(item).toEqual({ title: 'Home', href: '/' })
    })

    it('deserializes pageListJson array', () => {
      const json = JSON.stringify([
        { title: 'Home', href: '/' },
        { Contact: '/p/contact.html' },
      ])
      const links = parsePageListJson(json)
      expect(links).toHaveLength(2)
      expect(links[0]).toEqual({ title: 'Home', href: '/' })
      expect(links[1]).toEqual({ title: 'Contact', href: '/p/contact.html' })
    })

    it('deserializes pageListJson Blogger dictionary format', () => {
      const json = JSON.stringify({
        c1: { title: 'Contact', href: '/p/contact.html', position: 1 },
        c0: { title: 'Home', href: '/', position: 0 },
      })
      const links = parsePageListJson(json)
      expect(links).toHaveLength(2)
      expect(links[0]!.title).toBe('Home')
      expect(links[1]!.title).toBe('Contact')
    })
  })

  describe('extractTemplateWidgets', () => {
    it('extracts multiple widgets of the same type and parses their <b:widget-settings>', () => {
      const xml = `
        <b:section id='header'>
          <b:widget id='PageList1' type='PageList' title='Main Menu'>
            <b:widget-settings>
              <b:widget-setting name='homeTitle'>Inicio</b:widget-setting>
              <b:widget-setting name='pageListJson'>[{"title":"Home","href":"/"},{"title":"About","href":"/about"}]</b:widget-setting>
            </b:widget-settings>
            <b:includable id='main'/>
          </b:widget>
          <b:widget id='PageList2' type='PageList' title='Footer Links'>
            <b:widget-settings>
              <b:widget-setting name='homeTitle'>Home</b:widget-setting>
            </b:widget-settings>
            <b:includable id='main'/>
          </b:widget>
          <b:widget id='Blog1' type='Blog'>
            <b:includable id='main'/>
          </b:widget>
        </b:section>
      `

      const widgets = extractTemplateWidgets(xml)
      expect(widgets).toHaveLength(3)

      const pageList1 = widgets.find(w => w.id === 'PageList1')
      expect(pageList1).toBeDefined()
      expect(pageList1?.type).toBe('PageList')
      expect(pageList1?.title).toBe('Main Menu')
      expect(pageList1?.settings?.homeTitle).toBe('Inicio')
      expect(pageList1?.settings?.links).toEqual([
        { title: 'Inicio', href: '/' },
        { title: 'About', href: '/about' },
      ])

      const pageList2 = widgets.find(w => w.id === 'PageList2')
      expect(pageList2).toBeDefined()
      expect(pageList2?.type).toBe('PageList')
      expect(pageList2?.title).toBe('Footer Links')
      expect(pageList2?.settings?.homeTitle).toBe('Home')

      const blog1 = widgets.find(w => w.id === 'Blog1')
      expect(blog1).toBeDefined()
      expect(blog1?.type).toBe('Blog')
    })
  })
})
