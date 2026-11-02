import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BloggerReferenceRenderer,
  normalizeHtmlString,
} from '../src/index.js'
import { getWorkspacePaths } from '../src/paths.js'

describe('bloggerReferenceRenderer', () => {
  const renderer = new BloggerReferenceRenderer()

  it('renders literal HTML elements and evaluates inline expressions', () => {
    const xml = '<div class="banner"><h1><data:title/></h1><p expr:data-count="data:count">Hello</p></div>'
    const html = renderer.compileFragment(xml, { title: 'Welcome', count: 42 })

    expect(html).toBe('<div class="banner"><h1>Welcome</h1><p data-count="42">Hello</p></div>')
  })

  it('hoists continuous b:class and b:attr mutations through b:if and b:tag[cond=false]', () => {
    const xml = `
      <div class="card">
        <b:if cond="data:isActive">
          <b:class name="is-active"/>
          <b:attr name="data-status" value="online"/>
        </b:if>
        <b:tag cond="false" name="span">
          <b:class name="hoisted-from-unwrapped"/>
          <span>Inner text</span>
        </b:tag>
      </div>
    `.trim()

    const html = renderer.compileFragment(xml, { isActive: true })

    expect(html).toContain('class="card is-active hoisted-from-unwrapped"')
    expect(html).toContain('data-status="online"')
    expect(html).toContain('<span>Inner text</span>')
    expect(html).not.toContain('<b:tag')
  })

  it('handles b:loop with variable binding, reverse, and array elements', () => {
    const xml = '<ul><b:loop values="data:items" var="item"><li><data:item.name/></li></b:loop></ul>'
    const html = renderer.compileFragment(xml, {
      items: [{ name: 'Alpha' }, { name: 'Beta' }],
    })

    expect(html).toBe('<ul><li>Alpha</li><li>Beta</li></ul>')
  })

  it('handles b:with variable bindings', () => {
    const xml = '<b:with value="data:user.name" var="u"><span>User: <data:u/></span></b:with>'
    const html = renderer.compileFragment(xml, {
      user: { name: 'Ada' },
    })
    expect(html).toBe('<span>User: Ada</span>')
  })

  it('handles b:switch with pattern matching and default fallback', () => {
    const xml = `<b:switch var="data:role">
      <b:case value="admin"/><b>Admin Access</b>
      <b:case value="editor"/><i>Editor Panel</i>
      <b:default/><span>Guest View</span>
    </b:switch>`
    expect(renderer.compileFragment(xml, { role: 'admin' })).toBe('<b>Admin Access</b>')
    expect(renderer.compileFragment(xml, { role: 'guest' })).toBe('<span>Guest View</span>')
  })

  it('evaluates resizeImage function in dynamic expressions', () => {
    const xml = '<img expr:src="resizeImage(data:img, 300, \'1:1\')"/>'
    const html = renderer.compileFragment(xml, {
      img: 'https://blogger.googleusercontent.com/img/a/sample.png',
    })

    expect(html).toBe('<img src="https://blogger.googleusercontent.com/img/a/sample.png=w300-h300-p-k-no-nu"/>')
  })

  it('aborts unresolvable includables emitting official Blogger failure comment', () => {
    const xml = '<b:include name="nonExistentSubroutine"/>'
    const html = renderer.compileFragment(xml, {})

    expect(html).toContain('<!--Failed to render gadget \'Widget\'.\n\nThere was an error processing the markup.\n-->')
  })

  it('compiles all production fragments from fixtures/templates/prod_fragments.json', () => {
    const fragmentsPath = join(getWorkspacePaths().fixtures, 'templates', 'prod_fragments.json')
    const suite = JSON.parse(readFileSync(fragmentsPath, 'utf-8'))

    expect(suite.fixtures.length).toBe(8)

    for (const fixture of suite.fixtures) {
      const compiled = renderer.compileFragment(fixture.input.source, fixture.input.context || {})
      if (fixture.expected.canonicalDom) {
        expect(normalizeHtmlString(compiled)).toBe(normalizeHtmlString(fixture.expected.html))
      }
      else {
        expect(compiled.trim()).toBe(fixture.expected.html.trim())
      }
    }
  })

  it('injects cookieChoiceInfo singleton before </body> when blog.cookieChoices is true', () => {
    const xml = '<!DOCTYPE html><html><head><title>Test</title></head><body><main>Content</main></body></html>'
    const context = {
      blog: {
        cookieChoices: true,
      },
      messages: {
        euCookieNotice2018: 'Aviso de cookies',
        learnMore: 'Más información',
        euCookieNoticeCloseButton: 'Aceptar',
      },
    }

    const html = renderer.render(xml, context)
    expect(html).toContain('<div id="cookieChoiceInfo" class="cookie-choices-info singleton-element">')
    expect(html).toContain('<span class="cookie-choices-text">Aviso de cookies</span>')
    expect(html).toContain('target="_blank" class="cookie-choices-button">Más información</a>')
    expect(html).toContain('id="cookieChoiceDismiss" href="#" class="cookie-choices-button">Aceptar</a>')
    expect(html).toMatch(/<\/main><div id="cookieChoiceInfo".*<\/body>/s)
  })

  it('does not inject cookieChoiceInfo singleton when blog.cookieChoices is false or omitted', () => {
    const xml = '<!DOCTYPE html><html><head><title>Test</title></head><body><main>Content</main></body></html>'
    const htmlWithout = renderer.render(xml, { blog: { cookieChoices: false } })
    expect(htmlWithout).not.toContain('cookieChoiceInfo')

    const htmlDefault = renderer.render(xml, {})
    expect(htmlDefault).not.toContain('cookieChoiceInfo')
  })

  it('resolves level 3 dynamic data dereferencing in b:with expr:value', () => {
    const xml = `<b:tag name='img'>
  <b:attr name='src' value='pic.jpg'/>
  <b:loop values='["id", "alt", "loading"]' var='attr'>
    <b:with expr:value='+("data:", data:attr)' var='val'>
      <b:attr expr:name='data:attr' expr:value='data:val'/>
    </b:with>
  </b:loop>
</b:tag>`
    const ctx = {
      data: {
        alt: 'Submerged in Beauty',
        loading: 'lazy',
      },
    }
    const html = renderer.render(xml, ctx)
    expect(html).toContain('alt="Submerged in Beauty"')
    expect(html).toContain('loading="lazy"')
    expect(html).not.toContain('id="data:id"')
    expect(html).not.toContain('id=')
  })

  it('guards against infinite recursion in b:include with maxIncludeDepth', () => {
    const xml = `
      <b:defaultmarkups>
        <b:defaultmarkup type='Common'>
          <b:includable id='loopA'>
            <p>Loop A</p>
            <b:include name='loopB'/>
          </b:includable>
          <b:includable id='loopB'>
            <p>Loop B</p>
            <b:include name='loopA'/>
          </b:includable>
        </b:defaultmarkup>
      </b:defaultmarkups>
      <div><b:include name='loopA'/></div>
    `.trim()

    const limitedRenderer = new BloggerReferenceRenderer({ maxIncludeDepth: 5 })
    const output = limitedRenderer.compileFragment(xml)
    expect(output).toContain('<!-- recursion depth limit exceeded (loop')
  })

  it('hydrates <b:widget-settings> with settings.json transforms without leaking raw CDATA', () => {
    const xml = `<b:section id='sidebar'>
      <b:widget id='LinkList1' type='LinkList' title='Resources' version='2'>
        <b:widget-settings>
          <b:widget-setting name='sorting'>ALPHABETICAL</b:widget-setting>
          <b:widget-setting name='link-0'>https://example.com/docs</b:widget-setting>
          <b:widget-setting name='text-0'><![CDATA[Documentation]]></b:widget-setting>
        </b:widget-settings>
        <b:includable id='main' var='top'>
          <h3 expr:data-sort='data:sorting'><data:top.title/></h3>
          <ul><b:loop values='data:links' var='l'><li><a expr:href='data:l.target'><data:l.name/></a></li></b:loop></ul>
        </b:includable>
      </b:widget>
    </b:section>`

    const html = renderer.render(xml, {})
    expect(html).toContain('<h3 data-sort="alphabetical">Resources</h3>')
    expect(html).toContain('<a href="https://example.com/docs">Documentation</a>')
    expect(html).not.toContain('ALPHABETICAL')
    expect(html).not.toContain('<b:widget-setting')
  })

  it('preserves b:if / b:elseif / b:else mutual exclusion for class and attr mutations on void and non-void elements', () => {
    const xml = `
      <div class='box'>
        <b:if cond='data:state == "a"'>
          <b:class name='state-a'/>
        <b:elseif cond='data:state == "b"'/>
          <b:class name='state-b'/>
        <b:else/>
          <b:class name='state-default'/>
        </b:if>
      </div>
      <input type='text'>
        <b:attr name='b:whitespace' value='remove'/>
        <b:if cond='data:readonly'>
          <b:attr name='readonly' value='readonly'/>
        <b:else/>
          <b:attr name='placeholder' value='Editable'/>
        </b:if>
      </input>
    `.trim()

    const htmlA = renderer.compileFragment(xml, { state: 'a', readonly: true })
    expect(htmlA).toContain('<div class="box state-a"></div>')
    expect(htmlA).toContain('readonly="readonly"')
    expect(htmlA).not.toContain('placeholder="Editable"')

    const htmlFallback = renderer.compileFragment(xml, { state: 'other', readonly: false })
    expect(htmlFallback).toContain('<div class="box state-default"></div>')
    expect(htmlFallback).toContain('placeholder="Editable"')
    expect(htmlFallback).not.toContain('readonly=')
  })

  it('discards inline attributes of <b:tag cond="false"> while hoisting child mutations to parent element', () => {
    const xml = `<div class='outer'>
      <b:tag name='a' cond='false' class='wrapper-only' href='https://ignored.example'>
        <b:class name='hoisted-child'/>
        <span>Inner</span>
      </b:tag>
    </div>`

    const html = renderer.compileFragment(xml, {})
    expect(html).toContain('class="outer hoisted-child"')
    expect(html).not.toContain('wrapper-only')
    expect(html).not.toContain('ignored.example')
    expect(html).toContain('<span>Inner</span>')
  })

  it('enforces section/widget cond, visible="false", and Layouts v3 maxwidgets/showaddelement suppression', () => {
    const xml = `<!DOCTYPE html><html b:css='false' b:js='false' b:defaultwidgetversion='2' b:layoutsVersion='3'><body>
      <b:section id='hidden-sec' cond='false'>
        <b:widget id='HTML1' type='HTML'><b:includable id='main'>Hidden Section</b:includable></b:widget>
      </b:section>
      <b:section id='suppressed-sec' showaddelement='false'>
        <b:widget id='HTML2' type='HTML'><b:includable id='main'>Suppressed Widget</b:includable></b:widget>
      </b:section>
      <b:section id='active-sec' name='Main Area' tag='aside'>
        <b:widget id='HTML3' type='HTML' visible='false'><b:includable id='main'>Invisible</b:includable></b:widget>
        <b:widget id='HTML4' type='HTML' cond='data:allowWidget' version='1'><b:includable id='main'>Visible V1</b:includable></b:widget>
      </b:section>
    </body></html>`

    const html = renderer.render(xml, { allowWidget: true })
    expect(html).not.toContain('hidden-sec')
    expect(html).toContain('<div class="no-items section" id="suppressed-sec"></div>')
    expect(html).not.toContain('Suppressed Widget')
    expect(html).not.toContain('Invisible')
    expect(html).toContain('<aside class="section" id="active-sec" name="Main Area">')
    expect(html).toContain('data-version="1"')
    expect(html).toContain('Visible V1')
  })

  it('isolates type="All" defaultmarkups from global scope and routes super.* strictly to platform_server', () => {
    const globalAllXml = `<b:defaultmarkups>
      <b:defaultmarkup type='All'>
        <b:includable id='onlyForWidgets'>WidgetOnly</b:includable>
      </b:defaultmarkup>
    </b:defaultmarkups>
    <b:include name='onlyForWidgets'/>`

    const globalHtml = renderer.compileFragment(globalAllXml, {})
    expect(globalHtml).toContain('Failed to render gadget')
    expect(globalHtml).not.toContain('WidgetOnly')

    const superXml = `<b:defaultmarkups>
      <b:defaultmarkup type='Common'>
        <b:includable id='super.all-head-content'>SpoofedSuper</b:includable>
      </b:defaultmarkup>
    </b:defaultmarkups>
    <b:include name='super.all-head-content'/>`

    const superHtml = renderer.compileFragment(superXml, { blog: { encoding: 'UTF-8' } })
    expect(superHtml).not.toContain('SpoofedSuper')
    expect(superHtml).toContain('<meta')
  })

  it('renders <b:skin> runtime overrides, conditional <b:template-skin>, and canonical <data:*/> comments', () => {
    const skinXml = `<b:skin><![CDATA[
      /*<Variable name="accent" type="color" default="#ff0000" value="#00ff00"/>*/
      .btn { color: $(accent); }
    ]]></b:skin>
    <b:if cond='data:view.isLayoutMode'>
      <b:template-skin><![CDATA[#layout { padding: 8px; }]]></b:template-skin>
    </b:if>
    <data:missingProp/>|<b:eval expr='data:missingProp'/>|<data:compositeObj/>`

    const publicHtml = renderer.compileFragment(skinXml, {
      skin: { vars: { accent: '#0000ff' } },
      view: { isLayoutMode: false },
      compositeObj: { nested: 1 },
    })
    expect(publicHtml).toContain('.btn { color: #0000ff; }')
    expect(publicHtml).not.toContain('template-skin-1')
    expect(publicHtml).toContain('<!--Can\'t find substitution for tag [missingProp]-->||<!--Substitution is not a singleton for tag [compositeObj]-->')

    const layoutHtml = renderer.compileFragment(skinXml, {
      view: { isLayoutMode: true },
      missingProp: 'OK',
      compositeObj: 'Scalar',
    })
    expect(layoutHtml).toContain('id=\'template-skin-1\'')
    expect(layoutHtml).toContain('#layout { padding: 8px; }')
  })
})
