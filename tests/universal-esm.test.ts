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
    expect(RootExports.directives).toBeDefined()
    expect(RootExports.directives.directives).toBeDefined()
    expect(Object.keys(RootExports.directives.directives).length).toBeGreaterThan(10)

    expect(RootExports.operators).toBeDefined()
    expect(RootExports.operators.operators).toBeDefined()
    expect(Object.keys(RootExports.operators.operators).length).toBeGreaterThan(10)

    expect(RootExports.types).toBeDefined()
    expect(RootExports.widgets).toBeDefined()
    expect(RootExports.globals).toBeDefined()
    expect(RootExports.messages).toBeDefined()
    expect(RootExports.scopes).toBeDefined()
    expect(RootExports.diagnostics).toBeDefined()
  })

  it('serves all catalogs and schemas through standard helpers', () => {
    const all = getAllCatalogs()
    expect(Object.keys(all)).toEqual([
      'directives',
      'operators',
      'types',
      'widgets',
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
    expect(schemas.length).toBe(11)
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
})
