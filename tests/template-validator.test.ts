import { describe, expect, it } from 'vitest'
import {
  getThemeDesignerDescriptions,
  getVariableTypeAttributes,
  validateDirectiveAttributes,
  validateVariableAttributes,
} from '../src/catalogs/index.js'
import * as RootExports from '../src/index.js'
import {
  scanDirectiveTokens,
  validateDirectiveNesting,
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
      expect(allTypeAttrs.color).toBeDefined()
      expect(allTypeAttrs.font).toBeDefined()
      expect(allTypeAttrs.length).toBeDefined()
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

    it('detects duplicate element id across sections and widgets (BX1033)', () => {
      const xml = `
        <b:section id='main'>
          <b:widget id='duplicate_id' type='Blog'/>
        </b:section>
        <b:section id='duplicate_id'>
        </b:section>
      `
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1033')).toBe(true)
      const diag = diags.find(d => d.code === 'BX1033')
      expect(diag?.message).toContain('duplicate_id')
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
          <Variable name="theme.color" type="color" red="100" default="#ff0000"/>
        ]]></b:skin>
      `
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1040')).toBe(true)
      const diag = diags.find(d => d.code === 'BX1040')
      expect(diag?.message).toContain('red')
    })

    it('detects missing mandatory directive attributes (BX1022)', () => {
      const xml = '<b:loop var="i"><data:i/></b:loop>'
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1022')).toBe(true)
      const diag = diags.find(d => d.code === 'BX1022')
      expect(diag?.message).toContain('values')
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

    it('detects invalid expressions on static literal attributes (BX1022)', () => {
      const xml = '<b:section expr:id="data:blog.id"/>'
      const diags = validateTemplateStructure(xml)
      expect(diags.some(d => d.code === 'BX1022')).toBe(true)
      const diag = diags.find(d => d.message.includes('expr:id'))
      expect(diag).toBeDefined()
      expect(diag?.message).toContain('expr:id')
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

    it('allows <b:with expr:var="..."> dynamic variable alias declaration', () => {
      const result = validateDirectiveAttributes('b:with', ['expr:var', 'value'])
      expect(result.valid).toBe(true)
      expect(result.missingRequired).toEqual([])
      expect(result.invalidExpressions).toEqual([])
    })
  })
})
