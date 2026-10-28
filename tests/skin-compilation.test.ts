import { describe, expect, it } from 'vitest'
import { getSkinCompilation, getSpecCatalog, resolveDataPath, toSkinVarIdentifier } from '../src/index.js'

describe('skin compilation & variables lifecycle (Plan 04)', () => {
  it('exposes canonical skin_compilation specifications from directives catalog', () => {
    const skinMeta = getSkinCompilation()
    expect(skinMeta).toBeDefined()

    expect(skinMeta?.page_skin.output_wrapper).toContain('page-skin-1')
    expect(skinMeta?.page_skin.variable_substitution.syntax).toBe('$(variable.name)')
    expect(skinMeta?.page_skin.variable_substitution.value_precedence).toBe('value_over_default')
    expect(skinMeta?.page_skin.variable_substitution.composite_font_decomposition).toEqual([
      'family',
      'size',
      'style',
      'weight',
    ])

    expect(skinMeta?.template_skin.output_wrapper).toContain('template-skin-1')
    expect(skinMeta?.template_skin.recommended_guard).toContain('data:view.isLayoutMode')

    expect(skinMeta?.google_fonts_strategy.local_compiler_policy).toContain('fonts.googleapis.com')
    expect(skinMeta?.expression_projection.target_namespace).toBe('data:skin.vars.*')
  })

  it('converts dots in skin variable names to underscores for template expressions', () => {
    expect(toSkinVarIdentifier('theme.spacing.base')).toBe('theme_spacing_base')
    expect(toSkinVarIdentifier('body.font.title')).toBe('body_font_title')
  })

  it('resolves composite font sub-properties in resolveDataPath', () => {
    const catalog = getSpecCatalog()
    const fontProp = resolveDataPath('data:skin.vars.title_font.family', {
      catalog,
      skinVariables: {
        title_font: { name: 'title_font', type: 'font' },
      },
    })
    expect(fontProp).toBeDefined()
    expect(fontProp?.name).toBe('family')
    expect(fontProp?.type).toBe('string')

    const sizeProp = resolveDataPath('data:skin.vars.title_font.size', {
      catalog,
      skinVariables: {
        title_font: { name: 'title_font', type: 'font' },
      },
    })
    expect(sizeProp).toBeDefined()
    expect(sizeProp?.name).toBe('size')
    expect(sizeProp?.type).toBe('string')

    const weightProp = resolveDataPath('data:skin.vars.title_font.weight', {
      catalog,
      skinVariables: {
        title_font: { name: 'title_font', type: 'font' },
      },
    })
    expect(weightProp).toBeUndefined()
  })

  it('documents style tag compilation in b:skin and b:template-skin constraints', () => {
    const catalog = getSpecCatalog()
    const skinDef = catalog.getDirective('b:skin')
    expect(skinDef?.constraints?.compilation).toBeDefined()

    const templateSkinDef = catalog.getDirective('b:template-skin')
    expect(templateSkinDef?.constraints?.serialization).toBeDefined()
  })
})
