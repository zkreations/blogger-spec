import { describe, expect, it } from 'vitest'
import { getSpecCatalog } from '../src/catalogs/index.js'
import { isValidWidgetIdForType } from '../src/context/widget-extractor.js'
import { evaluateExpression } from '../src/parser/expr-evaluator.js'
import { resizeImage } from '../src/parser/operators/image-transforms.js'
import { snippet } from '../src/parser/operators/text-transforms.js'
import { validateTemplateStructure } from '../src/parser/template-validator.js'
import { ScopeEnvironment } from '../src/scope.js'
import { isTruthy } from '../src/type-system.js'

describe('empirical Blogger Core conformance (Phase 2 audit findings)', () => {
  const catalog = getSpecCatalog()

  describe('compiler limits & scope dictionary stack (43 limit)', () => {
    it('exposes max_scope_dictionary_depth of 43 in catalog and scope environment', () => {
      expect(catalog.getScopeDictionaryLimit()).toBe(43)
      const scope = new ScopeEnvironment(catalog)
      expect(scope.getScopeDictionaryLimit()).toBe(43)
      expect(scope.isDictionaryLimitExceeded()).toBe(false)
    })
  })

  describe('widget ID boundaries & integer parsing (BX1047)', () => {
    it('accepts canonical ID up to 1000 without BX1047 diagnostic', () => {
      const xml = `
        <b:section id='main'>
          <b:widget id='HTML1000' type='HTML'/>
          <b:widget id='Blog1' type='Blog'/>
        </b:section>
      `
      const diags = validateTemplateStructure(xml)
      expect(diags.filter(d => d.code === 'BX1047')).toHaveLength(0)
      expect(isValidWidgetIdForType('HTML1000', 'HTML')).toBe(true)
    })

    it('rejects widget ID above 1000 with BX1047 diagnostic', () => {
      const xml = `
        <b:section id='main'>
          <b:widget id='HTML1001' type='HTML'/>
        </b:section>
      `
      const diags = validateTemplateStructure(xml)
      const diag = diags.find(d => d.code === 'BX1047')
      expect(diag).toBeDefined()
      expect(diag?.message).toContain('HTML1001')
      expect(isValidWidgetIdForType('HTML1001', 'HTML')).toBe(false)
    })

    it('accepts extended integer IDs in [-2147483648, 1000] supported by Blogger Core', () => {
      const xml = `
        <b:section id='main'>
          <b:widget id='HTML-2147483648' type='HTML'/>
          <b:widget id='HTML-1000' type='HTML'/>
          <b:widget id='HTML007' type='HTML'/>
          <b:widget id='HTML0' type='HTML'/>
        </b:section>
      `
      const diags = validateTemplateStructure(xml)
      expect(diags.filter(d => d.code === 'BX1047')).toHaveLength(0)
      expect(isValidWidgetIdForType('HTML-2147483648', 'HTML')).toBe(true)
      expect(isValidWidgetIdForType('HTML-1000', 'HTML')).toBe(true)
      expect(isValidWidgetIdForType('HTML007', 'HTML')).toBe(true)
      expect(isValidWidgetIdForType('HTML0', 'HTML')).toBe(true)
    })

    it('rejects negative overflow below -2147483648 with BX1047 diagnostic', () => {
      const xml = `
        <b:section id='main'>
          <b:widget id='HTML-2147483649' type='HTML'/>
        </b:section>
      `
      const diags = validateTemplateStructure(xml)
      const diag = diags.find(d => d.code === 'BX1047')
      expect(diag).toBeDefined()
      expect(diag?.message).toContain('HTML-2147483649')
      expect(isValidWidgetIdForType('HTML-2147483649', 'HTML')).toBe(false)
    })
  })

  describe('resizeImage empirical transforms', () => {
    const googleUrl = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh/s1600/test.jpg'

    it('applies crop flags for horizontal and square aspect ratios', () => {
      const horizontal = String(resizeImage(googleUrl, 400, '16:9'))
      expect(horizontal).toBe('https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh/w400-h225-p-k-no-nu/test.jpg')

      const square = String(resizeImage(googleUrl, 400, '1:1'))
      expect(square).toBe('https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh/w400-h400-p-k-no-nu/test.jpg')
    })

    it('ignores vertical aspect ratio (H > W) and produces solely w{width}', () => {
      const vertical = String(resizeImage(googleUrl, 400, '9:16'))
      expect(vertical).toBe('https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh/w400/test.jpg')
      expect(vertical).not.toContain('-p-k-no-nu')
    })

    it('strips sizing parameters completely when width is negative', () => {
      const neg1 = String(resizeImage(googleUrl, -1))
      expect(neg1).toBe('https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh/test.jpg')

      const negBig = String(resizeImage(googleUrl, -151654))
      expect(negBig).toBe('https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh/test.jpg')
    })

    it('formats width 0 cleanly as w0', () => {
      const zero = String(resizeImage(googleUrl, 0))
      expect(zero).toBe('https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh/w0/test.jpg')
    })

    it('emulates Java 32-bit signed integer overflow arithmetic', () => {
      const overflow = String(resizeImage(googleUrl, '-999999999999999999999999'))
      expect(overflow).toBe('https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh/w1593835521/test.jpg')
    })
  })

  describe('snippet function formatting and floor limits', () => {
    it('preserves basic HTML tags without truncation when length is omitted', () => {
      const html = '<b>Texto en negrita</b> y enlace <a href="#">link</a> sin length'
      const result = snippet(html)
      expect(result).toBe('<b>Texto en negrita</b> y enlace <a href="#">link</a> sin length')
    })

    it('enforces a minimum floor of 50 characters when length < 50 is provided', () => {
      const text = 'Texto corto para verificar el piso minimo de cincuenta caracteres exactos.'
      const result = snippet(text, { length: 10 })
      expect(result.length).toBe(50)
      expect(result.endsWith('\u2026')).toBe(true)
    })
  })

  describe('collection truthiness in Blogger Core', () => {
    it('evaluates empty arrays [] as truthy', () => {
      expect(isTruthy([])).toBe(true)
      expect(evaluateExpression('[] ? "TRUTHY" : "FALSY"', {})).toBe('TRUTHY')
      expect(evaluateExpression('[].empty ? "EMPTY" : "NOT_EMPTY"', {})).toBe('EMPTY')
      expect(evaluateExpression('[].notEmpty ? "HAS_ITEMS" : "EMPTY"', {})).toBe('EMPTY')
    })
  })

  describe('plusChain variadic concatenation', () => {
    it('evaluates unparenthesized additions with text as string concatenation left-to-right', () => {
      expect(evaluateExpression('20 + 25 + ""', {})).toBe('2025')
      expect(evaluateExpression('(20 + 25) + ""', {})).toBe('45')
      expect(evaluateExpression('1 + 2 + "a" + 3 + 4', {})).toBe('12a34')
    })
  })
})
