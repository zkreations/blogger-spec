import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BloggerTemplateSyntaxError,
  parseTemplate,
} from '../src/index.js'
import { getWorkspacePaths } from '../src/paths.js'

describe('parseTemplate AST parser', () => {
  it('parses minimal Blogger template into BloggerDocumentNode with doctype and declarations', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE html>
<html b:css='false' b:js='false' b:defaultwidgetversion='2' b:layoutsVersion='3'>
  <head>
    <title><data:view.title.escaped/></title>
    <b:skin><![CDATA[body { color: red; }]]></b:skin>
  </head>
  <body>
    <!-- Main section container -->
    <b:section id='main'>
      <b:widget id='Header1' type='Header' version='2'>
        <b:includable id='main'>
          <h1><data:title/></h1>
        </b:includable>
      </b:widget>
    </b:section>
  </body>
</html>`

    const doc = parseTemplate(xml)
    expect(doc.type).toBe('Document')
    expect(doc.xmlDeclaration).toBe('<?xml version="1.0" encoding="UTF-8" ?>')
    expect(doc.doctype).toBe('<!DOCTYPE html>')
    expect(doc.children.length).toBeGreaterThan(0)

    const html = doc.children.find(c => c.type === 'Element' && c.name === 'html') as any
    expect(html).toBeDefined()
    expect(html.attributes).toHaveLength(4)

    const head = html.children.find((c: any) => c.type === 'Element' && c.name === 'head')
    expect(head).toBeDefined()

    const skin = head.children.find((c: any) => c.type === 'Directive' && c.name === 'b:skin')
    expect(skin).toBeDefined()
    const cdata = skin.children.find((c: any) => c.type === 'CData')
    expect(cdata).toBeDefined()
    expect(cdata.value).toBe('body { color: red; }')

    const body = html.children.find((c: any) => c.type === 'Element' && c.name === 'body')
    expect(body).toBeDefined()

    // Comment node preservation
    const comment = body.children.find((c: any) => c.type === 'Comment')
    expect(comment).toBeDefined()
    expect(comment.value.trim()).toBe('Main section container')

    // Widget and includable traversal
    const section = body.children.find((c: any) => c.type === 'Directive' && c.name === 'b:section')
    expect(section).toBeDefined()
    const widget = section.children.find((c: any) => c.type === 'Directive' && c.name === 'b:widget')
    expect(widget).toBeDefined()
    const includable = widget.children.find((c: any) => c.type === 'Directive' && c.name === 'b:includable')
    expect(includable).toBeDefined()
  })

  it('preserves multiline expression attributes and parses AST expressions', () => {
    const xml = `<div expr:data-multiline='
      data:view.isPost
        ? "post-view"
        : "other-view"
    '>
      Multiline test
    </div>`

    const doc = parseTemplate(xml)
    const div = doc.children.find(c => c.type === 'Element' && c.name === 'div') as any
    expect(div).toBeDefined()

    const attr = div.attributes.find((a: any) => a.name === 'expr:data-multiline')
    expect(attr).toBeDefined()
    expect(attr.isExpression).toBe(true)
    expect(attr.value).toBeDefined()
    expect(attr.value.type).toBe('ConditionalExpression')
  })

  it('strictly rejects unescaped ampersand in text with canonical error', () => {
    const xml = `<div>Tom & Jerry</div>`
    expect(() => parseTemplate(xml)).toThrowError(BloggerTemplateSyntaxError)
    expect(() => parseTemplate(xml)).toThrowError(
      'The entity name must immediately follow the \'&\' in the entity reference.',
    )
  })

  it('strictly rejects unescaped ampersand in attribute value with canonical error', () => {
    const xml = `<div title="Tom & Jerry">Text</div>`
    expect(() => parseTemplate(xml)).toThrowError(BloggerTemplateSyntaxError)
    expect(() => parseTemplate(xml)).toThrowError(
      'The entity name must immediately follow the \'&\' in the entity reference.',
    )
  })

  it('accepts valid XML entities in text and attributes', () => {
    const xml = `<div title="Tom &amp; Jerry &quot;Best&quot; &#160; &#xA0;">Tom &amp; Jerry &lt;3 &gt;2 &apos;friends&apos;</div>`
    const doc = parseTemplate(xml)
    const div = doc.children.find(c => c.type === 'Element' && c.name === 'div') as any
    expect(div).toBeDefined()
    expect(div.attributes[0].value).toContain('&amp;')
  })

  it('strictly rejects void HTML elements missing self-closing slash', () => {
    const xml = `<b:includable id='main'>
      <img alt='Test' src='https://example.com/test.png'>
      <div>Hello</div>
    </b:includable>`

    expect(() => parseTemplate(xml)).toThrowError(BloggerTemplateSyntaxError)
    expect(() => parseTemplate(xml)).toThrowError(
      'The element type \'img\' must be terminated by the matching end-tag \'</img>\'.',
    )
  })

  it('allows void elements when self-closing or closed explicitly', () => {
    const xml1 = `<img alt='Test' src='https://example.com/test.png'/>`
    expect(() => parseTemplate(xml1)).not.toThrow()

    const xml2 = `<img alt='Test' src='https://example.com/test.png'></img>`
    expect(() => parseTemplate(xml2)).not.toThrow()
  })

  it('strictly rejects mismatched closing tags with canonical error', () => {
    const xml = `<div><span>Hello</div></span>`
    expect(() => parseTemplate(xml)).toThrowError(
      'The element type \'span\' must be terminated by the matching end-tag \'</span>\'.',
    )
  })

  it('strictly rejects unclosed tag at end of file', () => {
    const xml = `<b:section id='main'><b:widget id='Header1' type='Header' version='2'>`
    expect(() => parseTemplate(xml)).toThrowError(
      'The element type \'b:widget\' must be terminated by the matching end-tag \'</b:widget>\'.',
    )
  })

  it('records diagnostics in tolerant mode without throwing', () => {
    const xml = `<div>Tom & Jerry <img src="test.png"><span>Hello</div>`
    const doc = parseTemplate(xml, { tolerant: true })
    expect(doc.diagnostics).toBeDefined()
    expect(doc.diagnostics!.length).toBeGreaterThan(0)
  })

  describe('production templates empirical conformance', () => {
    const canonicalSamplePath = path.join(getWorkspacePaths().fixtures, 'templates/samples/hamlet.xml')
    const workbenchSamplesDir = path.join(getWorkspacePaths().workbench, 'samples')
    const basicoPath = path.join(workbenchSamplesDir, 'basico.xml')
    const laertesPath = path.join(workbenchSamplesDir, 'laertes.xml')

    it('successfully parses canonical hamlet.xml production template', () => {
      const xml = fs.readFileSync(canonicalSamplePath, 'utf8')
      const doc = parseTemplate(xml)
      expect(doc.type).toBe('Document')
      expect(doc.children.length).toBeGreaterThan(0)
    })

    it.runIf(fs.existsSync(basicoPath))('empirically parses basico.xml workbench sample', () => {
      const xml = fs.readFileSync(basicoPath, 'utf8')
      const doc = parseTemplate(xml)
      expect(doc.type).toBe('Document')
      expect(doc.children.length).toBeGreaterThan(0)
    })

    it.runIf(fs.existsSync(laertesPath))('empirically parses laertes.xml workbench sample', () => {
      const xml = fs.readFileSync(laertesPath, 'utf8')
      const doc = parseTemplate(xml)
      expect(doc.type).toBe('Document')
      expect(doc.children.length).toBeGreaterThan(0)
    })
  })
})
