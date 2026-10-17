import { rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { embeddedCatalogs, embeddedSchemas } from '../src/catalogs/embedded.generated.js'
import {
  canBeAtRoot,
  canNest,
  clearCatalogCache,
  getAllCatalogs,
  getAllDiagnostics,
  getAllDirectives,
  getAllGlobals,
  getAllInclusions,
  getAllMessages,
  getAllOperators,
  getAllSchemas,
  getAllScopes,
  getAllTypes,
  getAllWidgets,
  getAllWidgetSettings,
  getCatalog,
  getCdataDirectives,
  getCompilerLimits,
  getCompilerQuotas,
  getDefaultCatalogStore,
  getDiagnostic,
  getDiagnostics,
  getDirective,
  getDirectiveAttributes,
  getDirectiveNestingLimit,
  getDirectives,
  getExpressionQuotaLimit,
  getExpressionQuotaWarning,
  getFalsyStringLiterals,
  getGlobal,
  getGlobals,
  getGrammarOperators,
  getHallucinatedDirectiveDiagnostic,
  getHallucinatedDirectives,
  getHtmlVoidElements,
  getInclusion,
  getInclusions,
  getLambdaKeywords,
  getLevelBindingPower,
  getMessage,
  getMessages,
  getOperator,
  getOperatorBindingPower,
  getOperatorPrecedence,
  getOperators,
  getPrecedenceHierarchy,
  getScalarTypes,
  getSchema,
  getScope,
  getScopePrecedence,
  getScopes,
  getSpecCatalog,
  getStandardDiagnostic,
  getStandardDiagnostics,
  getSuperPrefix,
  getTruthyStringLiterals,
  getType,
  getTypes,
  getWidget,
  getWidgets,
  getWidgetSettings,
  isDiagnosticCode,
  isDirective,
  isDirectiveExpressionAttribute,
  isDocAlias,
  isGlobal,
  isGrammarOperator,
  isHallucinatedDirective,
  isLogicalOperator,
  isMessage,
  isOperator,
  isRightAssociativeOperator,
  isScope,
  isSelfClosingDirective,
  isServerInclusion,
  isType,
  isWidget,
  MemoryCatalogStore,
  registerCacheResetListener,
  setDefaultCatalogStore,
  SpecCatalog,
  validateDirectiveAttributes,
  validateNesting,
} from '../src/catalogs/index.js'
import * as RootExports from '../src/index.js'
import { generateDomainTypes, generateDts } from '../src/tooling/compiler.js'
import { validateSpec } from '../src/tooling/validator.js'

describe('catalogs and store formal verification suite', () => {
  describe('catalog evolution contracts', () => {
    it('rejects unknown diagnostic references', () => {
      const catalogs = structuredClone(embeddedCatalogs)
      ;(catalogs.directives.domain_metadata!.standard_diagnostics as any).missing_required_attribute = 'BX9999'

      const report = validateSpec({
        store: new MemoryCatalogStore(catalogs, embeddedSchemas),
        checkDtsFreshness: false,
      })

      expect(report.valid).toBe(false)
      expect(report.errors).toContain(
        'Reference \'directives.json.domain_metadata.standard_diagnostics.missing_required_attribute\' points to unknown diagnostic \'BX9999\'.',
      )
    })

    it('rejects incoherent layout version declarations', () => {
      const catalogs = structuredClone(embeddedCatalogs)
      ;(catalogs.directives.domain_metadata!.layout_versions as any).default_version = 99

      const report = validateSpec({
        store: new MemoryCatalogStore(catalogs, embeddedSchemas),
        checkDtsFreshness: false,
      })

      expect(report.valid).toBe(false)
      expect(report.errors).toContain('Default layout version \'99\' is not supported.')
    })

    it('rejects broken nested bound_runtime_data paths in widgets', () => {
      const catalogs = structuredClone(embeddedCatalogs)
      catalogs.widgets.widgets.Blog.settings!.canonical!.authorLabel.bound_runtime_data = 'data:widgets.Blog1.allBylineItems.author.nonExistentField'

      const report = validateSpec({
        store: new MemoryCatalogStore(catalogs, embeddedSchemas),
        checkDtsFreshness: false,
      })

      expect(report.valid).toBe(false)
      expect(report.errors).toContain(
        'Widget setting \'Blog.authorLabel\' declares unresolved bound_runtime_data \'data:widgets.Blog1.allBylineItems.author.nonExistentField\'.',
      )
    })

    it('rejects mismatched Theme Designer skin variable types across directives and types catalogs', () => {
      const catalogs = structuredClone(embeddedCatalogs)
      ;(catalogs.directives.directives.Variable as any).type_attributes.shadow = {
        name: 'shadow',
        description: 'Phantom shadow type',
      }

      const report = validateSpec({
        store: new MemoryCatalogStore(catalogs, embeddedSchemas),
        checkDtsFreshness: false,
      })

      expect(report.valid).toBe(false)
      expect(report.errors).toContain(
        'Directive \'<Variable>\' declares type_attribute \'shadow\' without matching \'skin:shadow\' type in types.json.',
      )
    })

    it('rejects unknown or malformed covers entries in fixtures manifest', () => {
      const tempManifestPath = join(tmpdir(), `test-fixtures-${Date.now()}.json`)
      writeFileSync(
        tempManifestPath,
        JSON.stringify({
          version: '1.0.0',
          fixtures: [
            {
              id: 'test/broken-cover',
              covers: ['invalid_prefix:something', 'operator:nonExistentOp'],
              expected: { outcome: 'value', value: 1 },
            },
          ],
        }),
        'utf-8',
      )

      try {
        const report = validateSpec({
          fixturesManifestPath: tempManifestPath,
          checkDtsFreshness: false,
        })
        expect(report.valid).toBe(false)
        expect(report.errors).toContain(
          'Fixture \'test/broken-cover\' declares cover \'invalid_prefix:something\' with unknown prefix \'invalid_prefix\'.',
        )
        expect(report.errors).toContain(
          'Fixture \'test/broken-cover\' covers unknown operator \'nonExistentOp\'.',
        )
      }
      finally {
        rmSync(tempManifestPath, { force: true })
      }
    })
  })

  describe('memoryCatalogStore & store life-cycle', () => {
    it('retrieves all 9 canonical catalogs with pure in-memory access', () => {
      const all = getAllCatalogs()
      expect(Object.keys(all).sort()).toEqual([
        'diagnostics',
        'directives',
        'globals',
        'inclusions',
        'messages',
        'operators',
        'scopes',
        'types',
        'widgets',
      ])
    })

    it('isolates mutations by cloning raw catalogs on first cache access', () => {
      const store = new MemoryCatalogStore({
        directives: {
          $schema: 'directives.schema.json',
          title: 'Test',
          description: 'Test directives',
          directives: {},
          domain_metadata: {
            inclusion_classifications: {},
            super_inclusion: { syntax: '', description: '', requirements: [] },
          },
        } as any,
      })

      const first = store.getCatalog('directives')
      ;(first as any).title = 'MUTATED_TITLE'

      const second = store.getCatalog('directives')
      expect(second.title).toBe('MUTATED_TITLE') // Cached instance

      store.clearCache()
      const third = store.getCatalog('directives')
      expect(third.title).toBe('Test') // Restored from original raw catalog
    })

    it('throws descriptive error on missing catalog', () => {
      const store = new MemoryCatalogStore({})
      expect(() => store.getCatalog('directives')).toThrow(/Catalog not found in memory store: directives/)
    })

    it('throws descriptive error on missing schema', () => {
      const store = new MemoryCatalogStore({}, {})
      expect(() => store.getSchema('nonexistent')).toThrow(/Schema not found in memory store: nonexistent/)
    })

    it('retrieves schemas by canonical name and strips .schema.json extension', () => {
      const schemaObj = { type: 'object' }
      const store = new MemoryCatalogStore({}, { 'test': schemaObj, 'other.schema.json': schemaObj })

      expect(store.getSchema('test')).toBe(schemaObj)
      expect(store.getSchema('other')).toBe(schemaObj)
      expect(store.getSchema('other.schema.json')).toBe(schemaObj)
      expect(store.getAllSchemas().length).toBe(2)
      expect(store.getAllSchemas()[0]?.name).toBe('test')
    })

    it('supports cache invalidation listeners and store swapping', () => {
      let listenerCalls = 0
      const unregister = registerCacheResetListener(() => {
        listenerCalls++
      })

      clearCatalogCache()
      expect(listenerCalls).toBe(1)

      const originalStore = getDefaultCatalogStore()
      const dummyStore = new MemoryCatalogStore()

      try {
        setDefaultCatalogStore(dummyStore)
        expect(getDefaultCatalogStore()).toBe(dummyStore)
        expect(listenerCalls).toBe(2)
      }
      finally {
        setDefaultCatalogStore(originalStore)
        expect(getDefaultCatalogStore()).toBe(originalStore)
      }
      expect(listenerCalls).toBe(3)

      unregister()
      clearCatalogCache()
      expect(listenerCalls).toBe(3) // Unregistered listener not called
    })

    it('exports schemas via top-level getSchema and getAllSchemas', () => {
      const directivesSchema = getSchema('directives')
      expect(directivesSchema).toBeDefined()
      expect(directivesSchema.title).toContain('Directives')

      const allSchemas = getAllSchemas()
      expect(allSchemas.length).toBeGreaterThanOrEqual(10)
      expect(allSchemas.some(s => s.name === 'operators')).toBe(true)
    })
  })

  describe('specCatalog domain queries and predicates', () => {
    it('operates identically via singleton helper and direct instance', () => {
      const spec = getSpecCatalog()
      const manualSpec = new SpecCatalog()

      expect(spec.isDirective('b:if')).toBe(manualSpec.isDirective('b:if'))
      expect(spec.isOperator('+')).toBe(manualSpec.isOperator('+'))
      expect(spec.isWidget('Blog')).toBe(manualSpec.isWidget('Blog'))
    })

    describe('directives domain', () => {
      it('queries directive existence and wildcard data:*', () => {
        expect(isDirective('b:loop')).toBe(true)
        expect(isDirective('b:includable')).toBe(true)
        expect(isDirective('data:post.title')).toBe(true)
        expect(isDirective('unknown:tag')).toBe(false)

        const loopDef = getDirective('b:loop')
        expect(loopDef).toBeDefined()
        expect(loopDef?.category).toBe('Logic')

        const dataDef = getDirective('data:anything')
        expect(dataDef).toBeDefined()
        expect(dataDef?.description).toBeDefined()

        const allDirs = getAllDirectives()
        expect(Object.keys(allDirs).length).toBeGreaterThanOrEqual(20)
        expect(allDirs['b:widget']).toBeDefined()
      })

      it('correctly reports self-closing directives', () => {
        expect(isSelfClosingDirective('b:include')).toBe(true)
        expect(isSelfClosingDirective('b:eval')).toBe(true)
        expect(isSelfClosingDirective('b:section')).toBe(false)
        expect(isSelfClosingDirective('b:includable')).toBe(false)
        expect(isSelfClosingDirective('nonexistent')).toBe(false)
      })

      it('evaluates structural nesting constraints (canNest and validateNesting)', () => {
        expect(canNest('b:section', 'b:widget')).toBe(true)
        expect(canNest('b:section', 'b:section')).toBe(false)
        expect(canNest('b:widget', 'b:includable')).toBe(true)
        expect(canNest('b:includable', 'b:if')).toBe(true)

        expect(validateNesting('b:section', 'b:widget')).toBeNull()
        const violation = validateNesting('b:section', 'b:section')
        expect(violation?.code).toBe('BX1035')
        expect(violation?.action).toBe('reject')

        const loopAttrs = getDirectiveAttributes('b:loop')
        expect(loopAttrs).toBeDefined()
        expect(loopAttrs?.values).toBeDefined()
        expect(getDirectiveAttributes('nonexistent_tag')).toBeUndefined()

        expect(canBeAtRoot('b:section')).toBe(true)
        expect(canBeAtRoot('b:if')).toBe(true)
        expect(canBeAtRoot('b:widget')).toBe(false)
        expect(canBeAtRoot('b:includable')).toBe(false)
        expect(canBeAtRoot('b:case')).toBe(false)
        expect(canBeAtRoot('Variable')).toBe(false)
      })
    })

    describe('operators domain', () => {
      it('validates operators, grammar aliases and doc aliases', () => {
        expect(isOperator('+')).toBe(true)
        expect(isOperator('AND')).toBe(true)
        expect(isOperator('where')).toBe(true) // grammar alias of filter
        expect(isOperator('unknown_operator')).toBe(false)

        expect(isGrammarOperator('+')).toBe(true)
        expect(isGrammarOperator('where')).toBe(true)
        expect(isGrammarOperator('plus')).toBe(false)

        expect(isDocAlias('plus')).toBe(true)
        expect(isDocAlias('PLUS')).toBe(true)
        expect(isDocAlias('where')).toBe(false)

        const plusDef = getOperator('+')
        expect(plusDef).toBeDefined()
        expect(getOperator('plus')).toEqual(plusDef)
        expect(getOperator('WHERE')?.syntax.infix).toContain('filter')

        expect(getOperatorPrecedence('+')).toBe(4)
        expect(getOperatorPrecedence('plus')).toBeUndefined() // Precedence is strict to grammar operators
        expect(getOperatorPrecedence('eq')).toBe(5)

        const allOps = getAllOperators()
        expect(allOps['+']).toBeDefined()
        const grammarOps = getGrammarOperators()
        expect(grammarOps.where).toBeDefined()
      })
    })

    describe('diagnostics domain', () => {
      it('queries diagnostic codes and rules', () => {
        expect(isDiagnosticCode('BX1001')).toBe(true)
        expect(isDiagnosticCode('BX1003')).toBe(true)
        expect(isDiagnosticCode('BX1023')).toBe(true)
        expect(isDiagnosticCode('BX1031')).toBe(true)
        expect(isDiagnosticCode('BX9999')).toBe(false)

        const forRule = getDiagnostic('BX1001')
        expect(forRule).toBeDefined()
        expect(forRule?.name).toBe('PROHIBITED_FOR_TAG')
        expect(forRule?.severity).toBe('error')

        const setRule = getDiagnostic('BX1003')
        expect(setRule).toBeDefined()
        expect(setRule?.name).toBe('PROHIBITED_SET_TAG')

        const nonObjInclude = getDiagnostic('BX1031')
        expect(nonObjInclude).toBeDefined()
        expect(nonObjInclude?.name).toBe('NON_OBJECT_INCLUDE_DATA_PAYLOAD')

        const rule = getDiagnostic('BX1023')
        expect(rule).toBeDefined()
        expect(rule?.name).toBe('PROHIBITED_NESTING')

        const allDiags = getAllDiagnostics()
        expect(Object.keys(allDiags).length).toBeGreaterThanOrEqual(40)
        expect(allDiags.BX1035).toBeDefined()
      })
    })

    describe('widgets and settings domain', () => {
      it('queries widget metadata and settings', () => {
        expect(isWidget('Blog')).toBe(true)
        expect(isWidget('Header')).toBe(true)
        expect(isWidget('CustomWidget')).toBe(false)

        const blogWidget = getWidget('Blog')
        expect(blogWidget).toBeDefined()
        expect(blogWidget?.description).toBeDefined()
        expect(blogWidget?.data?.canonical).toBeDefined()

        const allWidgets = getAllWidgets()
        expect(Object.keys(allWidgets).length).toBe(26)

        const followersSettings = getWidgetSettings('Followers')
        expect(followersSettings).toBeDefined()
        expect(followersSettings?.canonical).toBeDefined()

        const allSettings = getAllWidgetSettings()
        expect(Object.keys(allSettings).length).toBe(26)
      })
    })

    describe('globals domain', () => {
      it('queries global objects with and without data: prefix', () => {
        expect(isGlobal('blog')).toBe(true)
        expect(isGlobal('data:blog')).toBe(true)
        expect(isGlobal('view')).toBe(true)
        expect(isGlobal('data:view')).toBe(true)
        expect(isGlobal('unregisteredGlobal')).toBe(false)

        const blogGlobal = getGlobal('blog')
        expect(blogGlobal).toBeDefined()
        expect(getGlobal('data:blog')).toEqual(blogGlobal)

        const allGlobals = getAllGlobals()
        expect(allGlobals['data:blog']).toBeDefined()
      })
    })

    describe('messages domain', () => {
      it('queries localized message keys', () => {
        expect(isMessage('archive')).toBe(true)
        expect(isMessage('home')).toBe(true)
        expect(isMessage('nonexistentMessageKey')).toBe(false)

        const archiveMsg = getMessage('archive')
        expect(archiveMsg).toBeDefined()
        expect(archiveMsg?.type).toBe('message')

        const allMessages = getAllMessages()
        expect(Object.keys(allMessages).length).toBeGreaterThanOrEqual(50)
      })
    })

    describe('scopes domain', () => {
      it('queries variable resolution scopes and formal precedence', () => {
        expect(isScope('global')).toBe(true)
        expect(isScope('widget')).toBe(true)
        expect(isScope('loop')).toBe(true)
        expect(isScope('nonexistentScope')).toBe(false)

        const loopScope = getScope('loop')
        expect(loopScope).toBeDefined()

        const prec = getScopePrecedence()
        expect(prec).toBeInstanceOf(Array)
        expect(prec).toContain('loop')
        expect(prec).toContain('global')

        const allScopes = getAllScopes()
        expect(allScopes.loop).toBeDefined()
      })
    })

    describe('types and coercion domain', () => {
      it('queries recognized Blogger types and coercion rules', () => {
        expect(isType('string')).toBe(true)
        expect(isType('image')).toBe(true)
        expect(isType('skin:color')).toBe(true)
        expect(isType('invalidType')).toBe(false)

        const imgType = getType('image')
        expect(imgType).toBeDefined()
        expect(imgType?.parent_type).toBe('string')

        const allTypes = getAllTypes()
        expect(allTypes.string).toBeDefined()
        expect(allTypes['skin:font']).toBeDefined()

        const coercion = getSpecCatalog().getCoercionRules()
        expect(coercion.string_concatenation).toBeDefined()
        expect(coercion.arithmetic_coercion).toBeDefined()
      })
    })

    describe('inclusions domain & DI consistency', () => {
      it('queries canonical inclusions with typed getters', () => {
        const headContent = getInclusion('all-head-content')
        expect(headContent).toBeDefined()
        expect(headContent?.category).toBe('universal')

        const allInc = getAllInclusions()
        expect(Object.keys(allInc).length).toBeGreaterThanOrEqual(10)
        expect(allInc['all-head-content']).toBeDefined()
      })

      it('respects injected custom SpecCatalog instance in query functions', () => {
        const customCatalog = getSpecCatalog()
        expect(getWidget('Blog', customCatalog)?.data?.canonical).toBeDefined()
        expect(getGlobal('blog', customCatalog)?.canonical).toBeDefined()
        expect(getType('image', customCatalog)?.parent_type).toBe('string')
        expect(getDirective('b:if', customCatalog)?.category).toBe('Logic')
        expect(getOperator('+', customCatalog)?.precedence_level).toBe(4)
        expect(getScope('loop', customCatalog)?.name).toBe('Loop Block Scope')
        expect(getMessage('archive', customCatalog)?.type).toBe('message')
        expect(getInclusion('all-head-content', customCatalog)?.category).toBe('universal')
        expect(getWidgetSettings('Followers', customCatalog)?.canonical).toBeDefined()
      })
    })

    describe('compiler limits, quotas, and canonical accessors (SSoT phase 3)', () => {
      it('retrieves compiler limits and directive nesting limit from canonical directives catalog', () => {
        const limits = getCompilerLimits()
        expect(limits).toBeDefined()
        expect(limits?.max_directive_nesting_depth).toBe(50)
        expect(getDirectiveNestingLimit()).toBe(50)

        const customSpec = new SpecCatalog()
        expect(customSpec.getCompilerLimits()?.max_directive_nesting_depth).toBe(50)
        expect(customSpec.getDirectiveNestingLimit()).toBe(50)
      })

      it('retrieves compiler quotas and expression limits from canonical operators catalog', () => {
        const quotas = getCompilerQuotas()
        expect(quotas).toBeDefined()
        expect(quotas?.max_expression_tokens).toBe(40)
        expect(quotas?.warning_expression_tokens).toBe(36)
        expect(getExpressionQuotaLimit()).toBe(40)
        expect(getExpressionQuotaWarning()).toBe(36)

        const customSpec = new SpecCatalog()
        expect(customSpec.getExpressionQuotaLimit()).toBe(40)
        expect(customSpec.getExpressionQuotaWarning()).toBe(36)
      })

      it('extracts lambda operator keywords and grammar aliases dynamically', () => {
        const lambdas = getLambdaKeywords()
        expect(lambdas.has('filter')).toBe(true)
        expect(lambdas.has('where')).toBe(true)
        expect(lambdas.has('map')).toBe(true)
        expect(lambdas.has('select')).toBe(true)
        expect(lambdas.has('first')).toBe(true)
        expect(lambdas.has('count')).toBe(true)
        expect(lambdas.has('any')).toBe(true)
        expect(lambdas.has('all')).toBe(true)
        expect(lambdas.has('none')).toBe(true)
        expect(lambdas.has('+')).toBe(false)
        expect(lambdas.has('and')).toBe(false)
      })

      it('detects hallucinated directives and maps them to canonical diagnostics', () => {
        const hallucinated = getHallucinatedDirectives()
        expect(hallucinated['b:for']).toBe('BX1001')
        expect(hallucinated['b:each']).toBe('BX1002')
        expect(hallucinated['b:set']).toBe('BX1003')
        expect(hallucinated['b:var']).toBe('BX1004')
        expect(hallucinated['b:let']).toBe('BX1005')
        expect(hallucinated['b:else-if']).toBe('BX1006')

        expect(isHallucinatedDirective('b:for')).toBe(true)
        expect(isHallucinatedDirective('b:FOR')).toBe(true)
        expect(isHallucinatedDirective('b:if')).toBe(false)

        expect(getHallucinatedDirectiveDiagnostic('b:for')).toBe('BX1001')
        expect(getHallucinatedDirectiveDiagnostic('b:ELSE-IF')).toBe('BX1006')
        expect(getHallucinatedDirectiveDiagnostic('b:if')).toBeUndefined()
      })

      it('reads super inclusion prefix from canonical inclusions catalog', () => {
        expect(getSuperPrefix()).toBe('super.')
        expect(isServerInclusion('super.main')).toBe(true)
        expect(isServerInclusion('super.customWidgetSection')).toBe(true)

        const customSpec = new SpecCatalog()
        expect(customSpec.getSuperPrefix()).toBe('super.')
        expect(customSpec.isServerInclusion('super.test')).toBe(true)
      })

      it('validates directive attribute inversions declaratively from catalog', () => {
        const includableRes = validateDirectiveAttributes('b:includable', ['name'])
        expect(includableRes.inverted).toEqual([
          { code: 'BX1015', attribute: 'name', expected: 'id' },
        ])
        expect(includableRes.unknown).not.toContain('name')

        const includeRes = validateDirectiveAttributes('b:include', ['id'])
        expect(includeRes.inverted).toEqual([
          { code: 'BX1016', attribute: 'id', expected: 'name' },
        ])
        expect(includeRes.unknown).not.toContain('id')

        const switchRes = validateDirectiveAttributes('b:switch', ['expr'])
        expect(switchRes.inverted).toEqual([
          { code: 'BX1014', attribute: 'expr', expected: 'var' },
        ])
        expect(switchRes.unknown).not.toContain('expr')

        const validSwitch = validateDirectiveAttributes('b:switch', ['var'])
        expect(validSwitch.inverted).toHaveLength(0)
        expect(validSwitch.unknown).toHaveLength(0)
      })
    })

    describe('dynamic mutation and SSoT propagation across all engine domains (Phase 5)', () => {
      function createClonedMasterCatalogs() {
        const raw = getAllCatalogs()
        return JSON.parse(JSON.stringify(raw)) as Record<string, any>
      }

      it('propagates directive nesting limit mutation to SpecCatalog without touching code', () => {
        const catalogs = createClonedMasterCatalogs()
        catalogs.directives.domain_metadata.compiler_limits.max_directive_nesting_depth = 25
        const customStore = new MemoryCatalogStore(catalogs)
        const customSpec = new SpecCatalog(customStore)

        expect(customSpec.getDirectiveNestingLimit()).toBe(25)
        expect(customSpec.getCompilerLimits()?.max_directive_nesting_depth).toBe(25)
      })

      it('propagates compiler quotas mutation to expression budget evaluation', () => {
        const catalogs = createClonedMasterCatalogs()
        catalogs.operators.domain_metadata.evaluation_contexts.compiler_quotas.max_expression_tokens = 10
        catalogs.operators.domain_metadata.evaluation_contexts.compiler_quotas.warning_expression_tokens = 8
        const customStore = new MemoryCatalogStore(catalogs)
        const customSpec = new SpecCatalog(customStore)

        expect(customSpec.getExpressionQuotaLimit()).toBe(10)
        expect(customSpec.getExpressionQuotaWarning()).toBe(8)

        // 1 + 2 + 3 + 4 + 5 + 6 has 11 tokens (> 10 limit)
        const budget = RootExports.evaluateExpressionBudget('1 + 2 + 3 + 4 + 5 + 6', customSpec)
        expect(budget.totalTokens).toBe(11)
        expect(budget.status).toBe('EXCEEDED')
        expect(budget.isValid).toBe(false)
        expect(budget.recommendation).toContain('limit is 10')
      })

      it('propagates custom truthiness matrix literals to isTruthy evaluation', () => {
        const catalogs = createClonedMasterCatalogs()
        catalogs.types.domain_metadata.truthiness_matrix.falsy_string_literals.push('custom_falsy')
        const customStore = new MemoryCatalogStore(catalogs)
        const customSpec = new SpecCatalog(customStore)

        expect(customSpec.isTruthy('custom_falsy')).toBe(false)
        expect(RootExports.isTruthy('custom_falsy', customSpec)).toBe(false)
        expect(RootExports.isTruthy('custom_falsy')).toBe(true)
      })

      it('propagates dynamic scalar types to isTypeAssignable', () => {
        const catalogs = createClonedMasterCatalogs()
        catalogs.types.domain_metadata.scalar_types.push('custom_scalar')
        catalogs.types.types.custom_scalar = {
          category: 'base',
          description: 'Synthetic custom scalar type',
          parent_type: null,
          user_constructible: false,
          ts_type: 'string',
        }
        const customStore = new MemoryCatalogStore(catalogs)
        const customSpec = new SpecCatalog(customStore)

        expect(RootExports.isTypeAssignable('custom_scalar', 'scalar', customSpec)).toBe(true)
        expect(RootExports.isTypeAssignable('custom_scalar', 'scalar')).toBe(false)
      })

      it('propagates dynamic hallucinated directives to template structure validator', () => {
        const catalogs = createClonedMasterCatalogs()
        catalogs.directives.domain_metadata.hallucinated_directives['b:synthetic-for'] = 'BX1001'
        const customStore = new MemoryCatalogStore(catalogs)
        const customSpec = new SpecCatalog(customStore)

        expect(customSpec.isHallucinatedDirective('b:synthetic-for')).toBe(true)
        expect(customSpec.getHallucinatedDirectiveDiagnostic('b:synthetic-for')).toBe('BX1001')

        const xml = `
          <b:section id='main'>
            <b:widget id='Blog1' type='Blog'>
              <b:includable id='main'>
                <b:synthetic-for each='item' in='data:items'/>
              </b:includable>
            </b:widget>
          </b:section>
        `
        const diags = RootExports.validateTemplateStructure(xml, customSpec)
        expect(diags.some(d => d.code === 'BX1001')).toBe(true)
      })

      it('uses the custom catalog while scanning XML structure', () => {
        const catalogs = createClonedMasterCatalogs()
        catalogs.directives.directives['b:synthetic'] = {
          description: 'Synthetic self-closing directive',
          closure_mode: 'self_closing',
          attributes: {},
        }
        const customSpec = new SpecCatalog(new MemoryCatalogStore(catalogs))
        const xml = '<b:synthetic><b:section id="main"/>'

        expect(RootExports.validateTemplateStructure(xml, customSpec)).toEqual([])
      })

      it('propagates dynamic attribute inversions to validateDirectiveAttributes', () => {
        const catalogs = createClonedMasterCatalogs()
        catalogs.directives.directives['b:section'].attribute_inversions = {
          custom_inverted: {
            expected: 'id',
            diagnostic: 'BX1035',
          },
        }
        const customStore = new MemoryCatalogStore(catalogs)
        const customSpec = new SpecCatalog(customStore)

        const res = customSpec.validateDirectiveAttributes('b:section', ['custom_inverted'])
        expect(res.inverted).toEqual([
          { code: 'BX1035', attribute: 'custom_inverted', expected: 'id' },
        ])
        expect(res.unknown).not.toContain('custom_inverted')
      })

      it('propagates dynamic super inclusion prefix to isServerInclusion and getSuperPrefix', () => {
        const catalogs = createClonedMasterCatalogs()
        catalogs.inclusions.domain_metadata.super_prefix_rule.prefix = 'synthetic_super.'
        const customStore = new MemoryCatalogStore(catalogs)
        const customSpec = new SpecCatalog(customStore)

        expect(customSpec.getSuperPrefix()).toBe('synthetic_super.')
        expect(customSpec.isServerInclusion('synthetic_super.header')).toBe(true)
        expect(customSpec.isServerInclusion('super.header')).toBe(false)
      })

      it('propagates standard_diagnostics mutation to template validator and nesting checks', () => {
        const catalogs = createClonedMasterCatalogs()
        catalogs.directives.domain_metadata.standard_diagnostics.missing_required_attribute = 'BX9991'
        catalogs.directives.domain_metadata.standard_diagnostics.prohibited_nesting = 'BX9992'
        const customStore = new MemoryCatalogStore(catalogs)
        const customSpec = new SpecCatalog(customStore)

        expect(customSpec.getStandardDiagnostic('missing_required_attribute')).toBe('BX9991')
        expect(customSpec.getStandardDiagnostic('prohibited_nesting')).toBe('BX9992')

        // Missing id on b:section should emit custom code BX9991
        const missingAttrXml = '<b:section></b:section>'
        const diags1 = RootExports.validateTemplateStructure(missingAttrXml, customSpec)
        expect(diags1.some(d => (d.code as string) === 'BX9991')).toBe(true)

        // Prohibited nesting without explicit policy should emit fallback prohibited_nesting code BX9992
        const violation = customSpec.validateDirectiveNesting('b:tag', 'b:section')
        expect((violation?.code as string)).toBe('BX9992')

        const prohibitedXml = '<b:tag name="div"><b:section id="test"/></b:tag>'
        const diags2 = RootExports.validateTemplateStructure(prohibitedXml, customSpec)
        expect(diags2.some(d => (d.code as string) === 'BX9992')).toBe(true)
      })

      it('propagates dynamic directive expression attributes to AST token conversion', () => {
        const catalogs = createClonedMasterCatalogs()
        catalogs.directives.directives['b:include'].attributes.custom_data = {
          type: 'expression',
          required: false,
          description: 'Custom expression attribute',
        }
        const customStore = new MemoryCatalogStore(catalogs)
        const customSpec = new SpecCatalog(customStore)

        expect(customSpec.isDirectiveExpressionAttribute('b:include', 'custom_data')).toBe(true)
        expect(getSpecCatalog().isDirectiveExpressionAttribute('b:include', 'custom_data')).toBe(false)

        const xml = '<b:include name="sub" custom_data="data:blog.title" />'
        const [token] = RootExports.scanDirectiveTokens(xml)
        const astCustom = RootExports.directiveTokenToAstNode(token!, customSpec)
        const astDefault = RootExports.directiveTokenToAstNode(token!)

        expect(astCustom.attributes.find(a => a.name === 'custom_data')?.isExpression).toBe(true)
        expect(astDefault.attributes.find(a => a.name === 'custom_data')?.isExpression).toBe(false)
      })

      it('propagates dynamic operator precedence and associativity to ExpressionParser', () => {
        const catalogs = createClonedMasterCatalogs()
        catalogs.operators.operators['+']!.precedence_level = 2
        catalogs.operators.operators['*']!.precedence_level = 3

        const customStore = new MemoryCatalogStore(catalogs)
        const customSpec = new SpecCatalog(customStore)

        const stdAst = RootExports.parseExpression('2 + 3 * 4') as any
        expect(stdAst.operator).toBe('+')
        expect(stdAst.right.operator).toBe('*')

        const customAst = RootExports.parseExpression('2 + 3 * 4', customSpec) as any
        expect(customAst.operator).toBe('*')
        expect(customAst.left.operator).toBe('+')
      })

      it('propagates dynamic allowed_contexts for loop-only operators', () => {
        const catalogs = createClonedMasterCatalogs()
        catalogs.operators.operators.rangeTo = {
          family: 'collection',
          description: 'Custom range',
          syntax: {
            supports_infix: true,
            supports_functional: false,
            functional_identifier: null,
            variadic: false,
            infix: 'start rangeTo end',
            functional: null,
          },
          precedence_level: 4,
          allowed_contexts: ['values'],
          operands: [
            { name: 'start', types: ['number'], required: true },
            { name: 'end', types: ['number'], required: true },
          ],
          return_type: 'array[number]',
        } as any

        const customStore = new MemoryCatalogStore(catalogs)
        const customSpec = new SpecCatalog(customStore)

        expect(RootExports.getCompatibleOperatorNames('number', false, customSpec)).not.toContain('rangeTo')
        expect(RootExports.getCompatibleOperatorNames('number', true, customSpec)).toContain('rangeTo')
      })

      it('propagates dynamic return_type_rule to resolveOperatorReturnType', () => {
        const catalogs = createClonedMasterCatalogs()
        catalogs.operators.operators.head = {
          family: 'collection',
          description: 'Extracts head element',
          syntax: {
            supports_infix: true,
            supports_functional: false,
            functional_identifier: null,
            variadic: false,
            infix: 'array head',
            functional: null,
          },
          precedence_level: 4,
          return_type_rule: 'element_type',
          operands: [{ name: 'array', types: ['array'], required: true }],
          return_type: 'unknown',
        } as any

        catalogs.operators.operators.sample = {
          family: 'collection',
          description: 'Samples subcollection',
          syntax: {
            supports_infix: true,
            supports_functional: false,
            functional_identifier: null,
            variadic: false,
            infix: 'array sample number',
            functional: null,
          },
          precedence_level: 4,
          return_type_rule: 'self_or_array',
          operands: [{ name: 'array', types: ['array'], required: true }],
          return_type: 'array',
        } as any

        const customStore = new MemoryCatalogStore(catalogs)
        const customSpec = new SpecCatalog(customStore)

        expect(RootExports.resolveOperatorReturnType('head', 'array[string]', undefined, customSpec)).toBe('string')
        expect(RootExports.resolveOperatorReturnType('sample', 'array[image]', undefined, customSpec)).toBe('array[image]')
      })

      it('propagates dynamic layout version explicit attributes, markers, and default version', () => {
        const catalogs = createClonedMasterCatalogs()
        catalogs.directives.domain_metadata.layout_versions.default_version = 1
        catalogs.directives.domain_metadata.layout_versions.explicit_attributes.push('custom-layout-attr')
        catalogs.directives.domain_metadata.layout_versions.versions['2'].structural_markers.push('b:widget custom-marker=')

        const customStore = new MemoryCatalogStore(catalogs)
        const customSpec = new SpecCatalog(customStore)

        // Custom default version fallback
        expect(RootExports.detectTemplateVersion('<html/>', customSpec).version).toBe(1)
        expect(RootExports.detectTemplateVersion('<html/>').version).toBe(3)

        // Custom explicit attribute
        const explicitXml = '<html custom-layout-attr="2"></html>'
        const resExplicit = RootExports.detectTemplateVersion(explicitXml, customSpec)
        expect(resExplicit.version).toBe(2)
        expect(resExplicit.confidence).toBe('explicit')
        expect(resExplicit.detectedFeatures).toContain('custom-layout-attr="2"')

        // Custom structural marker
        const markerXml = '<b:widget custom-marker="val"/>'
        const resMarker = RootExports.detectTemplateVersion(markerXml, customSpec)
        expect(resMarker.version).toBe(2)
        expect(resMarker.confidence).toBe('inferred')
        expect(resMarker.detectedFeatures).toContain('b:widget custom-marker=')
      })
    })

    describe('store reactivity, module constants, and canonical void elements (Phase 4)', () => {
      it('retrieves html void elements and cdata directives from canonical directives catalog', () => {
        const voidElements = getHtmlVoidElements()
        expect(voidElements).toBeInstanceOf(Set)
        expect(voidElements.has('br')).toBe(true)
        expect(voidElements.has('img')).toBe(true)
        expect(voidElements.has('input')).toBe(true)
        expect(voidElements.has('meta')).toBe(true)
        expect(voidElements.has('div')).toBe(false)

        const cdataDirs = getCdataDirectives()
        expect(cdataDirs).toContain('Variable')
        expect(cdataDirs).toContain('Group')
      })

      it('reactively updates exported module constants and catalog objects when default store is swapped', () => {
        const originalStore = getDefaultCatalogStore()
        const catalogs = JSON.parse(JSON.stringify(getAllCatalogs()))

        catalogs.operators.domain_metadata.evaluation_contexts.compiler_quotas.max_expression_tokens = 99
        catalogs.directives.domain_metadata.compiler_limits.max_directive_nesting_depth = 88
        catalogs.directives.domain_metadata.html_void_elements.push('custom-void')
        catalogs.directives.directives['b:custom-self'] = {
          category: 'Logic',
          description: 'Custom self closing directive',
          closure_mode: 'self_closing',
          self_closing: true,
          grammar: {
            self_closing: true,
          },
          attributes: {},
        }

        const customStore = new MemoryCatalogStore(catalogs)

        try {
          setDefaultCatalogStore(customStore)

          // Module-level quota and limit constants update dynamically
          expect(RootExports.COMPILER_QUOTA_LIMIT).toBe(99)
          expect(RootExports.COMPILER_NESTING_LIMIT).toBe(88)

          // Module-level sets update dynamically
          expect(RootExports.HTML_VOID_ELEMENTS.has('custom-void')).toBe(true)
          expect(RootExports.BLOGGER_STRICTLY_SELF_CLOSING_TAGS.has('b:custom-self')).toBe(true)

          // Top-level exported catalog instances update dynamically
          expect(RootExports.operators.domain_metadata?.evaluation_contexts?.compiler_quotas?.max_expression_tokens).toBe(99)
          expect(RootExports.directives.domain_metadata?.compiler_limits?.max_directive_nesting_depth).toBe(88)
          expect(RootExports.directives.directives['b:custom-self']).toBeDefined()
        }
        finally {
          setDefaultCatalogStore(originalStore)
        }

        // Restored to defaults
        expect(RootExports.COMPILER_QUOTA_LIMIT).toBe(40)
        expect(RootExports.COMPILER_NESTING_LIMIT).toBe(50)
        expect(RootExports.HTML_VOID_ELEMENTS.has('custom-void')).toBe(false)
        expect(RootExports.BLOGGER_STRICTLY_SELF_CLOSING_TAGS.has('b:custom-self')).toBe(false)
        expect(RootExports.operators.domain_metadata?.evaluation_contexts?.compiler_quotas?.max_expression_tokens).toBe(40)
        expect(RootExports.directives.domain_metadata?.compiler_limits?.max_directive_nesting_depth).toBe(50)
        expect(RootExports.directives.directives['b:custom-self']).toBeUndefined()
      })
    })
  })

  describe('rootExports parity', () => {
    it('mirrors core store and spec queries faithfully on package root', () => {
      expect(RootExports.getSpecCatalog).toBe(getSpecCatalog)
      expect(RootExports.getCatalog).toBe(getCatalog)
      expect(RootExports.getDirectives).toBe(getDirectives)
      expect(RootExports.getOperators).toBe(getOperators)
      expect(RootExports.getTypes).toBe(getTypes)
      expect(RootExports.getWidgets).toBe(getWidgets)
      expect(RootExports.getGlobals).toBe(getGlobals)
      expect(RootExports.getMessages).toBe(getMessages)
      expect(RootExports.getScopes).toBe(getScopes)
      expect(RootExports.getDiagnostics).toBe(getDiagnostics)
      expect(RootExports.getInclusions).toBe(getInclusions)
      expect(RootExports.getCompilerLimits).toBe(getCompilerLimits)
      expect(RootExports.getDirectiveNestingLimit).toBe(getDirectiveNestingLimit)
      expect(RootExports.getCompilerQuotas).toBe(getCompilerQuotas)
      expect(RootExports.getExpressionQuotaLimit).toBe(getExpressionQuotaLimit)
      expect(RootExports.getExpressionQuotaWarning).toBe(getExpressionQuotaWarning)
      expect(RootExports.getLambdaKeywords).toBe(getLambdaKeywords)
      expect(RootExports.getHallucinatedDirectives).toBe(getHallucinatedDirectives)
      expect(RootExports.isHallucinatedDirective).toBe(isHallucinatedDirective)
      expect(RootExports.getHallucinatedDirectiveDiagnostic).toBe(getHallucinatedDirectiveDiagnostic)
      expect(RootExports.getSuperPrefix).toBe(getSuperPrefix)
      expect(RootExports.validateDirectiveAttributes).toBe(validateDirectiveAttributes)
      expect(RootExports.getScalarTypes).toBe(getScalarTypes)
      expect(RootExports.getFalsyStringLiterals).toBe(getFalsyStringLiterals)
      expect(RootExports.getTruthyStringLiterals).toBe(getTruthyStringLiterals)
      expect(RootExports.getStandardDiagnostics).toBe(getStandardDiagnostics)
      expect(RootExports.getStandardDiagnostic).toBe(getStandardDiagnostic)
      expect(RootExports.isDirectiveExpressionAttribute).toBe(isDirectiveExpressionAttribute)
      expect(RootExports.getPrecedenceHierarchy).toBe(getPrecedenceHierarchy)
      expect(RootExports.getLevelBindingPower).toBe(getLevelBindingPower)
      expect(RootExports.getOperatorBindingPower).toBe(getOperatorBindingPower)
      expect(RootExports.isLogicalOperator).toBe(isLogicalOperator)
      expect(RootExports.isRightAssociativeOperator).toBe(isRightAssociativeOperator)
      expect(RootExports.getHtmlVoidElements).toBe(getHtmlVoidElements)
      expect(RootExports.getCdataDirectives).toBe(getCdataDirectives)
    })
  })

  describe('schema-driven types and declaration generation (Phase 2)', () => {
    it('generates canonical domain and schema types from catalogs and JSON schemas', () => {
      const generatedContent = generateDomainTypes()
      expect(generatedContent).toContain('export type BloggerDirectiveName =')
      expect(generatedContent).toContain('export type BloggerWidgetType =')
      expect(generatedContent).toContain('export type BloggerDiagnosticCode =')
      expect(generatedContent).toContain('export type BloggerOperatorName =')
      expect(generatedContent).toContain('export type BloggerMessageKey =')
      expect(generatedContent).toContain('export type BloggerEvidenceLevel =')
      expect(generatedContent).toContain('export type BloggerDiagnosticCategory =')
      expect(generatedContent).toContain('export type BloggerDiagnosticSeverity =')
      expect(generatedContent).toContain('export type DirectiveNestingAction =')
      expect(generatedContent).toContain('export type BloggerInclusionCategory =')
      expect(generatedContent).toContain('export type BloggerStandardDiagnosticKey =')
      expect(generatedContent).toContain('export interface BloggerOperatorsCatalog')
      expect(generatedContent).toContain('export interface BloggerDirectivesCatalog')
      expect(generatedContent).toContain('export interface BloggerCDATADirectiveAttributes')
      expect(generatedContent).toContain('export interface BloggerBlogGlobal')
      expect(generatedContent).toContain('export interface BloggerBlogWidgetData')
    })

    it('generates clean, non-duplicate type definitions in dist/index.d.ts', () => {
      const dtsContent = generateDts()
      // Should re-export from modular declaration files
      expect(dtsContent).toContain('export * from \'./types.js\';')
      expect(dtsContent).toContain('export * from \'./ast.js\';')
      expect(dtsContent).toContain('export * from \'./catalogs/index.js\';')
      // Should not contain duplicate inline declarations of domain union types or manual models
      expect(dtsContent).not.toContain('export type BloggerDirectiveName =')
      expect(dtsContent).not.toContain('export type BloggerDiagnosticCode =')
      expect(dtsContent).not.toContain('export type BloggerOperatorName =')
      expect(dtsContent).not.toContain('export type BloggerMessageKey =')
      expect(dtsContent).not.toContain('export type BloggerWidgetType =')
      expect(dtsContent).not.toContain('export interface BloggerCDATADirectiveAttributes')
      expect(dtsContent).not.toContain('export interface BloggerBlogGlobal')
    })
  })
})
