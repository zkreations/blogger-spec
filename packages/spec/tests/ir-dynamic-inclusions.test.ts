import { describe, expect, it } from 'vitest'
import { BloggerReferenceRenderer } from '../src/index.js'

describe('ir-dynamic-inclusions Tier 5 server resolution', () => {
  const renderer = new BloggerReferenceRenderer()

  it('dynamically resolves platform server inclusion (all-head-content) via expr:name', () => {
    const xml = `
      <b:with value='"all-head-content"' var='macro'>
        <b:include expr:name='data:macro'/>
      </b:with>
    `
    const html = renderer.compileFragment(xml, {
      blog: {
        title: 'Dynamic Blog',
        encoding: 'UTF-8',
        metaDescription: 'A test blog',
      },
      view: {
        url: 'https://example.blogspot.com/',
      },
    })

    expect(html).not.toContain('<!-- unresolved -->')
    expect(html).toContain('<meta')
  })

  it('dynamically resolves super.* platform inclusions with warning/fallback', () => {
    const xml = `
      <b:with value='"super.post"' var='superSub'>
        <b:include expr:name='data:superSub'/>
      </b:with>
    `
    const html = renderer.compileFragment(xml, {})
    expect(html).not.toContain('<!-- unresolved -->')
  })
})
