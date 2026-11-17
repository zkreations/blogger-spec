import { describe, expect, it } from 'vitest'
import { resolveBloggerContext } from '../src/context/resolver.js'

describe('context-cascading-widgets', () => {
  it('discovers multiple PageList instances from templateXml and applies independent configurations', async () => {
    const templateXml = `
      <b:section id='header'>
        <b:widget id='PageList1' type='PageList' title='Main Nav'>
          <b:includable id='main'/>
        </b:widget>
        <b:widget id='PageList2' type='PageList' title='Footer Nav'>
          <b:widget-settings>
            <b:widget-setting name='homeTitle'>Root</b:widget-setting>
          </b:widget-settings>
          <b:includable id='main'/>
        </b:widget>
      </b:section>
    `

    const context = await resolveBloggerContext({
      offline: true,
      templateXml,
      config: {
        widgets: {
          PageList1: {
            links: [
              { Home: '/' },
              { About: '/p/about.html' },
            ],
          },
          PageList2: {
            links: [
              { Privacy: '/p/privacy.html' },
              { Terms: '/p/terms.html' },
            ],
          },
        },
      },
    })

    expect(context.widgetData.PageList1).toBeDefined()
    expect(context.widgetData.PageList2).toBeDefined()

    expect(context.widgetData.PageList1.links).toHaveLength(2)
    expect(context.widgetData.PageList1.links[0].title).toBe('Home')
    expect(context.widgetData.PageList1.links[1].title).toBe('About')

    expect(context.widgetData.PageList2.links).toHaveLength(2)
    expect(context.widgetData.PageList2.links[0].title).toBe('Privacy')
    expect(context.widgetData.PageList2.links[1].title).toBe('Terms')

    // Alias points to primary instance PageList1
    expect(context.widgetData.PageList).toBe(context.widgetData.PageList1)
  })

  it('cascades generic type configuration to all instances unless overridden', async () => {
    const templateXml = `
      <b:section id='body'>
        <b:widget id='PageList1' type='PageList'/>
        <b:widget id='PageList2' type='PageList'/>
      </b:section>
    `

    const context = await resolveBloggerContext({
      offline: true,
      templateXml,
      config: {
        widgets: {
          PageList: {
            title: 'Shared Navigation Title',
          },
          PageList2: {
            title: 'Custom Footer Title',
          },
        },
      },
    })

    expect(context.widgetData.PageList1.title).toBe('Shared Navigation Title')
    expect(context.widgetData.PageList2.title).toBe('Custom Footer Title')
  })

  it('calculates isCurrentPage reactively per instance against active route', async () => {
    const context = await resolveBloggerContext({
      offline: true,
      view: 'static_page',
      targetUrl: '/p/contact.html',
      config: {
        widgets: {
          PageList1: {
            links: [
              { title: 'Home', href: '/' },
              { title: 'Contact', href: '/p/contact.html' },
            ],
          },
          PageList2: {
            links: [
              { title: 'FAQ', href: '/p/faq.html' },
              { title: 'Contact Support', href: '/p/contact.html' },
            ],
          },
        },
      },
    })

    expect(context.widgetData.PageList1.links[0].isCurrentPage).toBe(false)
    expect(context.widgetData.PageList1.links[1].isCurrentPage).toBe(true)

    expect(context.widgetData.PageList2.links[0].isCurrentPage).toBe(false)
    expect(context.widgetData.PageList2.links[1].isCurrentPage).toBe(true)
  })

  it('supports widgets with arbitrary canonical IDs between 1 and 999', async () => {
    const templateXml = `
      <b:section id='sidebar'>
        <b:widget id='Header2' type='Header' title='Secondary Header'/>
        <b:widget id='Label5' type='Label' title='Popular Tags'/>
        <b:widget id='PageList99' type='PageList' title='Sidebar Menu'/>
      </b:section>
    `

    const context = await resolveBloggerContext({
      offline: true,
      templateXml,
      config: {
        widgets: {
          PageList99: {
            links: [{ title: 'Special Link', href: '/special' }],
          },
        },
      },
    })

    expect(context.widgetData.Header2).toBeDefined()
    expect(context.widgetData.Header2.title).toBe('Secondary Header')

    expect(context.widgetData.Label5).toBeDefined()
    expect(context.widgetData.Label5.title).toBe('Popular Tags')

    expect(context.widgetData.PageList99).toBeDefined()
    expect(context.widgetData.PageList99.links[0].title).toBe('Special Link')
  })
})
