import { describe, expect, it } from 'vitest'
import { getIncludableResolutionHierarchy } from '../src/catalogs/index.js'
import { validateTemplateExpressions, validateTemplateStructure } from '../src/parser/index.js'

describe('includable resolution hierarchy & data contract (Plan 02)', () => {
  it('exposes the 6-tier ontological specificity chain from directives catalog', () => {
    const hierarchy = getIncludableResolutionHierarchy()
    expect(hierarchy).toBeDefined()
    expect(hierarchy?.model).toBe('ontological_specificity_chain')
    expect(hierarchy?.levels).toHaveLength(6)

    const levelNames = hierarchy?.levels.map(l => l.name)
    expect(levelNames).toEqual([
      'local_widget',
      'gadget_specific',
      'universal_widget',
      'shared_common',
      'platform_server',
      'unresolved',
    ])

    expect(hierarchy?.collision_rules.same_level_blocks).toBe('last_block_wins')
    expect(hierarchy?.collision_rules.same_level_containers).toBe('last_container_wins')
  })

  it('rejects direct bracket arrays in <b:include data="[...]"> with BX1031', () => {
    const xml = `<b:include data='["uno", "dos", "tres"]' name='sub'/>`
    const diags = validateTemplateStructure(xml)
    const bx1031 = diags.find(d => d.code === 'BX1031')
    expect(bx1031).toBeDefined()
    expect(bx1031?.attribute).toBe('data')
    expect(bx1031?.severity).toBe('error')
  })

  it('rejects primitive scalar literals in <b:include data="..."> with BX1031', () => {
    const xmlString = `<b:include data='"texto"' name='sub'/>`
    const diagsString = validateTemplateStructure(xmlString)
    expect(diagsString.some(d => d.code === 'BX1031')).toBe(true)

    const xmlNumber = `<b:include data='42' name='sub'/>`
    const diagsNumber = validateTemplateStructure(xmlNumber)
    expect(diagsNumber.some(d => d.code === 'BX1031')).toBe(true)

    const xmlBool = `<b:include data='true' name='sub'/>`
    const diagsBool = validateTemplateStructure(xmlBool)
    expect(diagsBool.some(d => d.code === 'BX1031')).toBe(true)
  })

  it('accepts braced arrays in <b:include data="{...}"> without BX1031 or BX1046', () => {
    const xml1 = `<b:include data='{"uno", "dos", "tres"}' name='sub'/>`
    const diags1 = validateTemplateStructure(xml1, undefined, { validateExpressions: true })
    expect(diags1.filter(d => d.code === 'BX1031' || d.code === 'BX1046')).toEqual([])

    const xml2 = `<b:include data='{ ["uno"], ["dos"] }' name='sub'/>`
    const diags2 = validateTemplateStructure(xml2, undefined, { validateExpressions: true })
    expect(diags2.filter(d => d.code === 'BX1031' || d.code === 'BX1046')).toEqual([])
  })

  it('still emits BX1046 for braced arrays in general expression contexts', () => {
    const diags = validateTemplateExpressions(`<b:eval expr='{"a", "b"}'/>`)
    const bx1046 = diags.find(d => d.code === 'BX1046')
    expect(bx1046).toBeDefined()
  })
})

