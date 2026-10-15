import { describe, expect, it } from 'vitest'
import {
  getThemeDesignerDescriptions,
  getVariableTypeAttributes,
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
    it('detects nested section error (BX1035)', () => {
      const rule = validateDirectiveNesting('b:section', 'b:section')
      expect(rule).not.toBeNull()
      expect(rule?.code).toBe('BX1035')
      expect(rule?.name).toBe('NESTED_SECTION')
    })

    it('detects widget outside section error (BX1034)', () => {
      const rule = validateDirectiveNesting('body', 'b:widget')
      expect(rule).not.toBeNull()
      expect(rule?.code).toBe('BX1034')
      expect(rule?.name).toBe('WIDGET_OUTSIDE_SECTION')
    })

    it('detects prohibited nesting for directives with restricted parents/children (BX1023)', () => {
      const rule = validateDirectiveNesting('b:include', 'b:param')
      expect(rule).not.toBeNull()
      expect(rule?.code).toBe('BX1023')
      expect(rule?.name).toBe('PROHIBITED_NESTING')
    })

    it('permits valid parent-child relationships', () => {
      expect(validateDirectiveNesting('b:section', 'b:widget')).toBeNull()
      expect(validateDirectiveNesting('b:widget', 'b:includable')).toBeNull()
      expect(validateDirectiveNesting('b:defaultmarkup', 'b:includable')).toBeNull()
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

    it('operates identically when passed pre-scanned tokens', () => {
      const xml = '<b:section id="s1"><b:section id="s2"/></b:section>'
      const tokens = scanDirectiveTokens(xml)
      const fromTokens = validateTemplateStructure(tokens)
      const fromXml = validateTemplateStructure(xml)
      expect(fromTokens).toEqual(fromXml)
    })

    it('is exported identically from root index', () => {
      expect(RootExports.validateDirectiveNesting).toBeDefined()
      expect(RootExports.validateTemplateStructure).toBeDefined()
      expect(RootExports.validateVariableAttributes).toBeDefined()
    })
  })
})
