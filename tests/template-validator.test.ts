import { describe, expect, it } from 'vitest'
import {
  canNest,
  getThemeDesignerDescriptions,
  getVariableTypeAttributes,
  validateDirectiveAttributes,
  validateVariableAttributes,
} from '../src/catalogs/index.js'
import * as RootExports from '../src/index.js'
import {
  scanDirectiveTokens,
  unescapeXmlEntitiesWithSourceMap,
  validateDirectiveNesting,
  validateExpression,
  validateTemplateExpressions,
  validateTemplateStructure,
} from '../src/parser/index.js'

describe('helpers & canonical structure validation suite', () => {
  describe('theme designer descriptions and variable types', () => {
    it('returns predefined theme designer description strings', () => {
      const descriptions = getThemeDesignerDescriptions()
      expect(descriptions.length).toBeGreaterThan(200)
      expect(descriptions).toContain('Text Color')
      expect(descriptions).toContain('Background Color')
      expect(descriptions).toContain('Font')
    })

    it('validates variable attributes by variable type', () => {
      // 1. Valid color variable
      const validColor = validateVariableAttributes('color', ['name', 'description', 'type', 'default', 'value'])
      expect(validColor.valid).toBe(true)
      expect(validColor.invalidAttributes).toHaveLength(0)
      expect(validColor.missingAttributes).toHaveLength(0)

      // 2. Prohibited XML tag attributes on color (red, green, blue are runtime modifiers, not XML tag attributes)
      const invalidColor = validateVariableAttributes('color', ['name', 'type', 'red', 'green', 'blue'])
      expect(invalidColor.valid).toBe(false)
      expect(invalidColor.invalidAttributes).toContain('red')
      expect(invalidColor.invalidAttributes).toContain('green')
      expect(invalidColor.invalidAttributes).toContain('blue')

      // 3. Length attributes (min, max)
      const validLength = validateVariableAttributes('length', ['name', 'description', 'type', 'min', 'max', 'default', 'value'])
      expect(validLength.valid).toBe(true)

      // 4. Background attributes (color)
      const validBg = validateVariableAttributes('background', ['name', 'description', 'type', 'color', 'default', 'value'])
      expect(validBg.valid).toBe(true)

      // 5. Missing mandatory attributes
      const missingAttrs = validateVariableAttributes('color', ['description', 'value'])
      expect(missingAttrs.valid).toBe(false)
      expect(missingAttrs.missingAttributes).toContain('name')
      expect(missingAttrs.missingAttributes).toContain('type')
    })

    it('returns full attribute definition maps when no type is provided', () => {
      const allTypeAttrs = getVariableTypeAttributes()
      expect(allTypeAttrs).toBeDefined()
      expect(allTypeAttrs?.color).toBeDefined()
      expect(allTypeAttrs?.font).toBeDefined()
      expect(allTypeAttrs?.length).toBeDefined()
    })
  })

  describe('directive nesting validation', () => {
    it('detects nested section error with reject action (BX1035)', () => {
      const violation = validateDirectiveNesting('b:section', 'b:section')
      expect(violation).not.toBeNull()
      expect(violation?.code).toBe('BX1035')
      expect(violation?.rule.name).toBe('NESTED_SECTION')
      expect(violation?.action).toBe('reject')
    })

    it('detects widget outside section error with reject action (BX1034)', () => {
      const violation = validateDirectiveNesting('body', 'b:widget')
      expect(violation).not.toBeNull()
      expect(violation?.code).toBe('BX1034')
      expect(violation?.rule.name).toBe('WIDGET_OUTSIDE_SECTION')
      expect(violation?.action).toBe('reject')
    })

    it('detects invalid child in b:section with strip action (BX1023)', () => {
      const violation = validateDirectiveNesting('b:section', 'div')
      expect(violation).not.toBeNull()
      expect(violation?.code).toBe('BX1023')
      expect(violation?.action).toBe('strip')
    })

    it('detects content inside b:eval with ignore action (BX1013)', () => {
      const violation = validateDirectiveNesting('b:eval', 'div')
      expect(violation).not.toBeNull()
      expect(violation?.code).toBe('BX1013')
      expect(violation?.action).toBe('ignore')
    })

    it('detects prohibited nesting for directives with restricted parents/children (BX1023)', () => {
      const v1 = validateDirectiveNesting('b:include', 'b:param')
      expect(v1).not.toBeNull()
      expect(v1?.code).toBe('BX1023')
      expect(v1?.rule.name).toBe('PROHIBITED_NESTING')
      expect(v1?.action).toBe('reject')

      const v2 = validateDirectiveNesting('b:if', 'b:case')
      expect(v2).not.toBeNull()
      expect(v2?.code).toBe('BX1023')

      const v3 = validateDirectiveNesting('b:loop', 'b:else')
      expect(v3).not.toBeNull()
      expect(v3?.code).toBe('BX1023')
    })

    it('permits valid parent-child relationships including flow directives and HTML', () => {
      expect(validateDirectiveNesting('b:section', 'b:widget')).toBeNull()
      expect(validateDirectiveNesting('body', 'b:section')).toBeNull()
      expect(validateDirectiveNesting('div', 'b:section')).toBeNull()
      expect(validateDirectiveNesting('header', 'b:section')).toBeNull()
      expect(validateDirectiveNesting('head', 'b:section')?.code).toBe('BX1023')
      expect(validateDirectiveNesting('b:widget', 'b:includable')).toBeNull()
      expect(validateDirectiveNesting('b:defaultmarkup', 'b:includable')).toBeNull()
      expect(validateDirectiveNesting('b:includable', 'b:if')).toBeNull()
      expect(validateDirectiveNesting('b:includable', 'div')).toBeNull()
      expect(validateDirectiveNesting('div', 'b:if')).toBeNull()
      expect(validateDirectiveNesting('b:if', 'b:loop')).toBeNull()
      expect(validateDirectiveNesting('b:loop', 'b:eval')).toBeNull()
      expect(validateDirectiveNesting('b:loop', 'data:post.title')).toBeNull()
      expect(validateDirectiveNesting('b:switch', 'b:case')).toBeNull()
      expect(validateDirectiveNesting('b:if', 'b:else')).toBeNull()
      expect(validateDirectiveNesting('b:message', 'b:param')).toBeNull()
      expect(validateDirectiveNesting('html', 'b:include')).toBeNull()
      expect(validateDirectiveNesting('b:if', 'b:skin')).toBeNull()
      expect(validateDirectiveNesting('b:if', 'b:template-skin')).toBeNull()
      expect(validateDirectiveNesting('html', 'b:skin')).toBeNull()
      expect(validateDirectiveNesting('html', 'b:template-skin')).toBeNull()
      expect(validateDirectiveNesting('head', 'b:skin')).toBeNull()
      expect(validateDirectiveNesting('body', 'b:skin')).toBeNull()
      expect(validateDirectiveNesting('b:includable', 'b:skin')).toBeNull()
      expect(validateDirectiveNesting('b:widget', 'b:skin')?.code).toBe('BX1023')
      expect(validateDirectiveNesting('b:section', 'b:skin')?.code).toBe('BX1023')
    })

    it('validates strictly scoped styling directives (Group and Variable)', () => {
      // Valid styling hierarchy in skin
      expect(validateDirectiveNesting('b:skin', 'CDATA')).toBeNull()
      expect(validateDirectiveNesting('b:skin', 'Group')).toBeNull()
      expect(validateDirectiveNesting('b:skin', 'Variable')).toBeNull()
      expect(validateDirectiveNesting('Group', 'Variable')).toBeNull()

      // Exclusivity: Group and Variable prohibited outside b:skin
      expect(validateDirectiveNesting('b:template-skin', 'Group')?.code).toBe('BX1023')
      expect(validateDirectiveNesting('b:template-skin', 'Variable')?.code).toBe('BX1023')
      expect(validateDirectiveNesting('CDATA', 'Group')?.code).toBe('BX1023')
      expect(validateDirectiveNesting('CDATA', 'Variable')?.code).toBe('BX1023')

      // Invalid styling nesting
      const v1 = validateDirectiveNesting('Group', 'div')
      expect(v1).not.toBeNull()
      expect(v1?.code).toBe('BX1023')
      expect(v1?.action).toBe('reject')

      const v2 = validateDirectiveNesting('Group', 'Group')
      expect(v2).not.toBeNull()
      expect(v2?.code).toBe('BX1023')

      const v3 = validateDirectiveNesting('b:includable', 'Variable')
      expect(v3).not.toBeNull()
      expect(v3?.code).toBe('BX1023')

      const v4 = validateDirectiveNesting('div', 'Variable')
      expect(v4).not.toBeNull()
      expect(v4?.code).toBe('BX1023')

      const v5 = validateDirectiveNesting('Variable', 'div')
      expect(v5).not.toBeNull()
      expect(v5?.code).toBe('BX1023')
    })

    it('rejects hallucinated directives (b:for, b:set) within structured layout containers (BX1023)', () => {
      const vFor = validateDirectiveNesting('b:section', 'b:for')
      expect(vFor).not.toBeNull()
      expect(vFor?.code).toBe('BX1023')

      const vSet = validateDirectiveNesting('b:section', 'b:set')
      expect(vSet).not.toBeNull()
      expect(vSet?.code).toBe('BX1023')
    })
  })

  describe('template structure validator', () => {
    it('returns empty diagnostics for valid well-structured template', () => {
      const xml = `
        <b:section id='main'>
          <b:widget id='Blog1' type='Blog'>
            <b:includable id='main'>
              <p>Hello</p>
            </b:includable>
          </b:widget>
        </b:section>
      `
      const diags = validateTemplateStructure(xml)
      expect(diags).toHaveLength(0)
    })

    it('detects nested <b:section> (BX1035)', () => {
      const xml = `
        <b:section id='outer'>
          <b:section id='inner'>
            <b:widget id='Blog1' type='Blog'/>
          </b:section>
        </b:section>
      `
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1035')).toBe(true)
      const diag = diags.find(d => d.code === 'BX1035')
      expect(diag?.rule.name).toBe('NESTED_SECTION')
    })

    it('detects <b:widget> outside <b:section> (BX1034)', () => {
      const xml = `
        <header>
          <b:widget id='Header1' type='Header'/>
        </header>
      `
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1034')).toBe(true)
    })

    it('detects top-level <b:widget> without enclosing <b:section> (BX1034)', () => {
      const xml = `<b:widget id='Header1' type='Header'/>`
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1034')).toBe(true)
    })

    it('detects top-level <b:includable> without enclosing widget or defaultmarkup (BX1023)', () => {
      const xml = `<b:includable id='main'/>`
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1023')).toBe(true)
    })

    it('detects top-level <b:case> without enclosing <b:switch> (BX1023)', () => {
      const xml = `<b:case value='true'/>`
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1023')).toBe(true)
    })

    it('detects hallucinated directives such as <b:for> in template structure (BX1001)', () => {
      const xml = `
        <b:section id='main'>
          <b:widget id='Blog1' type='Blog'>
            <b:includable id='main'>
              <b:for each='post' in='data:posts'>
                <p>Hello</p>
              </b:for>
            </b:includable>
          </b:widget>
        </b:section>
      `
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1001')).toBe(true)
    })

    it('detects all hallucinated directives with their dedicated diagnostic codes (BX1001-BX1012)', () => {
      const hallucinatedSamples: Record<string, string> = {
        'b:for': 'BX1001',
        'b:each': 'BX1002',
        'b:set': 'BX1003',
        'b:var': 'BX1004',
        'b:let': 'BX1005',
        'b:else-if': 'BX1006',
        'b:choose': 'BX1007',
        'b:when': 'BX1008',
        'b:otherwise': 'BX1009',
        'b:template': 'BX1010',
        'b:macro': 'BX1011',
        'b:function': 'BX1012',
      }

      for (const [tag, expectedCode] of Object.entries(hallucinatedSamples)) {
        const xml = `
          <b:section id='main'>
            <b:widget id='Blog1' type='Blog'>
              <b:includable id='main'>
                <${tag}/>
              </b:includable>
            </b:widget>
          </b:section>
        `
        const diags = validateTemplateStructure(xml)
        expect(diags.some(d => d.code === expectedCode)).toBe(true)
      }
    })

    it('detects duplicate element id across sections and widgets (BX1033)', () => {
      const xml = `
        <b:section id='main'>
          <b:widget id='Blog1' type='Blog'/>
        </b:section>
        <b:section id='Blog1'>
        </b:section>
      `
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1033')).toBe(true)
      const diag = diags.find(d => d.code === 'BX1033')
      expect(diag?.message).toContain('Blog1')
    })

    it('detects invalid widget id format for declared type (BX1047)', () => {
      const xml = `
        <b:section id='main'>
          <b:widget id='global_collision_id' type='Blog'/>
        </b:section>
      `
      const diags = validateTemplateStructure(xml)
      const invalidId = diags.find(d => d.code === 'BX1047')
      expect(invalidId).toBeDefined()
      expect(invalidId?.message).toContain('global_collision_id')
      expect(invalidId?.message).toContain('Blog')
    })

    it('accepts valid widget id matching type and numeric suffix (1-999)', () => {
      const xml = `
        <b:section id='main'>
          <b:widget id='Blog1' type='Blog'/>
          <b:widget id='Header999' type='Header'/>
          <b:widget id='HTML12' type='HTML'/>
        </b:section>
      `
      const diags = validateTemplateStructure(xml)
      expect(diags.filter(d => d.code === 'BX1047')).toHaveLength(0)
    })

    it('detects duplicate <b:includable> id inside the same widget (BX1036)', () => {
      const xml = `
        <b:section id='main'>
          <b:widget id='Blog1' type='Blog'>
            <b:includable id='post'/>
            <b:includable id='post'/>
          </b:widget>
        </b:section>
      `
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1036')).toBe(true)
      const diag = diags.find(d => d.code === 'BX1036')
      expect(diag?.rule.name).toBe('DUPLICATE_INCLUDABLE_ID')
    })

    it('allows identical <b:includable> id across distinct widgets', () => {
      const xml = `
        <b:section id='main'>
          <b:widget id='Blog1' type='Blog'>
            <b:includable id='main'/>
          </b:widget>
          <b:widget id='Header1' type='Header'>
            <b:includable id='main'/>
          </b:widget>
        </b:section>
      `
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1036')).toBe(false)
    })

    it('detects empty required attributes (BX1039)', () => {
      const xml = `
        <b:section id=''>
          <b:widget id='Blog1' type='Blog'/>
        </b:section>
      `
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1039')).toBe(true)
    })

    it('detects invalid <Variable> attributes (BX1040)', () => {
      const xml = `
        <b:skin><![CDATA[
          <Variable name="theme.color" description="Theme Color" type="color" value="#ff0000" red="100" default="#ff0000"/>
        ]]></b:skin>
      `
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1040')).toBe(true)
      const diag = diags.find(d => d.code === 'BX1040')
      expect(diag?.message).toContain('red')
    })

    it('detects missing mandatory attributes on <Variable> (BX1022)', () => {
      const xml = `
        <b:skin><![CDATA[
          <Group description="Theme Colors">
            <Variable name="primaryColor" description="Primary Brand Color" default="#ffffff" value="#ffffff"/>
          </Group>
        ]]></b:skin>
      `
      const diags = validateTemplateStructure(xml)
      const missingType = diags.find(d => d.code === 'BX1022' && d.message.includes('\'type\''))
      expect(missingType).toBeDefined()
      expect(missingType?.tagName).toBe('Variable')
    })

    it('detects missing mandatory directive attributes (BX1022)', () => {
      const xml = '<b:loop var="i"><data:i/></b:loop>'
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1022')).toBe(true)
      const diag = diags.find(d => d.code === 'BX1022')
      expect(diag?.message).toContain('values')
    })

    it('detects mismatched closing tags (BX1041)', () => {
      const diags = validateTemplateStructure('<b:section id="main"><b:widget id="Blog1"/></b:section>')
      expect(diags.some(d => d.code === 'BX1041')).toBe(false)

      const malformed = validateTemplateStructure('<b:section id="main"><b:widget id="Blog1"></b:section>')
      expect(malformed.some(d => d.code === 'BX1041')).toBe(true)
    })

    it('detects unclosed tags at the end of a document (BX1041)', () => {
      const diags = validateTemplateStructure('<b:section id="main"><b:widget id="Blog1"/>')
      expect(diags.some(d => d.code === 'BX1041')).toBe(true)
    })

    it('detects prohibited closing tag on self-closing <b:eval> (BX1013)', () => {
      const diags = validateTemplateStructure('<b:eval expr="data:blog.title"></b:eval>')
      expect(diags.some(d => d.code === 'BX1013')).toBe(true)
    })

    it('detects inverted <b:includable> and <b:include> attributes (BX1015 / BX1016)', () => {
      const xml = `
        <b:section id='main'>
          <b:widget id='Blog1' type='Blog'>
            <b:includable name='mainWidget'>
              <b:include id='mainWidget'/>
            </b:includable>
          </b:widget>
        </b:section>
      `
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1015')).toBe(true)
      expect(diags.some(d => d.code === 'BX1016')).toBe(true)
    })

    it('detects inverted <b:switch expr=...> instead of var (BX1014)', () => {
      const xml = '<b:switch expr="data:view.pageType"><b:case value="item"/></b:switch>'
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1014')).toBe(true)
    })

    it('detects deprecated directive attributes (BX1024)', () => {
      const xml = '<b:widget id="Header1" type="Header" mobile="yes"/>'
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1024')).toBe(true)
    })

    it('detects invalid expressions on static literal attributes (BX1042)', () => {
      const xml = '<b:section expr:id="data:blog.id"/>'
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1042')).toBe(true)
      const diag = diags.find(d => d.message.includes('expr:id'))
      expect(diag).toBeDefined()
      expect(diag?.message).toContain('expr:id')
      expect(diag?.rule.name).toBe('DISALLOWED_EXPRESSION_ATTRIBUTE')
    })

    it('allows valid dynamic expr: attributes on dynamic directives', () => {
      const xml = `
        <b:section id='main'>
          <b:widget id='Blog1' type='Blog'>
            <b:includable id='main'>
              <b:include expr:name='data:view.inc'/>
            </b:includable>
          </b:widget>
        </b:section>
      `
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1022')).toBe(false)
    })

    it('permits flexible XML structure (b:include under html, b:skin and b:template-skin under b:if)', () => {
      const xml1 = '<html><b:include name="foo"/></html>'
      expect(validateTemplateStructure(xml1)).toEqual([])

      const xml2 = '<html><head><b:if cond="true"><b:skin><![CDATA[/* */]]></b:skin></b:if></head></html>'
      expect(validateTemplateStructure(xml2)).toEqual([])

      const xml3 = '<html><head><b:if cond="true"><b:template-skin><![CDATA[/* */]]></b:template-skin></b:if></head></html>'
      expect(validateTemplateStructure(xml3)).toEqual([])

      const xml4 = '<html><b:skin><![CDATA[/* */]]></b:skin><b:template-skin><![CDATA[/* */]]></b:template-skin></html>'
      expect(validateTemplateStructure(xml4)).toEqual([])
    })

    it('rejects b:skin and b:template-skin inside widgets with strip action (BX1023)', () => {
      const xml1 = '<b:section id="main"><b:widget id="Blog1" type="Blog"><b:includable id="main"><b:skin><![CDATA[/* */]]></b:skin></b:includable></b:widget></b:section>'
      const diags1 = validateTemplateStructure(xml1)
      expect(diags1.some(d => d.code === 'BX1023')).toBe(true)
      expect(diags1[0]?.message).toContain('widgets')

      const xml2 = '<b:section id="main"><b:widget id="Blog1" type="Blog"><b:includable id="main"><b:if cond="true"><b:skin><![CDATA[/* */]]></b:skin></b:if></b:includable></b:widget></b:section>'
      const diags2 = validateTemplateStructure(xml2)
      expect(diags2.some(d => d.code === 'BX1023')).toBe(true)
      expect(diags2[0]?.message).toContain('widgets')
    })

    it('permits b:skin inside b:includable when declared under b:defaultmarkups', () => {
      const xml = `
        <b:defaultmarkups>
          <b:defaultmarkup type='Common'>
            <b:includable id='@skin'>
              <b:skin><![CDATA[ body { color: red; } ]]></b:skin>
            </b:includable>
          </b:defaultmarkup>
        </b:defaultmarkups>
      `
      expect(validateTemplateStructure(xml)).toEqual([])
    })

    it('accepts native expression reverse and expr:reverse in b:loop without BX1043', () => {
      const xml = `
        <b:with value='true' var='order'>
          <b:loop expr:reverse='data:order' values='[1, 2, 3, 4]' var='number'>
            <b:eval expr='data:number'/>
          </b:loop>
          <b:loop reverse='data:order' values='[1, 2, 3, 4]' var='number'>
            <b:eval expr='data:number'/>
          </b:loop>
          <b:loop expr:reverse='"data:" + "order"' values='[1, 2, 3, 4]' var='number'>
            <b:eval expr='data:number'/>
          </b:loop>
        </b:with>
      `
      expect(validateTemplateStructure(xml)).toEqual([])
    })

    it('operates identically when passed pre-scanned tokens', () => {
      const xml = '<b:section id="s1"><b:section id="s2"/></b:section>'
      const tokens = scanDirectiveTokens(xml)
      const fromTokens = validateTemplateStructure(tokens)
      const fromXml = validateTemplateStructure(xml)
      expect(fromTokens).toEqual(fromXml)
    })

    it('is exported identically from root index', () => {
      expect(RootExports.validateDirectiveNesting).toBe(validateDirectiveNesting)
      expect(RootExports.validateTemplateStructure).toBe(validateTemplateStructure)
      expect(RootExports.validateVariableAttributes).toBe(validateVariableAttributes)
      expect(RootExports.validateDirectiveAttributes).toBe(validateDirectiveAttributes)
    })
  })

  describe('directive attributes validation helper', () => {
    it('accepts expr: prefix for attributes that support expressions', () => {
      const result = validateDirectiveAttributes('b:include', ['expr:name'])
      expect(result.valid).toBe(true)
      expect(result.missingRequired).toEqual([])
      expect(result.invalidExpressions).toEqual([])
    })

    it('rejects expr: prefix on static literal attributes', () => {
      const result = validateDirectiveAttributes('b:widget', ['expr:id', 'type'])
      expect(result.valid).toBe(false)
      expect(result.invalidExpressions).toContain('expr:id')
      expect(result.missingRequired).toContain('id')
    })

    it('identifies missing required attributes when neither literal nor expr is provided', () => {
      const result = validateDirectiveAttributes('b:include', ['cond'])
      expect(result.valid).toBe(false)
      expect(result.missingRequired).toContain('name')
    })

    it('allows arbitrary attributes on directives configured with arbitrary_attributes (b:tag)', () => {
      const result = validateDirectiveAttributes('b:tag', ['name', 'class', 'expr:id', 'data-custom'])
      expect(result.valid).toBe(true)
      expect(result.unknown).toEqual([])
    })

    it('exempts <b:attr value=""/> from BX1039 because empty value deletes the parent attribute', () => {
      const xml = `
        <div>
          <b:attr name="title" value=""/>
        </div>
      `
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1039')).toBe(false)
    })

    it('exempts <Variable type="string" value=""/> from BX1039 but enforces non-empty value on other variable types', () => {
      const validStringVariable = `
        <b:skin><![CDATA[
          <Variable name="d.favicon" description="HD favicon" type="string" value=""/>
        ]]></b:skin>
      `
      const validDiags = validateTemplateStructure(validStringVariable)
      expect(validDiags.filter(d => d.code === 'BX1039')).toHaveLength(0)

      const invalidColorVariable = `
        <b:skin><![CDATA[
          <Variable name="theme.color" description="Theme Color" type="color" value="" default="#ffffff"/>
        ]]></b:skin>
      `
      const invalidDiags = validateTemplateStructure(invalidColorVariable)
      expect(invalidDiags.some(d => d.code === 'BX1039')).toBe(true)
    })

    it('allows <b:with expr:var="..."> dynamic variable alias declaration', () => {
      const result = validateDirectiveAttributes('b:with', ['expr:var', 'value'])
      expect(result.valid).toBe(true)
      expect(result.missingRequired).toEqual([])
      expect(result.invalidExpressions).toEqual([])
    })

    it('validates allowed_values when passed a scanned BloggerDirectiveToken', () => {
      const xml = '<b:section id="main" tag="invalidTag"/>'
      const tokens = scanDirectiveTokens(xml)
      const token = tokens[0]!
      const result = validateDirectiveAttributes(token)

      expect(result.valid).toBe(false)
      expect(result.disallowedValues).toHaveLength(1)
      const disallowed = result.disallowedValues[0]!
      expect(disallowed.attribute).toBe('tag')
      expect(disallowed.value).toBe('invalidTag')
      expect(disallowed.allowed).toContain('div')
      expect(disallowed.allowed).toContain('header')
      expect(disallowed.allowed).toContain('footer')
      expect(disallowed.start).toBeDefined()
      expect(disallowed.end).toBeDefined()
      expect(disallowed.valueStart).toBeDefined()
      expect(disallowed.valueEnd).toBeDefined()

      expect(result.violations).toHaveLength(1)
      expect(result.violations[0]?.code).toBe('BX1043')
    })

    it('accepts valid allowed_values in BloggerDirectiveToken', () => {
      const xml = '<b:section id="main" tag="footer" growth="vertical"/>'
      const tokens = scanDirectiveTokens(xml)
      const token = tokens[0]!
      const result = validateDirectiveAttributes(token)

      expect(result.valid).toBe(true)
      expect(result.disallowedValues).toHaveLength(0)
    })

    it('accepts all 4 canonical boolean values (yes, no, true, false) on boolean attributes', () => {
      for (const val of ['yes', 'no', 'true', 'false', 'YES', 'TRUE']) {
        const xml = `<b:section id="main" ads="${val}" showaddelement="${val}" preferred="${val}"/>`
        const token = scanDirectiveTokens(xml)[0]!
        const result = validateDirectiveAttributes(token)
        expect(result.valid).toBe(true)
        expect(result.disallowedValues).toHaveLength(0)
      }
    })

    it('rejects non-boolean values on boolean attributes', () => {
      const xml = '<b:section id="main" ads="invalid_val"/>'
      const token = scanDirectiveTokens(xml)[0]!
      const result = validateDirectiveAttributes(token)
      expect(result.valid).toBe(false)
      expect(result.disallowedValues).toHaveLength(1)
      expect(result.disallowedValues[0]?.allowed).toEqual(['yes', 'no', 'true', 'false'])
      expect(result.violations[0]?.code).toBe('BX1043')
    })

    it('emits diagnostic with exact range in validateTemplateStructure for disallowed attribute values', () => {
      const xml = '<b:section id="main" tag="notAValidTag"/>'
      const diags = validateTemplateStructure(xml)
      const diag = diags.find(d => d.code === 'BX1043' && d.message.includes('notAValidTag'))
      expect(diag).toBeDefined()
      expect(diag?.tagStart).toBeDefined()
      expect(diag?.tagEnd).toBeDefined()
    })

    it('does not reject expressions on native_expression boolean attributes such as cond', () => {
      const snippets = [
        '<b:if cond="data:blog.pageType == &quot;index&quot;"/>',
        '<b:if cond="data:post.hasTitle"/>',
        '<b:elseif cond="!data:view.isPost"/>',
        '<b:class cond="data:view.isMultipleItems" name="multi"/>',
        '<b:tag cond="data:hasWrapper" name="div"/>',
        '<b:include cond="data:post.allowComments" name="comments"/>',
      ]

      for (const xml of snippets) {
        const token = scanDirectiveTokens(xml)[0]!
        const result = validateDirectiveAttributes(token)
        expect(result.disallowedValues).toEqual([])
        expect(result.violations.filter(v => v.code === 'BX1043')).toEqual([])
      }
    })
  })

  describe('expression validation in template attributes', () => {
    it('detects prohibited JavaScript method calls (BX1017)', () => {
      const diags = validateExpression('data:posts.filter(p => p.id).slice(0, 5)')
      expect(diags.some(d => d.code === 'BX1017')).toBe(true)
      const diag = diags.find(d => d.code === 'BX1017')
      expect(diag?.message).toContain('.filter()')
    })

    it('detects prohibited strict equality operators === and !== (BX1018)', () => {
      const diags = validateExpression('data:view.pageType === "item"')
      expect(diags.some(d => d.code === 'BX1018')).toBe(true)
      const diag = diags.find(d => d.code === 'BX1018')
      expect(diag?.message).toContain('===')

      const neqDiags = validateExpression('data:view.pageType !== "item"')
      expect(neqDiags.some(d => d.code === 'BX1018')).toBe(true)
    })

    it('detects redundant lambda data prefix (BX1019)', () => {
      const diags = validateExpression('data:posts count (p => data:p.numberOfComments > 0)')
      expect(diags.some(d => d.code === 'BX1019')).toBe(true)
      const diag = diags.find(d => d.code === 'BX1019')
      expect(diag?.message).toContain('data:p')
    })

    it('detects prohibited literal null in expressions (BX1020)', () => {
      const diags = validateExpression('data:post.author == null')
      expect(diags.some(d => d.code === 'BX1020')).toBe(true)
      const nullFirst = validateExpression('null == ""')
      expect(nullFirst.some(d => d.code === 'BX1020')).toBe(true)
    })

    it('detects compiler token quota exceeded (BX1021)', () => {
      const longExpr = '1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10 + 11 + 12 + 13 + 14 + 15 + 16 + 17 + 18 + 19 + 20 + 21'
      const diags = validateExpression(longExpr)
      const exceededDiag = diags.find(d => d.code === 'BX1021')
      expect(exceededDiag).toBeDefined()
      expect(exceededDiag?.severity).toBe('error')
    })

    it('detects compiler token quota approaching warning (BX1045)', () => {
      const warningExpr = '1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10 + 11 + 12 + 13 + 14 + 15 + 16 + 17 + 18'
      const diags = validateExpression(warningExpr)
      const warningDiag = diags.find(d => d.code === 'BX1045')
      expect(warningDiag).toBeDefined()
      expect(warningDiag?.severity).toBe('warning')
    })

    it('detects unary minus on compound expressions (BX1030)', () => {
      expect(validateExpression('-(data:a - data:b)').some(d => d.code === 'BX1030')).toBe(true)
      expect(validateExpression('-(10 - 3)').some(d => d.code === 'BX1030')).toBe(true)
      expect(validateExpression('-(a + b)').some(d => d.code === 'BX1030')).toBe(true)
      expect(validateExpression('-(a and b)').some(d => d.code === 'BX1030')).toBe(true)
      expect(validateExpression('-(a ?: b)').some(d => d.code === 'BX1030')).toBe(true)
      expect(validateExpression('-(a ? b : c)').some(d => d.code === 'BX1030')).toBe(true)
      expect(validateExpression('-((10 - 3))').some(d => d.code === 'BX1030')).toBe(true)
    })

    it('does not emit BX1030 on logical negation (!) over compound expressions or functional minus', () => {
      // Logical negation is valid on compound expressions in Blogger
      expect(validateExpression('!(a and b)').some(d => d.code === 'BX1030')).toBe(false)
      expect(validateExpression('!(items contains item)').some(d => d.code === 'BX1030')).toBe(false)
      expect(validateExpression('!(10 - 3)').some(d => d.code === 'BX1030')).toBe(false)

      // Functional minus syntax -(a, b)
      expect(validateExpression('-(-1, 5)').some(d => d.code === 'BX1030')).toBe(false)
      expect(validateExpression('-(20, 10)').some(d => d.code === 'BX1030')).toBe(false)
      expect(validateExpression('-(data:a, data:b)').some(d => d.code === 'BX1030')).toBe(false)

      // Simple parenthesized literals, paths, and identifiers
      expect(validateExpression('-(-1)').some(d => d.code === 'BX1030')).toBe(false)
      expect(validateExpression('-(5)').some(d => d.code === 'BX1030')).toBe(false)
      expect(validateExpression('+(10)').some(d => d.code === 'BX1030')).toBe(false)
      expect(validateExpression('!(true)').some(d => d.code === 'BX1030')).toBe(false)
      expect(validateExpression('-(data:order)').some(d => d.code === 'BX1030')).toBe(false)
      expect(validateExpression('-(item)').some(d => d.code === 'BX1030')).toBe(false)
    })

    it('detects fatal operator arity crashing Blogger backend (BX1044)', () => {
      expect(validateExpression('eq(5)').some(d => d.code === 'BX1044')).toBe(true)
      expect(validateExpression('eq()').some(d => d.code === 'BX1044')).toBe(true)
      expect(validateExpression('-()').some(d => d.code === 'BX1044')).toBe(true)
      expect(validateExpression('eq(5, 5)').some(d => d.code === 'BX1044')).toBe(false)
      expect(validateExpression('eq(5, 5, 5)').some(d => d.code === 'BX1044')).toBe(false)
    })

    it('detects boolean strings compared in expressions (BX1038)', () => {
      const diags = validateExpression('data:post.isFirst == "true"')
      expect(diags.some(d => d.code === 'BX1038')).toBe(true)
    })

    it('validates expressions across all template attributes via validateTemplateExpressions', () => {
      const xml = `
        <b:section id="main">
          <b:widget id="Blog1" type="Blog">
            <b:includable id="main">
              <div expr:class="data:posts.filter(p => p.id)"/>
              <b:if cond="data:view.pageType === 'item'">
                <b:eval expr="data:post.author == null"/>
              </b:if>
            </b:includable>
          </b:widget>
        </b:section>
      `
      const diags = validateTemplateExpressions(xml)
      expect(diags.some(d => d.code === 'BX1017')).toBe(true)
      expect(diags.some(d => d.code === 'BX1018')).toBe(true)
      expect(diags.some(d => d.code === 'BX1020')).toBe(true)

      const filterDiag = diags.find(d => d.code === 'BX1017')
      expect(filterDiag?.attribute).toBe('expr:class')
      expect(filterDiag?.tagName).toBe('div')

      const eqDiag = diags.find(d => d.code === 'BX1018')
      expect(eqDiag?.attribute).toBe('cond')
      expect(eqDiag?.tagName).toBe('b:if')

      const nullDiag = diags.find(d => d.code === 'BX1020')
      expect(nullDiag?.attribute).toBe('expr')
      expect(nullDiag?.tagName).toBe('b:eval')
    })

    it('supports validateExpressions option in validateTemplateStructure', () => {
      const xml = '<b:section id="main"><b:if cond="data:view.pageType === \'item\'"/></b:section>'
      const withoutExpressions = validateTemplateStructure(xml)
      expect(withoutExpressions.some(d => d.code === 'BX1018')).toBe(false)

      const withExpressions = validateTemplateStructure(xml, undefined, { validateExpressions: true })
      expect(withExpressions.some(d => d.code === 'BX1018')).toBe(true)
    })

    it('correctly maps diagnostic offsets without drift when XML entities (&quot;) are present', () => {
      // 8 occurrences of &quot; inside expression
      const expr = '-(item in [&quot;header&quot;, &quot;Filters&quot;, &quot;footer-upper&quot;, &quot;footer-lower&quot;])'
      const xml = `<b:eval expr='${expr}'/>`
      const diags = validateTemplateExpressions(xml)

      const bx1030 = diags.find(d => d.code === 'BX1030')
      expect(bx1030).toBeDefined()
      expect(bx1030?.tagStart).toBeDefined()
      expect(bx1030?.tagEnd).toBeDefined()

      // The sliced range from the XML document MUST exactly match the raw expression
      const sliced = xml.slice(bx1030!.tagStart, bx1030!.tagEnd)
      expect(sliced).toBe(expr)
    })

    it('accurately maps offsets for string boolean comparisons containing XML entities', () => {
      const expr = 'data:view.isPost == &quot;true&quot;'
      const xml = `<b:eval expr='${expr}'/>`
      const diags = validateTemplateExpressions(xml)

      const bx1038 = diags.find(d => d.code === 'BX1038')
      expect(bx1038).toBeDefined()
      const sliced = xml.slice(bx1038!.tagStart, bx1038!.tagEnd)
      expect(sliced).toBe('&quot;true&quot;')
    })

    it('unescapeXmlEntitiesWithSourceMap maps positions accurately across mixed content', () => {
      const raw = '1 + &quot;hello&quot; + 2'
      const { unescaped, mapOffset } = unescapeXmlEntitiesWithSourceMap(raw)
      expect(unescaped).toBe('1 + "hello" + 2')

      // Start of "hello" in unescaped is index 4, in raw is index 4
      expect(mapOffset(4)).toBe(4)
      // End of "hello" in unescaped is index 11, in raw is index 21
      expect(mapOffset(11)).toBe(21)
      expect(raw.slice(mapOffset(4), mapOffset(11))).toBe('&quot;hello&quot;')

      // "+ 2" at unescaped 11..15 maps to raw 21..25
      expect(mapOffset(15)).toBe(25)
      expect(raw.slice(mapOffset(11), mapOffset(15))).toBe(' + 2')
    })

    it('emits BX1046 warning with exact start and end offsets for braced collections', () => {
      const xml = '<b:if cond=\'data:widgets any (w => w.sectionId in {"footer-1", "footer-2"})\'/>'
      const diags = validateTemplateExpressions(xml)
      const bx1046 = diags.find(d => d.code === 'BX1046')
      expect(bx1046).toBeDefined()
      expect(bx1046?.rule.severity).toBe('warning')
      expect(bx1046?.attribute).toBe('cond')
      const target = xml.slice(bx1046!.tagStart, bx1046!.tagEnd)
      expect(target).toBe('{"footer-1", "footer-2"}')
    })
  })

  describe('b:section inside b:tag structural nesting', () => {
    it('permits b:section inside b:tag at top level', () => {
      expect(canNest('b:tag', 'b:section')).toBe(true)
      expect(validateDirectiveNesting('b:tag', 'b:section')).toBeNull()

      const xml = `
        <b:tag class='tools' name='div' cond='data:view.isLayoutMode'>
          <b:section id='tools' class='none' maxwidgets='2' showaddelement='false'>
            <b:widget id='Header1' type='Header'/>
          </b:section>
        </b:tag>
      `
      const diags = validateTemplateStructure(xml)
      expect(diags.filter(d => d.code === 'BX1023')).toHaveLength(0)
    })

    it('prohibits b:section inside b:tag when wrapped inside a widget or includable', () => {
      const xml = `
        <b:widget id='Blog1' type='Blog'>
          <b:includable id='main'>
            <b:tag name='div'>
              <b:section id='sub'/>
            </b:tag>
          </b:includable>
        </b:widget>
      `
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1023' && d.message.includes('Tag <b:section> cannot be placed inside <b:widget>'))).toBe(true)
    })

    it('detects prohibited bracket indexing in data:* tags (BX1032)', () => {
      const xml = '<data:items[0]/>'
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1032')).toBe(true)
    })

    it('detects prohibited expression operators in data:* tags (BX1048)', () => {
      const xml = '<data:post.title ?: "Default"/>'
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1048')).toBe(true)
    })

    it('allows valid scalar data:* tags without diagnostics', () => {
      const xml = '<data:post.title/><data:blog.url/><data:messages.older/>'
      const diags = validateTemplateStructure(xml)
      expect(diags).toHaveLength(0)
    })

    it('detects scalar primitive payload in b:include data attribute (BX1031)', () => {
      const stringXml = '<b:include data="\'scalar string\'" name="sub"/>'
      expect(validateTemplateStructure(stringXml).some(d => d.code === 'BX1031')).toBe(true)

      const numXml = '<b:include expr:data="123" name="sub"/>'
      expect(validateTemplateStructure(numXml).some(d => d.code === 'BX1031')).toBe(true)

      const boolXml = '<b:include data="true" name="sub"/>'
      expect(validateTemplateStructure(boolXml).some(d => d.code === 'BX1031')).toBe(true)

      const validObject = '<b:include data="{ key: \'val\' }" name="sub"/>'
      expect(validateTemplateStructure(validObject).filter(d => d.code === 'BX1031')).toHaveLength(0)

      const validRef = '<b:include data="post" name="sub"/>'
      expect(validateTemplateStructure(validRef).filter(d => d.code === 'BX1031')).toHaveLength(0)
    })

    it('detects direct parameterized message invocation (BX1027)', () => {
      const byAuthorXml = '<data:messages.byAuthor/>'
      const byAuthorDiags = validateTemplateStructure(byAuthorXml)
      expect(byAuthorDiags.some(d => d.code === 'BX1027')).toBe(true)

      const numCommentsXml = '<data:messages.numberOfComments/>'
      const numCommentsDiags = validateTemplateStructure(numCommentsXml)
      expect(numCommentsDiags.some(d => d.code === 'BX1027')).toBe(true)

      const validMessage = '<data:messages.home/>'
      expect(validateTemplateStructure(validMessage).filter(d => d.code === 'BX1027')).toHaveLength(0)
    })

    it('detects missing name on plural message child b:param (BX1028)', () => {
      const invalidPlural = '<b:message name="messages.numberOfComments"><b:param value="5"/></b:message>'
      const diags = validateTemplateStructure(invalidPlural)
      expect(diags.some(d => d.code === 'BX1028')).toBe(true)

      const validPlural = '<b:message name="messages.numberOfComments"><b:param name="numComments" value="5"/></b:message>'
      expect(validateTemplateStructure(validPlural).filter(d => d.code === 'BX1028')).toHaveLength(0)
    })

    it('detects inline concatenated b:param tags without whitespace (BX1029)', () => {
      const concatenated = '<b:message name="messages.templateImagesByLink"><b:param value="url"/><b:param value="Jane"/></b:message>'
      const diags = validateTemplateStructure(concatenated)
      expect(diags.some(d => d.code === 'BX1029')).toBe(true)

      const spaced = '<b:message name="messages.templateImagesByLink"><b:param value="url"/> <b:param value="Jane"/></b:message>'
      expect(validateTemplateStructure(spaced).filter(d => d.code === 'BX1029')).toHaveLength(0)
    })

    it('detects missing whitespace after colon in object literals (BX1049)', () => {
      const exprNoSpace = '{ key:"val" }'
      const diags = validateExpression(exprNoSpace)
      expect(diags.some(d => d.code === 'BX1049')).toBe(true)

      const exprWithSpace = '{ key: "val" }'
      expect(validateExpression(exprWithSpace).filter(d => d.code === 'BX1049')).toHaveLength(0)

      const templateXml = '<b:eval expr="{ a:1 }"/>'
      const tplDiags = validateTemplateStructure(templateXml, undefined, { validateExpressions: true })
      expect(tplDiags.some(d => d.code === 'BX1049')).toBe(true)
    })

    it('detects deprecated server inclusions on b:include (BX1024)', () => {
      const quickeditXml = '<b:include name="quickedit"/>'
      expect(validateTemplateStructure(quickeditXml).some(d => d.code === 'BX1024')).toBe(true)

      const superQuickeditXml = '<b:include name="super.quickedit"/>'
      expect(validateTemplateStructure(superQuickeditXml).some(d => d.code === 'BX1024')).toBe(true)

      const gplusXml = '<b:include name="googlePlusIcon"/>'
      expect(validateTemplateStructure(gplusXml).some(d => d.code === 'BX1024')).toBe(true)

      const validInclusion = '<b:include name="openGraphMetaData"/>'
      expect(validateTemplateStructure(validInclusion).filter(d => d.code === 'BX1024')).toHaveLength(0)
    })
  })
})
