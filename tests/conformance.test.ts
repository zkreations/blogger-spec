import type { BloggerFixture, BloggerFixturesManifest } from '../src/types.js'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  clearCatalogCache,
  getAllCatalogs,
  getAllSchemas,
  getCatalog,
  getDiagnostics,
  getDirectives,
  getGlobals,
  getMessages,
  getOperators,
  getScopes,
  getSettings,
  getTypes,
  getWidgets,
  MemoryCatalogStore,
  SpecCatalog,
} from '../src/catalogs/index.js'
import {
  getDiagnosticRule,
  getDirective,
  getOperator,
  getOperatorPrecedence,
  getSpecCatalog,
  isDiagnosticCode,
  isDirective,
  isDocAlias,
  isGrammarOperator,
  isOperator,
  isSelfClosingDirective,
  isValidChild,
  isValidParent,
  validateDirectiveAttributes,
} from '../src/helpers.js'
import * as RootExports from '../src/index.js'
import { getWorkspacePaths, setCustomWorkspaceRoot } from '../src/paths.js'
import { runConformance, runSpecConformance } from '../src/runner.js'
import { verifyArtifactsFreshness } from '../src/tooling/compiler.js'
import { validateSpec } from '../src/tooling/validator.js'

describe('blogger-spec Integrity & Deep Modules Suite', () => {
  describe('specValidator and catalogs', () => {
    it('validates all schemas and freshness via SpecValidator', () => {
      const report = validateSpec()
      expect(report.valid).toBe(true)
      expect(report.errors).toEqual([])
      expect(report.metrics.schemasChecked).toBe(10)
      expect(report.metrics.fixturesChecked).toBeGreaterThanOrEqual(118)
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

    it('serves typed and memoized catalogs via CatalogStore', () => {
      const dirs1 = getDirectives()
      const dirs2 = getCatalog('directives')
      expect(dirs1).toBe(dirs2)
      expect(Object.keys(dirs1.directives).length).toBeGreaterThanOrEqual(26)

      const ops = getOperators()
      expect(Object.keys(ops.operators).length).toBeGreaterThanOrEqual(36)

      expect(getDiagnostics().rules).toBeDefined()
      expect(getTypes().types).toBeDefined()
      expect(Object.keys(getTypes().types['skin:font']?.modifiers || {})).toEqual(['family', 'size'])
      expect(getGlobals().objects).toBeDefined()
      expect(getWidgets().widgets).toBeDefined()
      expect(getSettings().widgets).toBeDefined()
      expect(getMessages().messages).toBeDefined()
      expect(getScopes().scopes).toBeDefined()

      const all = getAllCatalogs()
      expect(Object.keys(all)).toEqual([
        'directives',
        'operators',
        'types',
        'widgets',
        'settings',
        'globals',
        'messages',
        'scopes',
        'diagnostics',
        'inclusions',
      ])

      const schemas = getAllSchemas()
      expect(schemas.length).toBe(10)
      expect(schemas.every(s => s.name && s.schema)).toBe(true)
    })

    it('clears memoization cache upon clearCatalogCache()', () => {
      const before = getCatalog('directives')
      clearCatalogCache()
      const after = getCatalog('directives')
      expect(before).not.toBe(after)
      expect(before).toEqual(after)
    })

    it('supports custom CatalogStore adapters including in-memory store', () => {
      const memoryStore = new MemoryCatalogStore(
        {
          directives: {
            directives: {
              'b:custom': { category: 'Custom', namespace: 'b', description: 'Test directive' },
            },
          },
          operators: { operators: {} },
          diagnostics: { rules: {} },
          widgets: { widgets: {} },
          settings: { widgets: {} },
          globals: { objects: {} },
          messages: { messages: {} },
          scopes: { scopes: {} },
          types: { types: {} },
          inclusions: { inclusions: {} } as any,
        },
        {
          custom: { $id: 'custom.schema.json' },
        },
      )

      const memoryCatalog = new SpecCatalog(memoryStore)
      expect(memoryCatalog.isDirective('b:custom')).toBe(true)
      expect(memoryCatalog.isDirective('b:widget')).toBe(false)
      expect(memoryCatalog.getDirective('b:custom')?.category).toBe('Custom')
      expect(memoryStore.getAllSchemas().length).toBe(1)
    })

    it('exports all canonical catalogs and getters from package root index', () => {
      expect(RootExports.directives).toBeDefined()
      expect(RootExports.operators).toBeDefined()
      expect(RootExports.types).toBeDefined()
      expect(RootExports.widgets).toBeDefined()
      expect(RootExports.settings).toBeDefined()
      expect(RootExports.globals).toBeDefined()
      expect(RootExports.messages).toBeDefined()
      expect(RootExports.scopes).toBeDefined()
      expect(RootExports.diagnostics).toBeDefined()
      expect(typeof RootExports.getAllCatalogs).toBe('function')
    })
  })

  describe('conformance engine', () => {
    it('runs conformance harness with default manifest and custom adapter', () => {
      const report = runSpecConformance({
        evaluateExpression(expr) {
          if (expr === '10 + 5')
            return 15
          if (expr === '10 + "10"')
            return '1010'
          if (expr === '10 + data:numString')
            return 20
          return null
        },
        analyze(source) {
          if (source.includes('<b:for')) {
            return [{ code: 'BX1001' }]
          }
          if (source.includes('<b:set')) {
            return [{ code: 'BX1003' }]
          }
          return []
        },
      })

      expect(report.total).toBeGreaterThanOrEqual(63)
      expect(report.passed).toBe(7)
      expect(report.skipped).toBeGreaterThan(0)
      expect(report.failed).toBeGreaterThan(0)
    })

    const mockFixtures: BloggerFixture[] = [
      {
        id: 'mock-expr-1',
        title: 'Mock addition',
        evidence: 'official',
        verifiedAt: '2026-10-10',
        covers: ['operators:addition'],
        input: { kind: 'expression', source: '2 + 2', context: { multiplier: 2 } },
        expected: { outcome: 'value', value: 4 },
      },
      {
        id: 'mock-tpl-1',
        title: 'Mock template',
        evidence: 'observed',
        verifiedAt: '2026-10-10',
        covers: ['directives:eval'],
        input: { kind: 'template', source: '<b:eval expr="2 + 2"/>' },
        expected: { outcome: 'html', html: '<div>4</div>' },
      },
      {
        id: 'mock-diag-1',
        title: 'Mock diagnostic rejection',
        evidence: 'official',
        verifiedAt: '2026-10-10',
        covers: ['diagnostics:syntax'],
        input: { kind: 'template', source: '<b:unknown/>' },
        expected: { outcome: 'rejected', diagnosticCodes: ['BX9999'] },
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
          analyze: () => [{ code: 'BX9999' }],
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
        { fixtures: mockFixtures, filter: { covers: ['directives:eval'] } },
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
      expect(missingCodeReport.results[0]?.message).toContain('Missing expected diagnostic code(s): BX9999')

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

  describe('runtime helpers and AST types', () => {
    it('provides query helpers for directives', () => {
      expect(isDirective('b:widget')).toBe(true)
      expect(isDirective('b:loop')).toBe(true)
      expect(isDirective('b:nonexistent')).toBe(false)

      const widgetDef = getDirective('b:widget')
      expect(widgetDef).toBeDefined()
      expect(widgetDef?.category).toBe('Structuring')

      expect(isSelfClosingDirective('b:eval')).toBe(true)
      expect(isSelfClosingDirective('b:widget')).toBe(false)

      expect(isValidChild('b:section', 'b:widget')).toBe(true)
      expect(isValidChild('b:section', 'b:section')).toBe(false)

      expect(isValidParent('b:widget', 'b:section')).toBe(true)
      expect(isValidParent('b:widget', 'b:widget')).toBe(false)

      const validAttrs = validateDirectiveAttributes('b:widget', ['id', 'type'])
      expect(validAttrs.valid).toBe(true)
      expect(validAttrs.missingRequired).toEqual([])

      const missingAttrs = validateDirectiveAttributes('b:widget', ['id'])
      expect(missingAttrs.valid).toBe(false)
      expect(missingAttrs.missingRequired).toContain('type')

      const deprecatedAttrs = validateDirectiveAttributes('b:section', ['id', 'maxwidgets'])
      expect(deprecatedAttrs.deprecated.some(d => d.name === 'maxwidgets')).toBe(true)
    })

    it('provides query helpers for operators', () => {
      expect(isOperator('+')).toBe(true)
      expect(isOperator('*')).toBe(true)
      expect(isOperator('filter')).toBe(true)
      expect(isOperator('===')).toBe(false)

      // Operator aliases
      expect(isOperator('eq')).toBe(true)
      expect(isOperator('neq')).toBe(true)
      expect(isOperator('limit')).toBe(true)
      expect(isOperator('offset')).toBe(true)
      expect(isOperator('where')).toBe(true)
      expect(isOperator('select')).toBe(true)
      expect(isOperator('&&')).toBe(true)
      expect(isOperator('||')).toBe(true)
      expect(isOperator('!')).toBe(true)
      expect(isDocAlias('default')).toBe(true)
      expect(isDocAlias('elvis')).toBe(true)
      expect(getOperator('default')?.family).toBe('elvis')
      expect(getOperator('elvis')?.family).toBe('elvis')

      // Case-insensitivity
      expect(isOperator('resizeimage')).toBe(true)
      expect(isOperator('resizeImage')).toBe(true)
      expect(isOperator('appendparams')).toBe(true)
      expect(isOperator('appendParams')).toBe(true)

      const plusDef = getOperator('+')
      expect(plusDef).toBeDefined()
      expect(getOperatorPrecedence('+')).toBe(3)
      expect(getOperatorPrecedence('*')).toBe(2)
      expect(getOperatorPrecedence('filter')).toBe(10)

      // Grammar aliases (executable tokens in templates)
      expect(isOperator('eq')).toBe(true)
      expect(isGrammarOperator('eq')).toBe(true)
      expect(getOperator('eq')?.family).toBe('comparison')
      expect(getOperatorPrecedence('eq')).toBe(4)
      expect(isOperator('limit')).toBe(true)
      expect(getOperator('limit')?.family).toBe('collection')
      expect(getOperatorPrecedence('limit')).toBe(4)
      expect(isOperator('where')).toBe(true)
      expect(getOperator('where')?.family).toBe('lambda')
      expect(getOperatorPrecedence('where')).toBe(10)
      expect(getOperatorPrecedence('resizeimage')).toBe(3)
      expect(isOperator('?:')).toBe(true)
      expect(getOperatorPrecedence('?:')).toBe(2)
      expect(getOperator('?:')?.associativity).toBe('right-to-left')
      expect(isOperator('? :')).toBe(true)
      expect(isOperator('?')).toBe(true)
      expect(getOperatorPrecedence('? :')).toBe(9)
      expect(getOperatorPrecedence('?')).toBe(9)

      // Doc / search aliases (metadata only, not executable syntax)
      expect(isOperator('plus')).toBe(false)
      expect(isGrammarOperator('plus')).toBe(false)
      expect(isDocAlias('plus')).toBe(true)
      expect(getOperator('plus')?.family).toBe('arithmetic')
      expect(getOperatorPrecedence('plus')).toBeUndefined()
      expect(isOperator('elvis')).toBe(false)
      expect(isDocAlias('elvis')).toBe(true)
      expect(getOperator('elvis')?.family).toBe('elvis')
      expect(getOperatorPrecedence('elvis')).toBeUndefined()
      expect(isOperator('default')).toBe(false)
      expect(isDocAlias('default')).toBe(true)
      expect(getOperatorPrecedence('default')).toBeUndefined()
      expect(isOperator('ternary')).toBe(false)
      expect(isDocAlias('ternary')).toBe(true)
      expect(getOperatorPrecedence('ternary')).toBeUndefined()
    })

    it('provides query helpers for diagnostics', () => {
      expect(isDiagnosticCode('BX1001')).toBe(true)
      expect(isDiagnosticCode('BX9999')).toBe(false)

      const bx1001 = getDiagnosticRule('BX1001')
      expect(bx1001?.name).toBe('PROHIBITED_FOR_TAG')
      expect(bx1001?.severity).toBe('error')
    })

    it('exports all helpers from root index', () => {
      expect(typeof RootExports.isDirective).toBe('function')
      expect(typeof RootExports.getDirective).toBe('function')
      expect(typeof RootExports.isOperator).toBe('function')
      expect(typeof RootExports.getOperatorPrecedence).toBe('function')
      expect(typeof RootExports.getDiagnosticRule).toBe('function')
    })

    it('serves master catalogs matching RootExports directly', () => {
      expect(getCatalog('directives')).toEqual(RootExports.directives)
      expect(getCatalog('operators')).toEqual(RootExports.operators)
    })

    it('queries directives, operators, and rules via deep SpecCatalog engine', () => {
      const spec = getSpecCatalog()
      expect(spec).toBeInstanceOf(SpecCatalog)
      expect(spec.isDirective('b:loop')).toBe(true)
      expect(spec.isDirective('b:nonexistent')).toBe(false)
      expect(spec.isOperator('+')).toBe(true)
      expect(spec.isOperator('invalid_op')).toBe(false)
      expect(spec.isDiagnosticCode('BX1001')).toBe(true)
      expect(spec.isValidChild('b:section', 'b:widget')).toBe(true)
      expect(spec.isValidChild('b:section', 'b:section')).toBe(false)
      expect(spec.isValidParent('b:widget', 'b:section')).toBe(true)

      const validation = spec.validateDirectiveAttributes('b:widget', ['id', 'type'])
      expect(validation.valid).toBe(true)
      expect(validation.missingRequired).toEqual([])

      expect(spec.isWidget('Blog')).toBe(true)
      expect(spec.isWidget('NonExistentWidget')).toBe(false)
      expect(spec.getWidget('Blog')?.description).toBeDefined()
      expect(spec.getWidgetSettings('AdSense')).toBeDefined()
      expect(spec.isGlobal('data:view')).toBe(true)
      expect(spec.isGlobal('view')).toBe(true)
      expect(spec.getGlobal('data:blog')).toBeDefined()
      expect(spec.isMessage('archive')).toBe(true)
      expect(spec.getMessage('archive')?.type).toBe('message')
      expect(spec.isType('skin:font')).toBe(true)
      expect(Object.keys(spec.getType('skin:font')?.modifiers || {})).toEqual(['family', 'size'])
      expect(spec.isScope('loop')).toBe(true)
      expect(spec.getScopePrecedence()).toContain('lambda')
      expect(spec.getCoercionRules().string_concatenation).toBeDefined()
    })

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
})
