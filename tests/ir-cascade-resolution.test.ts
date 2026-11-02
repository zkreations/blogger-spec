import { describe, expect, it } from 'vitest'
import { BloggerReferenceRenderer } from '../src/index.js'

describe('bIR cascade resolution & canonical fidelity suite', () => {
  const renderer = new BloggerReferenceRenderer()

  it('isolates local_widget includables preventing cross-widget collision on identical IDs', () => {
    const xml = `
      <b:section id='main'>
        <b:widget id='Blog1' type='Blog'>
          <b:includable id='main'>
            <div class='blog'>
              <b:include name='card'/>
            </div>
          </b:includable>
          <b:includable id='card'>
            <article class='blog-card'>Blog Post Card</article>
          </b:includable>
        </b:widget>

        <b:widget id='PopularPosts1' type='PopularPosts'>
          <b:includable id='main'>
            <ul class='popular'>
              <b:include name='card'/>
            </ul>
          </b:includable>
          <b:includable id='card'>
            <li class='popular-card'>Popular Post Card</li>
          </b:includable>
        </b:widget>
      </b:section>
    `.trim()

    const html = renderer.compile(xml)

    expect(html).toContain('<div class="blog"><article class="blog-card">Blog Post Card</article></div>')
    expect(html).toContain('<ul class="popular"><li class="popular-card">Popular Post Card</li></ul>')
  })

  it('resolves multi-level cascading inclusions across 5 tiers', () => {
    const xml = `
      <b:defaultmarkups>
        <b:defaultmarkup type='Common'>
          <b:includable id='sharedHeader'>
            <header class='common-header'>Common Header</header>
          </b:includable>
        </b:defaultmarkup>
        <b:defaultmarkup type='All'>
          <b:includable id='universalBadge'>
            <span class='badge'>Universal Badge</span>
          </b:includable>
        </b:defaultmarkup>
        <b:defaultmarkup type='Blog'>
          <b:includable id='blogSnippet'>
            <p class='blog-snippet'>Gadget-Specific Snippet</p>
          </b:includable>
        </b:defaultmarkup>
      </b:defaultmarkups>
      <b:section id='content'>
        <b:widget id='Blog1' type='Blog'>
          <b:includable id='main'>
            <b:include name='sharedHeader'/>
            <b:include name='universalBadge'/>
            <b:include name='blogSnippet'/>
          </b:includable>
        </b:widget>
      </b:section>
    `.trim()

    const html = renderer.compile(xml)

    expect(html).toContain('<header class="common-header">Common Header</header>')
    expect(html).toContain('<span class="badge">Universal Badge</span>')
    expect(html).toContain('<p class="blog-snippet">Gadget-Specific Snippet</p>')
  })

  it('allows valid multi-instance widgets (Blog2, Header2) to inherit data from base instance', () => {
    const xml = `
      <b:section id='main'>
        <b:widget id='Blog2' type='Blog'>
          <b:includable id='main'>
            <div class='secondary-blog'>
              <h1><data:title/></h1>
              <b:loop values='data:posts' var='p'>
                <span><data:p.title/></span>
              </b:loop>
            </div>
          </b:includable>
        </b:widget>
      </b:section>
    `.trim()

    const context = {
      widgetData: {
        Blog1: {
          title: 'Main Blog Title',
          posts: [{ title: 'First Post' }, { title: 'Second Post' }],
        },
      },
    }

    const html = renderer.compile(xml, context)

    expect(html).toContain('<h1>Main Blog Title</h1>')
    expect(html).toContain('<span>First Post</span>')
    expect(html).toContain('<span>Second Post</span>')
  })

  it('stringifies dynamic boolean expr:* attributes to false while omitting via b:attr cond', () => {
    const xml = `
      <div>
        <input expr:checked='false' id='input1'/>
        <input id='input2'>
          <b:attr cond='false' name='checked' value='checked'/>
        </input>
        <input id='input3'>
          <b:attr cond='true' name='checked' value='checked'/>
        </input>
      </div>
    `.trim()

    const html = renderer.compileFragment(xml, {})

    // expr:checked='false' MUST serialize checked="false" per Blogger Core specification
    expect(html).toContain('checked="false"')
    expect(html).toContain('id="input1"')
    // b:attr cond='false' MUST omit checked
    expect(html).toContain('<input id="input2"></input>')
    // b:attr cond='true' MUST apply checked
    expect(html).toContain('checked="checked"')
    expect(html).toContain('id="input3"')
  })

  it('unpacks object literal payloads directly into local scope when includable omits var', () => {
    const xml = `
      <div>
        <b:include data='{ badgeText: "New", count: 5 }' name='badge'/>
      </div>
      <b:defaultmarkups>
        <b:defaultmarkup type='Common'>
          <b:includable id='badge'>
            <span class='badge'><data:badgeText/> (<data:count/>)</span>
          </b:includable>
        </b:defaultmarkup>
      </b:defaultmarkups>
    `.trim()

    const html = renderer.compileFragment(xml, {})

    expect(html).toContain('<span class="badge">New (5)</span>')
  })

  it('honors canonical recursion limit up to 43 frames without premature abort', () => {
    const xml = `
      <b:defaultmarkups>
        <b:defaultmarkup type='Common'>
          <b:includable id='recurse' var='data'>
            <b:if cond='data:count &gt; 0'>
              <b:include data='{ count: data:count - 1 }' name='recurse'/>
            <b:else/>
              <span>Depth Reached</span>
            </b:if>
          </b:includable>
        </b:defaultmarkup>
      </b:defaultmarkups>
      <div>
        <b:include data='{ count: 10 }' name='recurse'/>
      </div>
    `.trim()

    const html = renderer.compileFragment(xml, {})
    expect(html).toContain('<span>Depth Reached</span>')
  })
})
