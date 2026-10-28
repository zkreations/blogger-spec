import { describe, expect, it } from 'vitest'
import { getDomMutationPipeline, getSpecCatalog } from '../src/catalogs/index.js'

describe('dom mutation pipeline & hoisting state machine (Plan 03)', () => {
  it('exposes canonical dom_mutation_pipeline from directives catalog', () => {
    const pipeline = getDomMutationPipeline()
    expect(pipeline).toBeDefined()

    expect(pipeline?.target_resolution.traversed_containers).toContain('b:if')
    expect(pipeline?.target_resolution.traversed_containers).toContain('b:loop')
    expect(pipeline?.target_resolution.traversed_containers).toContain('b:tag[cond=false]')
    expect(pipeline?.target_resolution.boundary_crossings).toContain('b:include')

    expect(pipeline?.class_mutation.mode).toBe('accumulate')
    expect(pipeline?.class_mutation.separator).toBe(' ')
    expect(pipeline?.class_mutation.existing_class_policy).toBe('preserve')
    expect(pipeline?.class_mutation.loop_accumulation).toBe(true)

    expect(pipeline?.attr_mutation.mode).toBe('upsert_or_omit')
    expect(pipeline?.attr_mutation.empty_value_policy).toBe('omit_completely')
    expect(pipeline?.attr_mutation.overwrite_policy).toBe('overwrite_existing')
    expect(pipeline?.attr_mutation.allows_id_override).toBe(true)

    const whitespaceAttr = pipeline?.attr_mutation.special_pseudo_attributes['b:whitespace']
    expect(whitespaceAttr).toBeDefined()
    expect(whitespaceAttr?.value).toBe('remove')
    expect(whitespaceAttr?.suppressed_from_output).toBe(true)
    expect(whitespaceAttr?.forces_clean_void_closure).toBe(true)

    expect(pipeline?.tag_unwrapping.false_condition_behavior).toBe('unwrap_children_and_hoist_mutations')
  })

  it('documents widget synthetic wrapper mutation in b:widget constraints', () => {
    const catalog = getSpecCatalog()
    const widgetDef = catalog.getDirective('b:widget')
    expect(widgetDef?.constraints?.synthetic_wrapper_mutation).toBeDefined()
  })

  it('documents continuous hoisting in b:tag constraints', () => {
    const catalog = getSpecCatalog()
    const tagDef = catalog.getDirective('b:tag')
    expect(tagDef?.constraints?.unwrapping_hoisting).toBeDefined()
  })
})
