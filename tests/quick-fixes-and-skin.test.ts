import { describe, expect, it } from 'vitest'
import { validateExpression, validateTemplateStructure } from '../src/parser/template-validator.js'

describe('semantic QuickFixes and Skin Validation Suite', () => {
  it('generates multi-edit fixes for hallucinated <b:for> converting to <b:loop>', () => {
    const xml = '<b:for each="p" in="data:posts"><div>hello</div></b:for>'
    const diagnostics = validateTemplateStructure(xml)

    const bx1001 = diagnostics.find(d => d.code === 'BX1001')
    expect(bx1001).toBeDefined()
    expect(bx1001?.fixes).toBeDefined()
    expect(bx1001?.fixes?.length).toBeGreaterThan(0)

    const fix = bx1001!.fixes![0]!
    expect(fix.title).toContain('Convert <b:for> to <b:loop>')
    expect(fix.edits.length).toBe(2)

    // Opening tag replacement
    expect(fix.edits[0]!.newText).toContain('<b:loop')
    expect(fix.edits[0]!.newText).toContain('var="p"')
    expect(fix.edits[0]!.newText).toContain('values="data:posts"')

    // Closing tag replacement
    expect(fix.edits[1]!.newText).toBe('</b:loop>')
  })

  it('generates fix for <b:when> converting to self-closing <b:case/> and deleting </b:when>', () => {
    const xml = '<b:when test="data:view.isPost">content</b:when>'
    const diagnostics = validateTemplateStructure(xml)

    const bx1008 = diagnostics.find(d => d.code === 'BX1008')
    expect(bx1008).toBeDefined()
    expect(bx1008?.fixes).toBeDefined()

    const fix = bx1008!.fixes![0]!
    expect(fix.edits[0]!.newText).toContain('<b:case')
    expect(fix.edits[0]!.newText).toContain('value="data:view.isPost"/>')
    expect(fix.edits[1]!.newText).toBe('')
  })

  it('generates fix for inverted attribute on <b:switch expr="val">', () => {
    const xml = '<b:switch expr="data:view.type"><b:case value="post"/></b:switch>'
    const diagnostics = validateTemplateStructure(xml)

    const bx1014 = diagnostics.find(d => d.code === 'BX1014')
    expect(bx1014).toBeDefined()
    expect(bx1014?.suggestedReplacement).toBe('var')
    expect(bx1014?.fixes?.[0]?.edits[0]?.newText).toBe('var')
  })

  it('generates fix for strict equality operator in expressions (BX1018)', () => {
    const diags = validateExpression('data:title === "Test"')
    const bx1018 = diags.find(d => d.code === 'BX1018')

    expect(bx1018).toBeDefined()
    expect(bx1018?.suggestedReplacement).toBe('==')
    expect(bx1018?.fixes?.[0]?.edits[0]?.newText).toBe('==')
  })

  it('generates fix for string boolean literal in expressions (BX1038)', () => {
    const diags = validateExpression('data:view.isPost == "true"')
    const bx1038 = diags.find(d => d.code === 'BX1038')

    expect(bx1038).toBeDefined()
    expect(bx1038?.suggestedReplacement).toBe('true')
    expect(bx1038?.fixes?.[0]?.edits[0]?.newText).toBe('true')
  })

  it('emits BX1052 with parenthesized fix for $var.name outside parentheses in <b:skin>', () => {
    const xml = '<b:skin><![CDATA[ <Variable name="primary.accent" description="Accent" type="color" default="#ffffff" value="#ffffff"/> body { color: $primary.accent; } ]]></b:skin>'
    const diagnostics = validateTemplateStructure(xml)

    expect(diagnostics).toHaveLength(1)
    const bx1052 = diagnostics[0]
    expect(bx1052?.code).toBe('BX1052')
    expect(bx1052?.suggestedReplacement).toBe('$(primary.accent)')
    expect(bx1052?.fixes?.[0]?.edits[0]?.newText).toBe('$(primary.accent)')
  })

  it('emits BX1053 for undeclared variable in Theme Designer skin', () => {
    const xml = '<b:skin><![CDATA[ <Variable name="mainColor" description="Main Color" type="color" default="#ffffff" value="#ffffff"/> body { color: $(missingVar); } ]]></b:skin>'
    const diagnostics = validateTemplateStructure(xml)

    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]?.code).toBe('BX1053')
  })

  it('emits BX1054 with underscore normalization fix for data:skin.vars.admin.name', () => {
    const diags = validateExpression('data:skin.vars.admin.name')
    const bx1054 = diags.find(d => d.code === 'BX1054')

    expect(bx1054).toBeDefined()
    expect(bx1054?.suggestedReplacement).toBe('data:skin.vars.admin_name')
    expect(bx1054?.fixes?.[0]?.edits[0]?.newText).toBe('data:skin.vars.admin_name')
  })

  it('emits BX1050 with replacement fix for deprecated data property', () => {
    const xml = '<data:blog.isMobile/>'
    const diagnostics = validateTemplateStructure(xml)

    const bx1050 = diagnostics.find(d => d.code === 'BX1050')
    expect(bx1050).toBeDefined()
    expect(bx1050?.suggestedReplacement).toBe('<data:blog.isMobileRequest/>')
    expect(bx1050?.fixes?.[0]?.edits[0]?.newText).toBe('<data:blog.isMobileRequest/>')
  })

  it('emits BX1051 with fix for hallucinated data property in expression', () => {
    const diags = validateExpression('data:categories')
    const bx1051 = diags.find(d => d.code === 'BX1051')

    expect(bx1051).toBeDefined()
    expect(bx1051?.suggestedReplacement).toBe('data:labels')
    expect(bx1051?.fixes?.[0]?.edits[0]?.newText).toBe('data:labels')
  })
})
