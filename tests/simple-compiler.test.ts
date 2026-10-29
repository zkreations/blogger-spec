import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SimpleBloggerCompiler } from '../examples/simple-compiler.js'
import { normalizeHtmlString } from '../src/index.js'
import { getWorkspacePaths } from '../src/paths.js'

describe('simpleBloggerCompiler reference implementation (Priority 2)', () => {
  const compiler = new SimpleBloggerCompiler()

  it('renders literal HTML elements and evaluates inline expressions', () => {
    const xml = '<div class="banner"><h1><data:title/></h1><p expr:data-count="data:count">Hello</p></div>'
    const html = compiler.compileFragment(xml, { title: 'Welcome', count: 42 })

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

    const html = compiler.compileFragment(xml, { isActive: true })

    expect(html).toContain('class="card is-active hoisted-from-unwrapped"')
    expect(html).toContain('data-status="online"')
    expect(html).toContain('<span>Inner text</span>')
    expect(html).not.toContain('<b:tag')
  })

  it('handles b:loop with variable binding and array elements', () => {
    const xml = '<ul><b:loop values="data:items" var="item"><li><data:item.name/></li></b:loop></ul>'
    const html = compiler.compileFragment(xml, {
      items: [{ name: 'Alpha' }, { name: 'Beta' }],
    })

    expect(html).toBe('<ul><li>Alpha</li><li>Beta</li></ul>')
  })

  it('evaluates resizeImage function in dynamic expressions', () => {
    const xml = '<img expr:src="resizeImage(data:img, 300, \'1:1\')"/>'
    const html = compiler.compileFragment(xml, {
      img: 'https://blogger.googleusercontent.com/img/a/sample.png',
    })

    expect(html).toBe('<img src="https://blogger.googleusercontent.com/img/a/sample.png=w300-h300-p-k-no-nu"/>')
  })

  it('aborts unresolvable includables emitting official Blogger failure comment', () => {
    const xml = '<b:include name="nonExistentSubroutine"/>'
    const html = compiler.compileFragment(xml, {})

    expect(html).toContain('<!--Failed to render gadget \'Widget\'.\n\nThere was an error processing the markup.\n-->')
  })

  it('compiles all production fragments from fixtures/templates/prod_fragments.json', () => {
    const fragmentsPath = join(getWorkspacePaths().fixtures, 'templates', 'prod_fragments.json')
    const suite = JSON.parse(readFileSync(fragmentsPath, 'utf-8'))

    expect(suite.fixtures.length).toBe(8)

    for (const fixture of suite.fixtures) {
      const compiled = compiler.compileFragment(fixture.input.source, fixture.input.context || {})
      if (fixture.expected.canonicalDom) {
        expect(normalizeHtmlString(compiled)).toBe(normalizeHtmlString(fixture.expected.html))
      }
      else {
        expect(compiled.trim()).toBe(fixture.expected.html.trim())
      }
    }
  })
})
