import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
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
import * as ContextExports from '../src/context/index.js'
import * as RootExports from '../src/index.js'
import * as IrExports from '../src/ir/index.js'
import { FsCatalogStore, getWorkspacePaths, loadFixturesManifest } from '../src/node.js'

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
    expect(RootExports.catalogs.locales).toBeDefined()
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
      'locales',
    ])

    const directives = getDirectives()
    expect(directives.directives['b:includable']).toBeDefined()

    const operators = getOperators()
    expect(operators.operators['+']).toBeDefined()

    const schemas = getAllSchemas()
    expect(schemas.length).toBe(16)
    expect(schemas.some(s => s.name === 'directives')).toBe(true)
    expect(schemas.some(s => s.name === 'locales')).toBe(true)
    expect(schemas.some(s => s.name === 'mock-context')).toBe(true)
    expect(schemas.some(s => s.name === 'blog-configuration')).toBe(true)
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

  it('guarantees zero node:* imports across universal ESM entrypoints (., ./ir, ./context, ./runner)', () => {
    const srcRoot = getWorkspacePaths().src
    const universalEntries = [
      resolve(srcRoot, 'index.ts'),
      resolve(srcRoot, 'ir/index.ts'),
      resolve(srcRoot, 'context/index.ts'),
      resolve(srcRoot, 'runner.ts'),
    ]

    const visited = new Set<string>()
    const nodeImports: Array<{ file: string, specifier: string }> = []
    const importRegex = /\bfrom\s+['"]([^'"]+)['"]|\bimport\s+['"]([^'"]+)['"]/g

    function walk(filePath: string) {
      if (visited.has(filePath) || !existsSync(filePath)) {
        return
      }
      visited.add(filePath)
      const source = readFileSync(filePath, 'utf-8')
      for (const match of source.matchAll(importRegex)) {
        const spec = (match[1] ?? match[2])!
        if (spec.startsWith('node:')) {
          nodeImports.push({ file: filePath, specifier: spec })
          continue
        }
        if (spec.startsWith('.')) {
          const tsTarget = resolve(dirname(filePath), spec.replace(/\.js$/, '.ts'))
          walk(tsTarget)
        }
      }
    }

    for (const entry of universalEntries) {
      walk(entry)
    }

    expect(visited.size).toBeGreaterThan(20)
    expect(nodeImports).toEqual([])
  })

  it('exposes createStaticFeedFetch on context entrypoint and loadFixturesManifest on node entrypoint', async () => {
    expect(IrExports.compileToIR).toBeDefined()
    expect(ContextExports.createStaticFeedFetch).toBeDefined()

    const fetchFn = ContextExports.createStaticFeedFetch({
      posts: { feed: { entry: [{ id: { $t: 'p1' } }] } },
      pages: { feed: { entry: [] } },
      comments: { feed: { entry: [] } },
    })

    const postsRes = await fetchFn('https://example.blogspot.com/feeds/posts/default?alt=json')
    expect(postsRes.status).toBe(200)
    const postsJson = await postsRes.json() as any
    expect(postsJson.feed.entry).toHaveLength(1)

    const notFoundRes = await fetchFn('https://example.blogspot.com/unknown')
    expect(notFoundRes.status).toBe(404)

    const manifest = loadFixturesManifest()
    expect(manifest.fixtures.length).toBeGreaterThanOrEqual(250)
  })
})
