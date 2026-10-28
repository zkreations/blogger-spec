import type { BloggerFixture, BloggerFixturesManifest } from '../src/types.js'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  getCoercionRules,
  getDiagnostics,
  getDirective,
  getInclusion,
  getOperator,
  getRuntimeEvaluationStates,
  getViewsMatrix,
  getWidget,
  getWidgetSettings,
} from '../src/catalogs/index.js'
import { parseExpression, validateExpression, validateTemplateStructure } from '../src/parser/index.js'
import { getWorkspacePaths, setCustomWorkspaceRoot } from '../src/paths.js'
import { evaluateExpressionBudget } from '../src/quota.js'
import { runConformance } from '../src/runner.js'
import { verifyArtifactsFreshness } from '../src/tooling/compiler.js'
import { validateSpec } from '../src/tooling/validator.js'

describe('blogger-spec Integrity & Deep Modules Suite', () => {
  describe('specValidator and catalogs', () => {
    it('validates all schemas and freshness via SpecValidator', () => {
      const manifest = JSON.parse(readFileSync(getWorkspacePaths().fixturesManifest, 'utf-8')) as BloggerFixturesManifest
      const report = validateSpec()
      expect(report.valid).toBe(true)
      expect(report.errors).toEqual([])
      expect(report.metrics.schemasChecked).toBe(11)
      expect(report.metrics.fixturesChecked).toBe(manifest.fixtures.length)
      expect(report.metrics.fixturesChecked).toBeGreaterThanOrEqual(250)
    })

    it('covers 100% of canonical diagnostic rules across fixtures', () => {
      const manifest = JSON.parse(readFileSync(getWorkspacePaths().fixturesManifest, 'utf-8')) as BloggerFixturesManifest
      const coveredRules = new Set<string>()
      for (const f of manifest.fixtures) {
        for (const c of f.covers || []) {
          if (c.startsWith('rule:')) {
            coveredRules.add(c.replace('rule:', ''))
          }
        }
      }
      const allDiagRules = Object.keys(getDiagnostics().rules)
      expect(coveredRules.size).toBe(allDiagRules.length)
      for (const rule of allDiagRules) {
        expect(coveredRules.has(rule)).toBe(true)
      }
    })

    it('honors SpecValidator custom reporter and checkDtsFreshness options', () => {
      const messages: string[] = []
      const report = validateSpec({
        reporter: msg => messages.push(msg),
        checkDtsFreshness: false,
      })
      expect(report.valid).toBe(true)
      expect(messages.some(m => m.includes('check skipped'))).toBe(true)
    })
  })

  describe('conformance engine', () => {
    it('runs conformance harness with default manifest and custom adapter', () => {
      const manifest = JSON.parse(readFileSync(getWorkspacePaths().fixturesManifest, 'utf-8')) as BloggerFixturesManifest
      const sampleExprFixture = manifest.fixtures.find(f => f.input.kind === 'expression' && f.expected.outcome === 'value')
      const sampleDiagFixture = manifest.fixtures.find(f => f.input.kind === 'template' && f.expected.outcome === 'rejected' && f.expected.diagnosticCodes?.length)

      const report = runConformance({
        evaluateExpression(expr) {
          if (sampleExprFixture && expr === sampleExprFixture.input.source)
            return sampleExprFixture.expected.value
          return '__UNMATCHED_VALUE__'
        },
        analyze(source) {
          if (sampleDiagFixture && source === sampleDiagFixture.input.source) {
            return sampleDiagFixture.expected.diagnosticCodes!.map(c => ({ code: c }))
          }
          return []
        },
      })

      expect(report.total).toBe(manifest.fixtures.length)
      expect(report.passed).toBeGreaterThanOrEqual(2)
      expect(report.skipped).toBeGreaterThan(0)
      expect(report.failed).toBeGreaterThan(0)
    })

    const mockFixtures: BloggerFixture[] = [
      {
        id: 'mock-expr-1',
        title: 'Mock addition',
        evidence: 'official',
        verified_at: '2026-10-10',
        covers: ['operator:+'],
        input: { kind: 'expression', source: '2 + 2', context: { multiplier: 2 } },
        expected: { outcome: 'value', value: 4 },
      },
      {
        id: 'mock-tpl-1',
        title: 'Mock template',
        evidence: 'observed',
        verified_at: '2026-10-10',
        covers: ['tag:b:eval'],
        input: { kind: 'template', source: '<b:eval expr="2 + 2"/>' },
        expected: { outcome: 'html', html: '<div>4</div>' },
      },
      {
        id: 'mock-diag-1',
        title: 'Mock diagnostic rejection',
        evidence: 'official',
        verified_at: '2026-10-10',
        covers: ['rule:BX1025'],
        input: { kind: 'template', source: '<b:unknown/>' },
        expected: { outcome: 'rejected', diagnosticCodes: ['BX1025'] },
      },
    ]

    it('executes in-memory fixtures and passes contexts', () => {
      let receivedContext: any = null
      const inMemoryReport = runConformance(
        {
          evaluateExpression: (_expr, ctx) => {
            receivedContext = ctx
            return 4
          },
          renderTemplate: () => '<div>4</div>',
          analyze: () => [{ code: 'BX1025' }],
        },
        { fixtures: mockFixtures },
      )

      expect(inMemoryReport.total).toBe(3)
      expect(inMemoryReport.passed).toBe(3)
      expect(inMemoryReport.failed).toBe(0)
      expect(receivedContext).toEqual({ multiplier: 2 })
    })

    it('filters fixtures by kind, covers, evidence, and ids', () => {
      const byKind = runConformance(
        { evaluateExpression: () => 4 },
        { fixtures: mockFixtures, filter: { kind: 'expression' } },
      )
      expect(byKind.total).toBe(1)
      expect(byKind.results[0]?.id).toBe('mock-expr-1')

      const byCovers = runConformance(
        { renderTemplate: () => '<div>4</div>' },
        { fixtures: mockFixtures, filter: { covers: ['tag:b:eval'] } },
      )
      expect(byCovers.total).toBe(1)
      expect(byCovers.results[0]?.id).toBe('mock-tpl-1')

      const byEvidence = runConformance(
        { evaluateExpression: () => 4, analyze: () => [{ code: 'BX9999' }] },
        { fixtures: mockFixtures, filter: { evidence: ['official'] } },
      )
      expect(byEvidence.total).toBe(2)

      const byIds = runConformance(
        { renderTemplate: () => '<div>4</div>' },
        { fixtures: mockFixtures, filter: { ids: ['mock-tpl-1'] } },
      )
      expect(byIds.total).toBe(1)
      expect(byIds.results[0]?.id).toBe('mock-tpl-1')
    })

    it('accepts fixture manifest objects in options.fixtures', () => {
      const manifestObject: BloggerFixturesManifest = {
        version: '1.0.0',
        generatedAt: '2026-10-10',
        metrics: { totalFixtures: 1, positiveFixtures: 1, negativeFixtures: 0, coveredSpecEntities: 1 },
        fixtures: [mockFixtures[0]!],
      }
      const report = runConformance(
        { evaluateExpression: () => 4 },
        { fixtures: manifestObject },
      )
      expect(report.total).toBe(1)
      expect(report.passed).toBe(1)
    })

    it('rejects a rejected fixture without expected diagnostic codes', () => {
      const invalidFixture = {
        ...mockFixtures[2]!,
        expected: { outcome: 'rejected' as const },
      }

      expect(() => runConformance(
        { analyze: () => [] },
        { fixtures: [invalidFixture] },
      )).toThrow(`Rejected fixture 'mock-diag-1' must define at least one expected diagnostic code.`)
    })

    it('fails clearly when the default manifest is missing', () => {
      try {
        setCustomWorkspaceRoot(join(tmpdir(), 'missing-blogger-spec-fixtures'))
        expect(() => runConformance({})).toThrow('Fixtures manifest not found:')
      }
      finally {
        setCustomWorkspaceRoot(null)
      }
    })

    it('captures expression evaluation mismatch and thrown exceptions', () => {
      const mismatchReport = runConformance(
        { evaluateExpression: () => 999 },
        { fixtures: [mockFixtures[0]!] },
      )
      expect(mismatchReport.failed).toBe(1)
      expect(mismatchReport.results[0]?.passed).toBe(false)
      expect(mismatchReport.results[0]?.message).toContain('Value mismatch')

      const throwReport = runConformance(
        {
          evaluateExpression: () => {
            throw new Error('Eval crash')
          },
        },
        { fixtures: [mockFixtures[0]!] },
      )
      expect(throwReport.failed).toBe(1)
      expect(throwReport.results[0]?.message).toContain('Evaluation threw exception: Eval crash')
    })

    it('captures template rendering mismatch and thrown exceptions', () => {
      const mismatchReport = runConformance(
        { renderTemplate: () => '<div>wrong</div>' },
        { fixtures: [mockFixtures[1]!] },
      )
      expect(mismatchReport.failed).toBe(1)
      expect(mismatchReport.results[0]?.passed).toBe(false)
      expect(mismatchReport.results[0]?.message).toContain('HTML mismatch')

      const throwReport = runConformance(
        {
          renderTemplate: () => {
            throw new Error('Render crash')
          },
        },
        { fixtures: [mockFixtures[1]!] },
      )
      expect(throwReport.failed).toBe(1)
      expect(throwReport.results[0]?.message).toContain('Rendering threw exception: Render crash')
    })

    it('captures rejected diagnostic code mismatch and analyzer exceptions', () => {
      const missingCodeReport = runConformance(
        { analyze: () => [{ code: 'BX0000' }] },
        { fixtures: [mockFixtures[2]!] },
      )
      expect(missingCodeReport.failed).toBe(1)
      expect(missingCodeReport.results[0]?.message).toContain('Missing expected diagnostic code(s): BX1025')

      const throwReport = runConformance(
        {
          analyze: () => {
            throw new Error('Analyze crash')
          },
        },
        { fixtures: [mockFixtures[2]!] },
      )
      expect(throwReport.failed).toBe(1)
      expect(throwReport.results[0]?.message).toContain('Analyzer threw exception: Analyze crash')
    })

    it('increments report.skipped when adapter methods are missing', () => {
      const report = runConformance({}, { fixtures: mockFixtures })
      expect(report.total).toBe(3)
      expect(report.skipped).toBe(3)
      expect(report.passed).toBe(0)
      expect(report.failed).toBe(0)
    })

    it('supports custom normalizeHtml function in ConformanceOptions', () => {
      const report = runConformance(
        { renderTemplate: () => '  <div>  4  </div>  ' },
        {
          fixtures: [mockFixtures[1]!],
          normalizeHtml: html => (html || '').replace(/\s+/g, ''),
        },
      )
      expect(report.passed).toBe(1)
    })
  })

  describe('tooling and workspace integrity', () => {
    it('resolves workspace paths through single seam and supports custom root override', () => {
      const paths = getWorkspacePaths()
      expect(paths.root).toBeDefined()
      expect(paths.catalogs).toContain('catalogs')
      expect(paths.fixturesManifest).toContain('index.json')

      try {
        setCustomWorkspaceRoot('/custom/test/root')
        const customPaths = getWorkspacePaths()
        expect(customPaths.root).toBe('/custom/test/root')
        expect(customPaths.catalogs).toContain('catalogs')
      }
      finally {
        setCustomWorkspaceRoot(null)
      }

      const restoredPaths = getWorkspacePaths()
      expect(restoredPaths.root).toBe(paths.root)
    })

    it('verifies artifacts freshness across all targets via compiler module', () => {
      const freshness = verifyArtifactsFreshness()
      expect(freshness.allValid).toBe(true)
      expect(freshness.items.length).toBeGreaterThanOrEqual(2)
      expect(freshness.items.every(i => i.valid)).toBe(true)
    })
  })

  describe('self-conformance against parser and validator engine', () => {
    const manifest = JSON.parse(readFileSync(getWorkspacePaths().fixturesManifest, 'utf-8')) as BloggerFixturesManifest

    it('parses all positive expression fixtures without syntax errors and within budget', () => {
      const positiveExprs = manifest.fixtures.filter(f => f.input.kind === 'expression' && f.expected.outcome === 'value')
      expect(positiveExprs.length).toBeGreaterThan(100)

      for (const f of positiveExprs) {
        expect(() => parseExpression(f.input.source)).not.toThrow()
        const budget = evaluateExpressionBudget(f.input.source)
        expect(budget.isValid, `Expression '${f.input.source}' in fixture '${f.id}' exceeded quota budget`).toBe(true)
      }
    })

    it('validates negative syntax fixtures and produces expected diagnostics', () => {
      const negativeFixtures = manifest.fixtures.filter(f => f.expected.outcome === 'rejected' && f.expected.diagnosticCodes)
      expect(negativeFixtures.length).toBeGreaterThan(40)

      for (const f of negativeFixtures) {
        let diags: Array<{ code: string }> = []
        if (f.input.kind === 'expression') {
          diags = validateExpression(f.input.source)
        }
        else {
          diags = validateTemplateStructure(f.input.source, undefined, { validateExpressions: true })
        }
        const actualCodes = new Set(diags.map(d => d.code))
        for (const expectedCode of f.expected.diagnosticCodes || []) {
          expect(actualCodes.has(expectedCode), `Fixture '${f.id}' expected diagnostic '${expectedCode}' but got [${Array.from(actualCodes).join(', ')}]`).toBe(true)
        }
      }
    })
  })

  describe('local compiler SSOT contracts (BC-01 to BC-07)', () => {
    it('defines all 12 canonical views and 4 runtime evaluation states (BC-02, BC-03)', () => {
      const views = getViewsMatrix()
      expect(Object.keys(views)).toEqual([
        'homepage',
        'post_listing',
        'search_query',
        'label_search',
        'archive_yearly',
        'archive_monthly',
        'archive_weekly_daily',
        'post',
        'static_page',
        'error_404',
        'preview',
        'layout_mode',
      ])
      expect(views.homepage.flags.isSearch).toBe('missing')
      expect(views.search_query.flags.isSearch).toBe('true')
      expect(views.preview.flags.isPreview).toBe('true')
      expect(views.layout_mode.flags.isLayoutMode).toBe('true')

      const evalStates = getRuntimeEvaluationStates()
      expect(Object.keys(evalStates)).toEqual(['VALUE', 'EMPTY', 'MISSING', 'NOT_SINGLETON'])
      expect(evalStates.NOT_SINGLETON?.boolean_coercion).toBe('truthy')
      expect(evalStates.MISSING?.boolean_coercion).toBe('falsy')

      const coercionRules = getCoercionRules()
      expect(coercionRules.non_singleton_serialization).toBeDefined()
      expect(coercionRules.missing_property_serialization).toBeDefined()
    })

    it('declares widget runtime_rendering_policy, setting value_transform, and directive rendering contracts (BC-05)', () => {
      expect(getWidget('PageList')?.runtime_rendering_policy).toBe('suppress_when_empty')
      expect(getWidget('ReportAbuse')?.runtime_rendering_policy).toBe('server_forced_markup')
      expect(getWidget('Blog')?.runtime_rendering_policy).toBe('standard')

      expect(getWidgetSettings('BlogArchive')?.canonical.showStyle?.value_transform).toBe('none')
      expect(getWidgetSettings('Header')?.canonical.imagePlacement?.value_transform).toBe('none')
      expect(getWidgetSettings('Label')?.canonical.display?.value_transform).toBe('lowercase')
      expect(getWidgetSettings('LinkList')?.canonical.sorting?.value_transform).toBe('lowercase')
      expect(getWidgetSettings('TextList')?.canonical.sorting?.value_transform).toBe('lowercase')

      expect(getDirective('b:section')?.spec_extensions?.rendering).toBeDefined()
      expect(getDirective('b:widget')?.spec_extensions?.rendering).toBeDefined()
      expect(getDirective('data:*')?.spec_extensions?.rendering).toBeDefined()
      expect(getInclusion('all-head-content')).toBeDefined()
      expect(getInclusion('reportAbuse')).toBeDefined()
    })

    it('enforces resizeImage and sourceSet operator signatures (BC-06, BC-07)', () => {
      const resizeOp = getOperator('resizeImage')
      expect(resizeOp?.return_type).toBe('image')
      expect(resizeOp?.overloads?.map(o => o.return_type)).toEqual(['image', 'array[object]'])

      const sourceSetOp = getOperator('sourceSet')
      expect(sourceSetOp?.return_type).toBe('string')
      expect(sourceSetOp?.anti_patterns?.some(p => p.includes('resizeImage'))).toBe(true)
    })
  })
})
