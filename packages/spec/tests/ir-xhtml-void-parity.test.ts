import { describe, expect, it } from 'vitest'
import { BloggerReferenceRenderer } from '../src/index.js'

describe('ir-xhtml-void-parity and b:whitespace canonical void element serialization', () => {
  const renderer = new BloggerReferenceRenderer()

  it('renders atomic XML self-closing void elements as <img .../>', () => {
    const xml = `
      <img src="https://example.com/logo.png" alt="Logo"/>
      <input type="text" name="q" value="Search"/>
    `
    const html = renderer.compileFragment(xml)

    expect(html).toContain('<img src="https://example.com/logo.png" alt="Logo"/>')
    expect(html).toContain('<input type="text" name="q" value="Search"/>')
  })

  it('renders paired HTML void elements as <img ...></img> unless b:whitespace="remove" is present', () => {
    const xml = `
      <img src="https://example.com/cover.png">
        <b:attr name="alt" value="Cover"/>
      </img>
      <img src="https://example.com/cover2.png">
        <b:attr name="b:whitespace" value="remove"/>
        <b:attr name="alt" value="Cover 2"/>
      </img>
    `
    const html = renderer.compileFragment(xml)

    expect(html).toContain('<img src="https://example.com/cover.png" alt="Cover"></img>')
    expect(html).toContain('<img src="https://example.com/cover2.png" alt="Cover 2"/>')
  })

  it('renders <b:tag> for void elements as <tag>...</tag> unless b:whitespace="remove" is present', () => {
    const xml = `
      <b:tag name="img" expr:src="'https://example.com/dynamic1.png'">
        <b:attr name="alt" value="Dynamic 1"/>
      </b:tag>
      <b:tag name="img" expr:src="'https://example.com/dynamic2.png'">
        <b:attr name="b:whitespace" value="remove"/>
        <b:attr name="alt" value="Dynamic 2"/>
      </b:tag>
      <b:tag name="img" b:whitespace="remove" expr:src="'https://example.com/dynamic3.png'">
        <b:attr name="alt" value="Dynamic 3"/>
      </b:tag>
    `
    const html = renderer.compileFragment(xml)

    expect(html).toContain('<img src="https://example.com/dynamic1.png" alt="Dynamic 1"></img>')
    expect(html).toContain('<img src="https://example.com/dynamic2.png" alt="Dynamic 2"/>')
    expect(html).toContain('<img src="https://example.com/dynamic3.png" alt="Dynamic 3"/>')
  })

  it('honors selfClosingVoid: false when explicitly configured on self-closed elements', () => {
    const html5Renderer = new BloggerReferenceRenderer({ selfClosingVoid: false })
    const xml = `
      <img src="https://example.com/logo.png"/>
      <b:tag name="img" b:whitespace="remove" src="https://example.com/dynamic.png"/>
    `
    const html = html5Renderer.compileFragment(xml)

    expect(html).toContain('<img src="https://example.com/logo.png">')
    expect(html).toContain('<img src="https://example.com/dynamic.png">')
  })
})
