import { describe, expect, it } from 'vitest'
import {
  collectDefaultMarkups,
  getIncludableResolutionHierarchy,
  getLocalStubInclusion,
  indexIncludables,
  parseTemplate,
  resolveIncludable,
  validateTemplateExpressions,
  validateTemplateStructure,
} from '../src/index.js'

describe('includable resolver & 6-tier ontological dispatch', () => {
  const sampleXml = `
    <b:defaultmarkups>
      <b:defaultmarkup type='Common'>
        <b:includable id='sharedIcon'>
          <svg class='icon-common'/>
        </b:includable>
        <b:includable id='duplicateMacro'>
          <span>Common Macro</span>
        </b:includable>
      </b:defaultmarkup>

      <b:defaultmarkup type='All'>
        <b:includable id='main'>
          <div class='universal-main-v1'/>
        </b:includable>
        <b:includable id='duplicateMacro'>
          <span>Universal Macro</span>
        </b:includable>
      </b:defaultmarkup>

      <b:defaultmarkup type='Blog,PopularPosts'>
        <b:includable id='postCard'>
          <article class='gadget-card'/>
        </b:includable>
      </b:defaultmarkup>

      <!-- Duplicate All block to test last_block_wins collision rule -->
      <b:defaultmarkup type='All'>
        <b:includable id='main'>
          <div class='universal-main-v2'/>
        </b:includable>
      </b:defaultmarkup>
    </b:defaultmarkups>
  `

  const doc = parseTemplate(sampleXml)
  const defaultmarkups = collectDefaultMarkups(doc)

  it('scans all <b:defaultmarkup> blocks from document AST', () => {
    expect(defaultmarkups).toHaveLength(4)
    const types = defaultmarkups.map(dm => dm.attributes.find(a => a.name === 'type')?.value)
    expect(types).toEqual(['Common', 'All', 'Blog,PopularPosts', 'All'])
  })

  it('indexes includable blocks with indexIncludables', () => {
    const commonDm = defaultmarkups[0]!
    const map = indexIncludables(commonDm)
    expect(map.has('sharedIcon')).toBe(true)
    expect(map.has('duplicateMacro')).toBe(true)
    expect(map.get('sharedIcon')?.name).toBe('b:includable')
  })

  it('resolves Tier 1: local_widget over higher defaultmarkup tiers', () => {
    const localXml = `
      <b:widget id='Blog1' type='Blog'>
        <b:includable id='main'>
          <div class='local-main'/>
        </b:includable>
      </b:widget>
    `
    const widgetDoc = parseTemplate(localXml)
    const widgetNode = widgetDoc.children.find(c => c.type === 'Directive' && c.name === 'b:widget') as any
    const localIncludables = indexIncludables(widgetNode)

    const res = resolveIncludable(
      { targetId: 'main', widgetId: 'Blog1', widgetType: 'Blog' },
      { localIncludables, defaultmarkups },
    )

    expect(res.resolved).toBe(true)
    expect(res.tier).toBe('local_widget')
    expect(res.sourceContainer).toBe('Blog1')
    expect(res.includableNode).toBeDefined()
  })

  it('resolves Tier 2: gadget_specific with multi-type declarations', () => {
    // Both Blog and PopularPosts match type='Blog,PopularPosts'
    const resBlog = resolveIncludable(
      { targetId: 'postCard', widgetId: 'Blog1', widgetType: 'Blog' },
      { defaultmarkups },
    )
    expect(resBlog.resolved).toBe(true)
    expect(resBlog.tier).toBe('gadget_specific')
    expect(resBlog.sourceContainer).toBe('Blog,PopularPosts')

    const resPop = resolveIncludable(
      { targetId: 'postCard', widgetId: 'PopularPosts1', widgetType: 'PopularPosts' },
      { defaultmarkups },
    )
    expect(resPop.resolved).toBe(true)
    expect(resPop.tier).toBe('gadget_specific')
  })

  it('resolves Tier 3: universal_widget and enforces last_block_wins', () => {
    // Target 'main' is declared in both All blocks; the second (v2) must win
    const res = resolveIncludable(
      { targetId: 'main', widgetId: 'Header1', widgetType: 'Header' },
      { defaultmarkups },
    )
    expect(res.resolved).toBe(true)
    expect(res.tier).toBe('universal_widget')
    expect(res.sourceContainer).toBe('All')

    const children = res.includableNode?.children as any[]
    expect(children.some(c => c.type === 'Element' && c.attributes.some((a: any) => a.value === 'universal-main-v2'))).toBe(true)
  })

  it('resolves Tier 4: shared_common when unhandled in lower tiers', () => {
    const res = resolveIncludable(
      { targetId: 'sharedIcon', widgetId: 'Blog1', widgetType: 'Blog' },
      { defaultmarkups },
    )
    expect(res.resolved).toBe(true)
    expect(res.tier).toBe('shared_common')
    expect(res.sourceContainer).toBe('Common')
  })

  it('resolves Tier 5: platform_server for standard platform inclusions', () => {
    const res = resolveIncludable(
      { targetId: 'all-head-content', isGlobalScope: true },
      { defaultmarkups },
    )
    expect(res.resolved).toBe(true)
    expect(res.tier).toBe('platform_server')
    expect(res.serverInclusion?.isServerInclusion).toBe(true)
  })

  it('resolves Tier 6: unresolved with BX1037 and canonical error comment', () => {
    const res = resolveIncludable(
      { targetId: 'nonExistentSubroutine', widgetId: 'Blog2', widgetType: 'Blog' },
      { defaultmarkups },
    )
    expect(res.resolved).toBe(false)
    expect(res.tier).toBe('unresolved')
    expect(res.diagnostic).toBe('BX1037')
    expect(res.failureComment).toBe(
      '<!--Failed to render gadget \'Blog2\'.\n\nThere was an error processing the markup.\n-->',
    )
  })

  it('provides getLocalStubInclusion with clean normalized markup', () => {
    const stub = getLocalStubInclusion('all-head-content')
    expect(stub).toBeDefined()
    expect(stub).toContain('<meta charset=\'UTF-8\'/>')
    expect(stub).toContain('name=\'viewport\'')
    expect(stub).toContain('rel=\'canonical\'')
    // Must NOT contain legacy server bloat
    expect(stub).not.toContain('latencyHeadScript')
    expect(stub).not.toContain('BackgroundImageCache')
  })

  describe('includable resolution hierarchy & data contract', () => {
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
})
