import { describe, expect, it } from 'vitest'
import { FsCatalogStore } from '../src/catalogs/fs-store.js'
import {
  clearCatalogCache,
  getAllCatalogs,
  getAllSchemas,
  getCatalog,
  getDefaultCatalogStore,
  getDirectives,
  getOperators,
  MemoryCatalogStore,
  setDefaultCatalogStore,
} from '../src/catalogs/index.js'
import * as RootExports from '../src/index.js'

describe('universal ESM & in-memory store suite', () => {
  it('instantiates MemoryCatalogStore with embedded catalogs by default', () => {
    const store = getDefaultCatalogStore()
    expect(store).toBeInstanceOf(MemoryCatalogStore)
  })

  it('provides prehydrated root catalog exports without node:fs calls', () => {
    expect(RootExports.catalogs.directives).toBeDefined()
    expect(RootExports.catalogs.directives.directives).toBeDefined()
    expect(Object.keys(RootExports.catalogs.directives.directives).length).toBeGreaterThan(10)

    expect(RootExports.catalogs.operators).toBeDefined()
    expect(RootExports.catalogs.operators.operators).toBeDefined()
    expect(Object.keys(RootExports.catalogs.operators.operators).length).toBeGreaterThan(10)

    expect(RootExports.catalogs.types).toBeDefined()
    expect(RootExports.catalogs.widgets).toBeDefined()
    expect(RootExports.catalogs.settings).toBeDefined()
    expect(RootExports.catalogs.globals).toBeDefined()
    expect(RootExports.catalogs.messages).toBeDefined()
    expect(RootExports.catalogs.scopes).toBeDefined()
    expect(RootExports.catalogs.diagnostics).toBeDefined()
    expect(RootExports.catalogs.inclusions).toBeDefined()
  })

  it('serves all catalogs and schemas through standard helpers', () => {
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

    const directives = getDirectives()
    expect(directives.directives['b:includable']).toBeDefined()

    const operators = getOperators()
    expect(operators.operators['+']).toBeDefined()

    const schemas = getAllSchemas()
    expect(schemas.length).toBe(12)
    expect(schemas.some(s => s.name === 'directives')).toBe(true)
  })

  it('allows switching to FsCatalogStore in Node environments when needed', () => {
    const defaultStoreBefore = getDefaultCatalogStore()
    const fsStore = new FsCatalogStore()

    try {
      setDefaultCatalogStore(fsStore)
      expect(getDefaultCatalogStore()).toBe(fsStore)

      const directives = getCatalog('directives')
      expect(directives.directives['b:if']).toBeDefined()

      const schemas = fsStore.getAllSchemas()
      expect(schemas.length).toBeGreaterThanOrEqual(10)
      expect(fsStore.getSchema('directives')).toBeDefined()

      fsStore.clearCache()
    }
    finally {
      setDefaultCatalogStore(defaultStoreBefore)
      expect(getDefaultCatalogStore()).toBe(defaultStoreBefore)
      clearCatalogCache()
    }
  })

  it('exports individual granular embedded catalogs for modular imports', () => {
    expect(RootExports.embeddedDirectivesCatalog).toBeDefined()
    expect(RootExports.embeddedDiagnosticsCatalog).toBeDefined()
    expect(RootExports.embeddedGlobalsCatalog).toBeDefined()
    expect(RootExports.embeddedInclusionsCatalog).toBeDefined()
    expect(RootExports.embeddedMessagesCatalog).toBeDefined()
    expect(RootExports.embeddedOperatorsCatalog).toBeDefined()
    expect(RootExports.embeddedScopesCatalog).toBeDefined()
    expect(RootExports.embeddedSettingsCatalog).toBeDefined()
    expect(RootExports.embeddedTypesCatalog).toBeDefined()
    expect(RootExports.embeddedWidgetsCatalog).toBeDefined()

    expect(RootExports.embeddedDirectivesCatalog).toBe(RootExports.embeddedCatalogs.directives)
    expect(RootExports.embeddedDiagnosticsCatalog).toBe(RootExports.embeddedCatalogs.diagnostics)
    expect(RootExports.embeddedWidgetsCatalog).toBe(RootExports.embeddedCatalogs.widgets)
    expect(RootExports.embeddedSettingsCatalog).toBe(RootExports.embeddedCatalogs.settings)
  })
})
