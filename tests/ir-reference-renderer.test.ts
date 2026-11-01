import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BloggerReferenceRenderer,
  normalizeHtmlString,
  SimpleBloggerCompiler,
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

  it('provides backward-compatible SimpleBloggerCompiler class alias', () => {
    const compiler = new SimpleBloggerCompiler()
    expect(compiler).toBeInstanceOf(BloggerReferenceRenderer)
    const res = compiler.compileFragment('<span><data:foo/></span>', { foo: 'bar' })
    expect(res).toBe('<span>bar</span>')
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
})
