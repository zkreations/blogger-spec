import { describe, expect, it } from 'vitest'
import { getRenderPipeline, getSpecCatalog } from '../src/index.js'

describe('render pipeline & execution machine specification (Phase 4)', () => {
  it('exposes canonical render_pipeline from directives catalog', () => {
    const pipeline = getRenderPipeline()
    const catalogPipeline = getSpecCatalog().getRenderPipeline()

    expect(pipeline).toBeDefined()
    expect(catalogPipeline).toBeDefined()
    expect(pipeline?.execution_model).toBe('ast_walk_with_scope_and_mutation_buffer')
    expect(pipeline?.phases.length).toBe(5)
  })

  it('specifies Phase 1: Subroutine & Template Registry with 6-tier dispatch', () => {
    const pipeline = getRenderPipeline()
    const phase1 = pipeline?.phases.find(p => p.phase === 1)

    expect(phase1).toBeDefined()
    expect(phase1?.name).toBe('registration')
    expect(phase1?.operations).toContain('collect_defaultmarkups')
    expect(phase1?.operations).toContain('index_local_includables')
    expect(phase1?.operations).toContain('build_dispatch_table')
  })

  it('specifies Phase 2: Theme Designer Skin Compilation & Font Inlining Adaptation', () => {
    const pipeline = getRenderPipeline()
    const phase2 = pipeline?.phases.find(p => p.phase === 2)

    expect(phase2).toBeDefined()
    expect(phase2?.name).toBe('skin_processing')
    expect(phase2?.operations).toContain('substitute_variable_references')
    expect(phase2?.operations).toContain('decompose_composite_fonts')
    expect(phase2?.operations).toContain('inject_google_fonts_links')
  })

  it('specifies Phase 3: Synthetic Section & Widget Containers', () => {
    const pipeline = getRenderPipeline()
    const phase3 = pipeline?.phases.find(p => p.phase === 3)

    expect(phase3).toBeDefined()
    expect(phase3?.name).toBe('synthetic_containers')
    expect(phase3?.operations).toContain('emit_section_container')
    expect(phase3?.operations).toContain('validate_section_layout_v3_attributes')
    expect(phase3?.operations).toContain('evaluate_widget_runtime_rendering_policy')
    expect(phase3?.operations).toContain('emit_widget_synthetic_wrapper')
  })

  it('specifies Phase 4: Lexical Scope Stack & Parameter Binding without var', () => {
    const pipeline = getRenderPipeline()
    const phase4 = pipeline?.phases.find(p => p.phase === 4)

    expect(phase4).toBeDefined()
    expect(phase4?.name).toBe('scope_management')
    expect(phase4?.operations).toContain('push_global_scope')
    expect(phase4?.operations).toContain('push_widget_scope')
    expect(phase4?.operations).toContain('push_includable_scope')
    expect(phase4?.operations).toContain('bind_data_payload_without_var')
    expect(phase4?.operations).toContain('resolve_identifier_with_fallback')
  })

  it('specifies Phase 5: Continuous DOM Mutation & Hoisting Buffer', () => {
    const pipeline = getRenderPipeline()
    const phase5 = pipeline?.phases.find(p => p.phase === 5)

    expect(phase5).toBeDefined()
    expect(phase5?.name).toBe('dom_mutation_buffer')
    expect(phase5?.operations).toContain('intercept_b_class_mutations')
    expect(phase5?.operations).toContain('intercept_b_attr_mutations')
    expect(phase5?.operations).toContain('hoist_through_containers')
    expect(phase5?.operations).toContain('apply_to_nearest_html_ancestor')
    expect(phase5?.operations).toContain('apply_to_widget_synthetic_wrapper')
    expect(phase5?.operations).toContain('enforce_whitespace_remove')
  })
})
