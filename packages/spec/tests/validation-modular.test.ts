import { describe, expect, it } from 'vitest'
import { getSpecCatalog } from '../src/catalogs/index.js'
import { scanDirectiveTokens } from '../src/parser/directive-scanner.js'
import {
  validateDataElement,
  validateDirectiveAttributeRules,
  validateDirectiveNesting,
  validateExpression,
  validateIdentifierUniqueness,
  validateIncludeElement,
  validateNestingRules,
  validateRootAttributes,
  validateSectionId,
  validateSkinStyles,
  validateTemplateExpressions,
  validateTemplateStructure,
  validateVariableElement,
  validateWidgetElement,
  validateWidgetSettingElement,
} from '../src/parser/validation/index.js'

describe('modular template validation suite', () => {
  const catalog = getSpecCatalog()

  describe('nesting rules', () => {
    it('validates directive nesting through validateDirectiveNesting', () => {
      expect(validateDirectiveNesting('body', 'b:section')).toBeNull()
      expect(validateDirectiveNesting('head', 'b:section')?.code).toBe('BX1023')
      expect(validateDirectiveNesting('b:section', 'b:section')?.code).toBe('BX1035')
    })

    it('emits diagnostic for unknown b: namespace directives in validateNestingRules', () => {
      const tokens = scanDirectiveTokens('<b:unknownDirective/>', { catalog })
      const diags: any[] = []
      validateNestingRules(tokens[0]!, [], catalog, diags, tokens)
      expect(diags).toHaveLength(1)
      expect(diags[0].code).toBe(catalog.getStandardDiagnostic('unknown_directive'))
    })
  })

  describe('section and widget rules', () => {
    it('detects duplicate section IDs via validateSectionId', () => {
      const tokens = scanDirectiveTokens('<b:section id="main"/><b:section id="main"/>', { catalog })
      const globalIds = new Map()
      const diags: any[] = []
      validateSectionId(tokens[0]!, globalIds, catalog, diags)
      validateSectionId(tokens[1]!, globalIds, catalog, diags)
      expect(diags.some(d => d.code === catalog.getStandardDiagnostic('duplicate_element_id'))).toBe(true)
    })

    it('validates widget ID format via validateWidgetElement', () => {
      const tokens = scanDirectiveTokens('<b:widget id="invalid_id" type="Blog"/>', { catalog })
      const diags: any[] = []
      validateWidgetElement(tokens[0]!, catalog, diags)
      expect(diags.some(d => d.code === 'BX1047')).toBe(true)
    })

    it('validates widget settings via validateWidgetSettingElement', () => {
      const xml = '<b:widget id="Header1" type="Header"><b:widget-setting name="unknownSetting">value</b:widget-setting></b:widget>'
      const tokens = scanDirectiveTokens(xml, { catalog })
      const widgetToken = tokens[0]
      const settingToken = tokens[1]!
      const diags: any[] = []
      validateWidgetSettingElement(settingToken, widgetToken, xml, catalog, diags)
      expect(diags.some(d => d.code === 'BX1050')).toBe(false)
    })

    it('enforces includable uniqueness within widget container', () => {
      const xml = '<b:widget id="Blog1" type="Blog"><b:includable id="post"/><b:includable id="post"/></b:widget>'
      const tokens = scanDirectiveTokens(xml, { catalog })
      const containerIncludables = new Map()
      const diags: any[] = []
      validateIdentifierUniqueness(tokens[1]!, new Map(), containerIncludables, [tokens[0]!], catalog, diags)
      validateIdentifierUniqueness(tokens[2]!, new Map(), containerIncludables, [tokens[0]!], catalog, diags)
      expect(diags.some(d => d.code === catalog.getStandardDiagnostic('duplicate_includable_id'))).toBe(true)
    })
  })

  describe('expression rules', () => {
    it('detects unmanaged operators in validateExpression', () => {
      const diags = validateExpression('data:blog.isMobile && data:blog.isMobile')
      expect(diags.some(d => d.code === 'BX1055')).toBe(true)
    })

    it('detects string booleans in comparison', () => {
      const diags = validateExpression('data:post.isFirst == "true"')
      expect(diags.some(d => d.code === 'BX1038')).toBe(true)
      expect(diags[0]!.suggestedReplacement).toBe('true')
    })

    it('scans expressions across template attributes', () => {
      const xml = '<b:tag cond=\'data:post.isFirst == "true"\'/>'
      const diags = validateTemplateExpressions(xml, catalog)
      expect(diags.some(d => d.code === 'BX1038')).toBe(true)
    })
  })

  describe('attributes and data elements', () => {
    it('detects missing recommended root attributes', () => {
      const tokens = scanDirectiveTokens('<html></html>', { catalog })
      const diags: any[] = []
      validateRootAttributes(tokens[0]!, catalog, diags)
      expect(diags.some(d => d.code === 'BX1061')).toBe(true)
    })

    it('detects prohibited bracket indexing in data tag', () => {
      const tokens = scanDirectiveTokens('<data:posts[0]/>', { catalog })
      const diags: any[] = []
      validateDataElement(tokens[0]!, catalog, diags)
      expect(diags.some(d => d.code === 'BX1032')).toBe(true)
    })

    it('detects non-object payload in b:include data attribute', () => {
      const tokens = scanDirectiveTokens('<b:include name="sub" data="\'stringVal\'"/>', { catalog })
      const diags: any[] = []
      validateIncludeElement(tokens[0]!, catalog, diags)
      expect(diags.some(d => d.code === 'BX1031')).toBe(true)
    })

    it('validates directive attributes and detects inverted attributes', () => {
      const tokens = scanDirectiveTokens('<b:include id="sub"/>', { catalog })
      const diags: any[] = []
      validateDirectiveAttributeRules(tokens[0]!, catalog, diags)
      expect(diags.some(d => d.code === 'BX1016')).toBe(true)
      expect(diags[0]!.suggestedReplacement).toBe('name')
    })
  })

  describe('skin and theme designer rules', () => {
    it('requires double quotes in Theme Designer tags', () => {
      const tokens = scanDirectiveTokens('<Variable name=\'body.color\' type=\'color\'/>', { catalog })
      const diags: any[] = []
      validateVariableElement(tokens[0]!, catalog, diags)
      expect(diags.some(d => d.code === 'BX1052')).toBe(true)
    })

    it('validates skin styles syntax within CDATA of b:skin', () => {
      const xml = '<b:skin><![CDATA[ body { color: $body.color; } ]]></b:skin>'
      const diags = validateSkinStyles(xml, {})
      expect(diags.some(d => d.code === 'BX1052')).toBe(true)
      expect(diags[0]!.suggestedReplacement).toBe('$(body.color)')
    })
  })

  describe('template structure facade', () => {
    it('orchestrates complete template validation producing comprehensive diagnostics', () => {
      const xml = `<html b:css="false" b:js="false" b:defaultwidgetversion="2" b:layoutsVersion="3">
        <body>
          <b:section id="main">
            <b:widget id="Blog1" type="Blog">
              <b:includable id="main">
                <b:include name="nonExistent"/>
              </b:includable>
            </b:widget>
          </b:section>
        </body>
      </html>`
      const diags = validateTemplateStructure(xml, catalog)
      expect(diags.some(d => d.code === 'BX1037')).toBe(true)
    })
  })
})
