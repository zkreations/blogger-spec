import { describe, expect, it } from 'vitest'
import * as RootExports from '../src/index.js'
import {
  isStrictlySelfClosingTag as directIsSelfClosing,
  scanDirectiveTokens as directScan,
} from '../src/parser/directive-scanner.js'
import {
  directiveTokenToAstNode,
  getNearestUnclosedDirective,
  getNearestUnclosedTag,
  getUnclosedDirectiveStack,
  getUnclosedTagStack,
  HTML_VOID_ELEMENTS,
  isStrictlySelfClosingTag,
  maskCdataBlock,
  maskXmlCommentsAndCdata,
  parseAttributes,
  scanDirectiveTokens,
  STRICTLY_SELF_CLOSING_BLOGGER_TAGS,
} from '../src/parser/index.js'

describe('directive scanner suite', () => {
  describe('strictly self-closing tag classification', () => {
    it('identifies Blogger self-closing directives', () => {
      expect(isStrictlySelfClosingTag('b:include')).toBe(true)
      expect(isStrictlySelfClosingTag('b:eval')).toBe(true)
      expect(isStrictlySelfClosingTag('b:else')).toBe(true)
      expect(isStrictlySelfClosingTag('b:elseif')).toBe(true)
      expect(isStrictlySelfClosingTag('b:attr')).toBe(true)
      expect(isStrictlySelfClosingTag('b:class')).toBe(true)
      expect(isStrictlySelfClosingTag('b:param')).toBe(true)
      expect(isStrictlySelfClosingTag('b:template-script')).toBe(true)
      expect(isStrictlySelfClosingTag('Variable')).toBe(true)
    })

    it('identifies data: pseudo-directives as self-closing', () => {
      expect(isStrictlySelfClosingTag('data:post.title')).toBe(true)
      expect(isStrictlySelfClosingTag('data:blog.url')).toBe(true)
      expect(isStrictlySelfClosingTag('data:')).toBe(true)
    })

    it('identifies HTML void elements as self-closing', () => {
      expect(isStrictlySelfClosingTag('br')).toBe(true)
      expect(isStrictlySelfClosingTag('img')).toBe(true)
      expect(isStrictlySelfClosingTag('input')).toBe(true)
      expect(isStrictlySelfClosingTag('meta')).toBe(true)
      expect(isStrictlySelfClosingTag('hr')).toBe(true)
      expect(isStrictlySelfClosingTag('link')).toBe(true)
    })

    it('identifies container elements as non-self-closing', () => {
      expect(isStrictlySelfClosingTag('b:if')).toBe(false)
      expect(isStrictlySelfClosingTag('b:loop')).toBe(false)
      expect(isStrictlySelfClosingTag('b:section')).toBe(false)
      expect(isStrictlySelfClosingTag('b:widget')).toBe(false)
      expect(isStrictlySelfClosingTag('b:includable')).toBe(false)
      expect(isStrictlySelfClosingTag('b:with')).toBe(false)
      expect(isStrictlySelfClosingTag('div')).toBe(false)
      expect(isStrictlySelfClosingTag('span')).toBe(false)
    })

    it('exposes tag sets', () => {
      expect(STRICTLY_SELF_CLOSING_BLOGGER_TAGS.has('b:include')).toBe(true)
      expect(HTML_VOID_ELEMENTS.has('input')).toBe(true)
    })
  })

  describe('comments and CDATA masking', () => {
    it('masks XML comments while preserving length and newlines', () => {
      const input = '<div><!-- comment on line 1\nand line 2 --><span>text</span></div>'
      const masked = maskXmlCommentsAndCdata(input)
      expect(masked.length).toBe(input.length)
      expect(masked).not.toContain('comment')
      expect(masked).toContain('<div>')
      expect(masked).toContain('<span>text</span></div>')
      expect(masked.split('\n').length).toBe(input.split('\n').length)
    })

    it('masks <b:comment> directive tags and content', () => {
      const input = '<b:comment>Internal note</b:comment><div>Content</div>'
      const masked = maskXmlCommentsAndCdata(input)
      expect(masked.length).toBe(input.length)
      expect(masked).not.toContain('Internal note')
      expect(masked).toContain('<div>Content</div>')
    })

    it('masks standard CDATA blocks', () => {
      const input = '<![CDATA[var x = 10;]]>'
      const masked = maskCdataBlock(input)
      expect(masked.length).toBe(input.length)
      expect(masked.trim()).toBe('')
    })

    it('preserves <Variable> and <Group> declarations inside CDATA skin', () => {
      const input = `<![CDATA[
        body { color: red; }
        <Variable name="test" description="Desc" type="color" default="#fff" value="#fff"/>
        p { font-size: 14px; }
      ]]>`
      const masked = maskXmlCommentsAndCdata(input)
      expect(masked.length).toBe(input.length)
      expect(masked).toContain('<Variable name="test"')
      expect(masked).not.toContain('body {')
      expect(masked).not.toContain('p {')
    })
  })

  describe('attribute parsing', () => {
    it('parses double and single quoted attributes with exact offsets', () => {
      const raw = ' id="main" expr:title=\'data:blog.title\' '
      const attrs = parseAttributes(raw, 10)

      expect(attrs.id).toBeDefined()
      expect(attrs.id.name).toBe('id')
      expect(attrs.id.value).toBe('main')
      expect(attrs.id.quote).toBe('"')
      expect(attrs.id.start).toBe(10 + raw.indexOf('id="main"'))
      expect(attrs.id.valueStart).toBe(10 + raw.indexOf('"main"') + 1)
      expect(attrs.id.valueEnd).toBe(attrs.id.valueStart + 4)

      expect(attrs['expr:title']).toBeDefined()
      expect(attrs['expr:title'].value).toBe('data:blog.title')
      expect(attrs['expr:title'].quote).toBe('\'')
    })

    it('parses unquoted attributes and boolean attributes', () => {
      const raw = 'disabled required=true'
      const attrs = parseAttributes(raw, 0)

      expect(attrs.disabled).toBeDefined()
      expect(attrs.disabled.value).toBe('')
      expect(attrs.disabled.quote).toBeUndefined()

      expect(attrs.required).toBeDefined()
      expect(attrs.required.value).toBe('true')
      expect(attrs.required.quote).toBeUndefined()
    })
  })

  describe('directive token scanner', () => {
    it('scans self-closing directives and calculates correct boundaries', () => {
      const xml = '<b:include name=\'header\' />'
      const tokens = scanDirectiveTokens(xml)

      expect(tokens).toHaveLength(1)
      const t = tokens[0]!
      expect(t.tagName).toBe('b:include')
      expect(t.isClosing).toBe(false)
      expect(t.isSelfClosing).toBe(true)
      expect(t.hasSelfClosingSlash).toBe(true)
      expect(t.tagStart).toBe(0)
      expect(t.tagEnd).toBe(xml.length)
      expect(t.attributes.name?.value).toBe('header')
    })

    it('recognizes naturally self-closing tags without slash', () => {
      const xml = '<b:eval expr=\'data:view.title\'><data:blog.title>'
      const tokens = scanDirectiveTokens(xml)

      expect(tokens).toHaveLength(2)
      expect(tokens[0]!.tagName).toBe('b:eval')
      expect(tokens[0]!.isSelfClosing).toBe(true)
      expect(tokens[0]!.hasSelfClosingSlash).toBe(false)

      expect(tokens[1]!.tagName).toBe('data:blog.title')
      expect(tokens[1]!.isSelfClosing).toBe(true)
    })

    it('does not terminate tags on > inside attribute expressions', () => {
      const xml = '<b:if cond=\'data:posts.length > 0 and 10 > 5\'>content</b:if>'
      const tokens = scanDirectiveTokens(xml)

      expect(tokens).toHaveLength(2)
      const openToken = tokens[0]!
      expect(openToken.tagName).toBe('b:if')
      expect(openToken.isClosing).toBe(false)
      expect(openToken.attributes.cond?.value).toBe('data:posts.length > 0 and 10 > 5')

      const closeToken = tokens[1]!
      expect(closeToken.tagName).toBe('b:if')
      expect(closeToken.isClosing).toBe(true)
    })

    it('is fault-tolerant on malformed or incomplete XML', () => {
      const malformed = '<b:section <b:if cond="true"> <b:loop'
      const tokens = scanDirectiveTokens(malformed)
      expect(Array.isArray(tokens)).toBe(true)
      expect(tokens.length).toBeGreaterThanOrEqual(1)
      expect(tokens.some(t => t.tagName === 'b:if')).toBe(true)
    })

    it('respects stopAtOffset option', () => {
      const xml = '<b:section id="sec1"><b:widget id="wid1"/></b:section>'
      const tokens = scanDirectiveTokens(xml, { stopAtOffset: 25 })
      expect(tokens.length).toBeLessThan(3)
    })
  })

  describe('unclosed directive stack tracking', () => {
    it('computes stack of unclosed container directives', () => {
      const xml = `
        <b:section id='main'>
          <b:widget id='Blog1' type='Blog'>
            <b:includable id='main'>
              <b:if cond='data:view.isPost'>
                <p>Post</p>
                <div class='post-body'>
      `
      const stack = getUnclosedDirectiveStack(xml)
      expect(stack).toEqual(['b:section', 'b:widget', 'b:includable', 'b:if', 'div'])
      expect(getNearestUnclosedDirective(xml)).toBe('div')
    })

    it('correctly pops stack on closing tags', () => {
      const xml = `
        <b:section id='main'>
          <b:if cond='data:view.isPost'>
            <p>Post</p>
          </b:if>
        </b:section>
      `
      const stack = getUnclosedDirectiveStack(xml)
      expect(stack).toEqual([])
      expect(getNearestUnclosedDirective(xml)).toBeUndefined()
    })

    it('provides tag stack aliases', () => {
      const xml = '<b:section id="main">'
      expect(getUnclosedTagStack(xml)).toEqual(['b:section'])
      expect(getNearestUnclosedTag(xml)).toBe('b:section')
    })
  })

  describe('aST node conversion', () => {
    it('converts directive token to AST node with expression flags', () => {
      const xml = '<b:include name=\'post\' data=\'post\' expr:cond=\'data:view.isPost\' />'
      const [token] = scanDirectiveTokens(xml)
      expect(token).toBeDefined()

      const astNode = directiveTokenToAstNode(token!)
      expect(astNode.type).toBe('Directive')
      expect(astNode.name).toBe('b:include')
      expect(astNode.selfClosing).toBe(true)
      expect(astNode.attributes).toHaveLength(3)

      const condAttr = astNode.attributes.find(a => a.name === 'expr:cond')
      expect(condAttr?.isExpression).toBe(true)
      expect(condAttr?.value).toBe('data:view.isPost')

      const dataAttr = astNode.attributes.find(a => a.name === 'data')
      expect(dataAttr?.isExpression).toBe(true)
      expect(dataAttr?.value).toBe('post')

      const nameAttr = astNode.attributes.find(a => a.name === 'name')
      expect(nameAttr?.isExpression).toBe(false)
      expect(nameAttr?.value).toBe('post')
    })

    it('identifies native expression attributes from catalog without expr: prefix', () => {
      const loopXml = '<b:loop values=\'data:posts\' var=\'post\'>'
      const [loopToken] = scanDirectiveTokens(loopXml)
      const loopAst = directiveTokenToAstNode(loopToken!)
      expect(loopAst.attributes.find(a => a.name === 'values')?.isExpression).toBe(true)
      expect(loopAst.attributes.find(a => a.name === 'var')?.isExpression).toBe(false)

      const withXml = '<b:with value=\'data:blog.title\' var=\'title\'>'
      const [withToken] = scanDirectiveTokens(withXml)
      const withAst = directiveTokenToAstNode(withToken!)
      expect(withAst.attributes.find(a => a.name === 'value')?.isExpression).toBe(true)
      expect(withAst.attributes.find(a => a.name === 'var')?.isExpression).toBe(false)

      const evalXml = '<b:eval expr=\'data:view.title\' />'
      const [evalToken] = scanDirectiveTokens(evalXml)
      const evalAst = directiveTokenToAstNode(evalToken!)
      expect(evalAst.attributes.find(a => a.name === 'expr')?.isExpression).toBe(true)
    })
  })

  describe('root and direct exports', () => {
    it('exports scanner functions identically across entry points', () => {
      const xml = '<b:include name="test" />'
      expect(RootExports.scanDirectiveTokens(xml)).toEqual(directScan(xml))
      expect(RootExports.isStrictlySelfClosingTag('b:include')).toBe(directIsSelfClosing('b:include'))
    })
  })
})
