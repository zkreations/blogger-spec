import { describe, expect, it } from 'vitest'
import {
  canNest,
  clearCatalogCache,
  getAllCatalogs,
  getAllDiagnostics,
  getAllDirectives,
  getAllGlobals,
  getAllMessages,
  getAllOperators,
  getAllSchemas,
  getAllScopes,
  getAllServerInclusions,
  getAllTypes,
  getAllWidgets,
  getAllWidgetSettings,
  getDefaultCatalogStore,
  getDiagnostic,
  getDirective,
  getGlobal,
  getGrammarOperators,
  getMessage,
  getOperator,
  getOperatorPrecedence,
  getSchema,
  getScope,
  getScopePrecedence,
  getServerInclusion,
  getSpecCatalog,
  getType,
  getWidget,
  getWidgetSettings,
  isDiagnosticCode,
  isDirective,
  isDocAlias,
  isGlobal,
  isGrammarOperator,
  isMessage,
  isOperator,
  isScope,
  isSelfClosingDirective,
  isServerInclusion,
  isType,
  isUniversalInclusion,
  isWidget,
  MemoryCatalogStore,
  registerCacheResetListener,
  setDefaultCatalogStore,
  SpecCatalog,
} from '../src/catalogs/index.js'
import * as RootExports from '../src/index.js'

describe('catalogs and store formal verification suite', () => {
  describe('memoryCatalogStore & store life-cycle', () => {
    it('retrieves all 10 canonical catalogs with pure in-memory access', () => {
      const all = getAllCatalogs()
      expect(all.directives).toBeDefined()
      expect(all.operators).toBeDefined()
      expect(all.types).toBeDefined()
      expect(all.widgets).toBeDefined()
      expect(all.settings).toBeDefined()
      expect(all.globals).toBeDefined()
      expect(all.messages).toBeDefined()
      expect(all.scopes).toBeDefined()
      expect(all.diagnostics).toBeDefined()
      expect(all.inclusions).toBeDefined()
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

      setDefaultCatalogStore(dummyStore)
      expect(getDefaultCatalogStore()).toBe(dummyStore)
      expect(listenerCalls).toBe(2)

      // Restore original
      setDefaultCatalogStore(originalStore)
      expect(getDefaultCatalogStore()).toBe(originalStore)
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

      it('evaluates structural nesting constraints (canNest)', () => {
        expect(canNest('b:section', 'b:widget')).toBe(true)
        expect(canNest('b:section', 'b:section')).toBe(false)
        expect(canNest('b:widget', 'b:includable')).toBe(true)
        expect(canNest('b:includable', 'b:if')).toBe(true)
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

        expect(getOperatorPrecedence('+')).toBe(3)
        expect(getOperatorPrecedence('plus')).toBeUndefined() // Precedence is strict to grammar operators
        expect(getOperatorPrecedence('eq')).toBe(4)

        const allOps = getAllOperators()
        expect(allOps['+']).toBeDefined()
        const grammarOps = getGrammarOperators()
        expect(grammarOps.where).toBeDefined()
      })
    })

    describe('diagnostics domain', () => {
      it('queries diagnostic codes and rules', () => {
        expect(isDiagnosticCode('BX1001')).toBe(true)
        expect(isDiagnosticCode('BX1023')).toBe(true)
        expect(isDiagnosticCode('BX9999')).toBe(false)

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
        expect(blogWidget.description).toBeDefined()
        expect(blogWidget.canonical).toBeDefined()

        const allWidgets = getAllWidgets()
        expect(Object.keys(allWidgets).length).toBe(26)

        const followersSettings = getWidgetSettings('Followers')
        expect(followersSettings).toBeDefined()
        expect(followersSettings.canonical).toBeDefined()

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
        expect(archiveMsg.type).toBe('message')

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
        expect(imgType.parent_type).toBe('string')

        const allTypes = getAllTypes()
        expect(allTypes.string).toBeDefined()
        expect(allTypes['skin:font']).toBeDefined()

        const coercion = getSpecCatalog().getCoercionRules()
        expect(coercion.string_concatenation).toBeDefined()
        expect(coercion.arithmetic_coercion).toBeDefined()
      })
    })

    describe('inclusions domain', () => {
      it('queries server and universal inclusions', () => {
        expect(isServerInclusion('super.main')).toBe(true)
        expect(isServerInclusion('all-head-content')).toBe(true)
        expect(isServerInclusion('unknown_inc')).toBe(false)

        const inc = getServerInclusion('all-head-content')
        expect(inc).toBeDefined()
        expect(inc?.category).toBe('universal')

        expect(isUniversalInclusion('all-head-content')).toBe(true)
        expect(isUniversalInclusion('super.main')).toBe(false)

        const allInclusions = getAllServerInclusions()
        expect(allInclusions['all-head-content']).toBeDefined()
      })
    })
  })

  describe('rootExports parity', () => {
    it('mirrors core store and spec queries faithfully on package root', () => {
      expect(RootExports.getSpecCatalog).toBeDefined()
      expect(RootExports.getCatalog).toBeDefined()
      expect(RootExports.getDirectives).toBeDefined()
      expect(RootExports.getOperators).toBeDefined()
      expect(RootExports.getTypes).toBeDefined()
      expect(RootExports.getWidgets).toBeDefined()
      expect(RootExports.getSettings).toBeDefined()
      expect(RootExports.getGlobals).toBeDefined()
      expect(RootExports.getMessages).toBeDefined()
      expect(RootExports.getScopes).toBeDefined()
      expect(RootExports.getDiagnostics).toBeDefined()
      expect(RootExports.getInclusions).toBeDefined()
    })
  })
})
