import { describe, expect, it } from 'vitest'
import { validateExpression, validateSkinStyles, validateTemplateStructure } from '../src/parser/template-validator.js'

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

  it('emits BX1053 with error severity for undeclared variable in Theme Designer skin', () => {
    const xml = '<b:skin><![CDATA[ <Variable name="mainColor" description="Main Color" type="color" default="#ffffff" value="#ffffff"/> body { color: $(missingVar); } ]]></b:skin>'
    const diagnostics = validateTemplateStructure(xml)

    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]?.code).toBe('BX1053')
    expect(diagnostics[0]?.severity).toBe('error')
  })

  it('validates dotted skin variables with valid modifiers without false positives', () => {
    const xml = `
      <b:skin><![CDATA[
        <Variable name="primary.accent" description="Primary Accent" type="color" default="#ff0000" value="#ff0000"/>
        <Variable name="fuente.principal" description="Main Font" type="font" default="14px Arial" value="14px Arial"/>
        <Variable name="fondo" description="Background" type="background" default="#fff" value="#fff"/>
        body {
          color: $(primary.accent);
          border-color: rgba($(primary.accent.red), $(primary.accent.green), $(primary.accent.blue), $(primary.accent.alpha));
          font-family: $(fuente.principal.family);
          font-size: $(fuente.principal.size);
          background-color: $(fondo.color);
        }
      ]]></b:skin>
    `
    const diagnostics = validateTemplateStructure(xml)
    expect(diagnostics.filter(d => d.code === 'BX1053')).toHaveLength(0)
  })

  it('emits BX1053 when modifier is only available outside skin (e.g. skin:background .image)', () => {
    const xml = `
      <b:skin><![CDATA[
        <Variable name="fondo" description="Background" type="background" default="#fff" value="#fff"/>
        body {
          background-image: $(fondo.image);
        }
      ]]></b:skin>
    `
    const diagnostics = validateTemplateStructure(xml)
    const bx1053 = diagnostics.filter(d => d.code === 'BX1053')
    expect(bx1053).toHaveLength(1)
    expect(bx1053[0]?.message).toContain('only supported in outside-skin expressions')
  })

  it('emits BX1056 for invalid widget settings (minimum, allowed values, obsolete)', () => {
    const xml = `
      <b:section id='main'>
        <b:widget id='Header1' title='Header' type='Header' version='2'>
          <b:widget-settings>
            <b:widget-setting name='displayHeight'>0</b:widget-setting>
          </b:widget-settings>
          <b:includable id='main'/>
        </b:widget>
        <b:widget id='LinkList1' title='Links' type='LinkList' version='2'>
          <b:widget-settings>
            <b:widget-setting name='sorting'>none</b:widget-setting>
          </b:widget-settings>
          <b:includable id='main'/>
        </b:widget>
        <b:widget id='Blog1' title='Blog' type='Blog' version='2'>
          <b:widget-settings>
            <b:widget-setting name='style.unittype'>1</b:widget-setting>
          </b:widget-settings>
          <b:includable id='main'/>
        </b:widget>
      </b:section>
    `
    const diagnostics = validateTemplateStructure(xml)
    const bx1056 = diagnostics.filter(d => d.code === 'BX1056')
    expect(bx1056).toHaveLength(3)
    expect(bx1056[0]?.message).toContain('Must be at least 1')
    expect(bx1056[1]?.message).toContain('That is not one of the acceptable values')
    expect(bx1056[2]?.message).toContain('Unknown ad unit type')
  })

  it('emits BX1057 warning when declaring an AdSense widget directly', () => {
    const xml = `
      <b:section id='main'>
        <b:widget id='AdSense1' title='AdSense' type='AdSense' version='2'>
          <b:includable id='main'/>
        </b:widget>
      </b:section>
    `
    const diagnostics = validateTemplateStructure(xml)
    const bx1057 = diagnostics.filter(d => d.code === 'BX1057')
    expect(bx1057).toHaveLength(1)
    expect(bx1057[0]?.severity).toBe('warning')
    expect(bx1057[0]?.message).toContain('monetization')
  })

  it('emits BX1053 for invalid modifiers on declared skin variables', () => {
    const xml = `
      <b:skin><![CDATA[
        <Variable name="fuente" description="Font" type="font" default="12px Arial" value="12px Arial"/>
        <Variable name="primary" description="Color" type="color" default="#fff" value="#fff"/>
        body {
          font: $(fuente.prueba);
          color: $(primary.family);
        }
      ]]></b:skin>
    `
    const diagnostics = validateTemplateStructure(xml)
    const bx1053 = diagnostics.filter(d => d.code === 'BX1053')
    expect(bx1053).toHaveLength(2)
    expect(bx1053[0]?.severity).toBe('error')
    expect(bx1053[0]?.message).toContain('Modifier \'prueba\' is not supported for skin variable \'fuente\' of type \'font\'')
    expect(bx1053[1]?.message).toContain('Modifier \'family\' is not supported for skin variable \'primary\' of type \'color\'')
  })

  it('emits BX1053 for spurious multi-segment or nested paths', () => {
    const xml = `
      <b:skin><![CDATA[
        <Variable name="primary" description="Color" type="color" default="#fff" value="#fff"/>
        <Variable name="fuente" description="Font" type="font" default="12px Arial" value="12px Arial"/>
        body {
          color: $(primary.prueba.prueba.red);
          font: $(fuente.prueba.family);
        }
      ]]></b:skin>
    `
    const diagnostics = validateTemplateStructure(xml)
    const bx1053 = diagnostics.filter(d => d.code === 'BX1053')
    expect(bx1053).toHaveLength(2)
    expect(bx1053[0]?.severity).toBe('error')
    expect(bx1053[0]?.message).toContain('Skin variable \'primary\' does not support nested property path \'prueba.prueba.red\'')
    expect(bx1053[1]?.message).toContain('Skin variable \'fuente\' does not support nested property path \'prueba.family\'')
  })

  it('validates standalone references and allows direct validateSkinStyles usage', () => {
    const xml = `
      <b:skin><![CDATA[
        <Variable name="primary" description="Color" type="color" default="#fff" value="#fff"/>
        body {
          color: $primary;
          background: $missing;
        }
      ]]></b:skin>
    `
    const diagnostics = validateSkinStyles(xml, {
      primary: { name: 'primary', type: 'color' },
    })
    const bx1053 = diagnostics.filter(d => d.code === 'BX1053')
    expect(bx1053).toHaveLength(1)
    expect(bx1053[0]?.message).toContain('Referenced skin variable \'missing\' was not declared')
  })

  it('emits BX1054 with underscore normalization fix for data:skin.vars.admin.name', () => {
    const diags = validateExpression('data:skin.vars.admin.name')
    const bx1054 = diags.find(d => d.code === 'BX1054')

    expect(bx1054).toBeDefined()
    expect(bx1054?.suggestedReplacement).toBe('data:skin.vars.admin_name')
    expect(bx1054?.fixes?.[0]?.edits[0]?.newText).toBe('data:skin.vars.admin_name')
  })

  it('does not emit BX1054 for canonical skin variable modifiers in expressions', () => {
    expect(validateExpression('data:skin.vars.primary.red').some(d => d.code === 'BX1054')).toBe(false)
    expect(validateExpression('data:skin.vars.fuente.family').some(d => d.code === 'BX1054')).toBe(false)
    expect(validateExpression('data:skin.vars.header_bg.image').some(d => d.code === 'BX1054')).toBe(false)
  })

  it('does not emit BX1054 for data tags referencing valid skin variable modifiers', () => {
    const xml = `
      <b:skin><![CDATA[
        <Variable name="primary" description="Color" type="color" default="#fff" value="#fff"/>
        <Variable name="fuente" description="Font" type="font" default="12px Arial" value="12px Arial"/>
      ]]></b:skin>
      <data:skin.vars.primary.red/>
      <data:skin.vars.fuente.family/>
    `
    const diags = validateTemplateStructure(xml)
    expect(diags.filter(d => d.code === 'BX1054')).toHaveLength(0)
  })

  it('emits BX1054 when property is not a valid modifier on declared skin variable', () => {
    const xml = `
      <b:skin><![CDATA[
        <Variable name="primary" description="Color" type="color" default="#fff" value="#fff"/>
      ]]></b:skin>
      <data:skin.vars.primary.invalid/>
    `
    const diags = validateTemplateStructure(xml)
    const bx1054 = diags.find(d => d.code === 'BX1054')
    expect(bx1054).toBeDefined()
    expect(bx1054?.suggestedReplacement).toBe('<data:skin.vars.primary_invalid/>')
  })

  it('emits BX1054 preserving modifier when normalizing compound variable name with dots', () => {
    const xml = `
      <b:skin><![CDATA[
        <Variable name="body.font" description="Font" type="font" default="12px Arial" value="12px Arial"/>
      ]]></b:skin>
      <data:skin.vars.body.font.family/>
      <b:eval expr="data:skin.vars.body.font.family"/>
    `
    const diags = validateTemplateStructure(xml, undefined, { validateExpressions: true })
    const bx1054List = diags.filter(d => d.code === 'BX1054')
    expect(bx1054List).toHaveLength(2)
    expect(bx1054List[0]?.suggestedReplacement).toBe('<data:skin.vars.body_font.family/>')
    expect(bx1054List[1]?.suggestedReplacement).toBe('data:skin.vars.body_font.family')
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
