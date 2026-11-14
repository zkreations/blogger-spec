import { describe, expect, it } from 'vitest'
import { resolveBloggerContext } from '../src/context/resolver.js'

describe('widget configuration precedence hierarchy', () => {
  it('ensures <b:widget-setting> takes precedence over conflicting blogger.config.json properties', async () => {
    const templateXml = `
      <b:section id='sidebar'>
        <b:widget id='PopularPosts1' type='PopularPosts' title='Popular Posts' version='2'>
          <b:widget-settings>
            <b:widget-setting name='showSnippets'>true</b:widget-setting>
            <b:widget-setting name='numItemsToShow'>5</b:widget-setting>
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
          PopularPosts1: {
            showSnippets: false, // Inverted: XML must win
            numItemsToShow: 2, // Inverted: XML must win
          },
        },
      },
    })

    const popular = context.widgetData.PopularPosts1
    expect(popular).toBeDefined()
    expect(popular.showSnippets).toBe(true)
    expect(popular.numItemsToShow).toBe(5)
    expect(popular.postDisplay?.showSnippet).toBe(true)
  })

  it('preserves non-conflicting properties from blogger.config.json when not defined in <b:widget-setting>', async () => {
    const templateXml = `
      <b:section id='nav'>
        <b:widget id='PageList1' type='PageList' title='Main Menu' version='2'>
          <b:widget-settings>
            <b:widget-setting name='homeTitle'>Dashboard</b:widget-setting>
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
              { title: 'Home', href: '/' },
              { title: 'Docs', href: '/p/docs.html' },
            ],
          },
        },
      },
    })

    const pageList = context.widgetData.PageList1
    expect(pageList).toBeDefined()
    // homeTitle defined in XML takes effect on first home link
    expect(pageList.links[0].title).toBe('Dashboard')
    expect(pageList.links[1].title).toBe('Docs')
  })

  it('ensures template XML attributes (<b:widget title="...">) take precedence over blogger.config.json title', async () => {
    const templateXml = `
      <b:section id='header'>
        <b:widget id='Header1' type='Header' title='Template Header Title' version='2'>
          <b:includable id='main'/>
        </b:widget>
      </b:section>
    `

    const context = await resolveBloggerContext({
      offline: true,
      templateXml,
      config: {
        widgets: {
          Header1: {
            title: 'Config Header Title',
          },
        },
      },
    })

    expect(context.widgetData.Header1.title).toBe('Template Header Title')
  })

  it('lets explicit programmatic overrides (Nivel 0) supersede <b:widget-setting> for test harness purposes', async () => {
    const templateXml = `
      <b:section id='sidebar'>
        <b:widget id='HTML1' type='HTML' title='Sidebar Box' version='2'>
          <b:widget-settings>
            <b:widget-setting name='content'>Template Content</b:widget-setting>
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
          HTML1: {
            content: 'Config Content',
          },
        },
      },
      overrides: {
        widgetData: {
          HTML1: {
            content: 'Forced Test Content',
          },
        },
      },
    })

    expect(context.widgetData.HTML1.content).toBe('Forced Test Content')
  })
})
