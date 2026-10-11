import type {
  BloggerCatalogMap,
  BloggerCatalogName,
  BloggerDiagnosticsCatalog,
  BloggerDirectivesCatalog,
  BloggerGlobalsCatalog,
  BloggerMessagesCatalog,
  BloggerOperatorsCatalog,
  BloggerScopesCatalog,
  BloggerSettingsCatalog,
  BloggerTypesCatalog,
  BloggerWidgetsCatalog,
} from '../types.js'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getWorkspacePaths } from '../paths.js'

export interface CatalogStore {
  getCatalog: <K extends BloggerCatalogName>(name: K) => BloggerCatalogMap[K]
  getSchema: (name: string) => any
  getAllSchemas: () => Array<{ name: string, schema: any }>
  clearCache?: () => void
}

export class FsCatalogStore implements CatalogStore {
  private readonly catalogCache = new Map<string, any>()
  private readonly schemaCache = new Map<string, any>()
  private readonly rootGetter: () => string

  constructor(rootGetter: () => string = () => getCatalogsDirectory()) {
    this.rootGetter = rootGetter
  }

  getCatalog<K extends BloggerCatalogName>(name: K): BloggerCatalogMap[K] {
    if (this.catalogCache.has(name)) {
      return this.catalogCache.get(name)
    }
    const filePath = join(this.rootGetter(), `${name}.json`)
    const content = JSON.parse(readFileSync(filePath, 'utf-8'))
    this.catalogCache.set(name, content)
    return content
  }

  getSchema(name: string): any {
    const schemaFile = name.endsWith('.schema.json') ? name : `${name}.schema.json`
    if (this.schemaCache.has(schemaFile)) {
      return this.schemaCache.get(schemaFile)
    }
    const schemasDir = join(this.rootGetter(), 'schemas')
    const filePath = join(schemasDir, schemaFile)
    const content = JSON.parse(readFileSync(filePath, 'utf-8'))
    this.schemaCache.set(schemaFile, content)
    return content
  }

  getAllSchemas(): Array<{ name: string, schema: any }> {
    const schemasDir = join(this.rootGetter(), 'schemas')
    if (!existsSync(schemasDir)) {
      return []
    }
    const files = readdirSync(schemasDir).filter(f => f.endsWith('.schema.json'))
    return files.map(file => ({
      name: file.replace(/\.schema\.json$/, ''),
      schema: this.getSchema(file),
    }))
  }

  clearCache(): void {
    this.catalogCache.clear()
    this.schemaCache.clear()
  }
}

export class MemoryCatalogStore implements CatalogStore {
  private readonly catalogs: Partial<BloggerCatalogMap>
  private readonly schemas: Record<string, any>

  constructor(catalogs: Partial<BloggerCatalogMap> = {}, schemas: Record<string, any> = {}) {
    this.catalogs = catalogs
    this.schemas = schemas
  }

  getCatalog<K extends BloggerCatalogName>(name: K): BloggerCatalogMap[K] {
    const cat = this.catalogs[name]
    if (!cat) {
      throw new Error(`Catalog not found in memory store: ${name}`)
    }
    return cat as BloggerCatalogMap[K]
  }

  getSchema(name: string): any {
    const cleanName = name.replace(/\.schema\.json$/, '')
    const schema = this.schemas[cleanName] || this.schemas[name]
    if (!schema) {
      throw new Error(`Schema not found in memory store: ${name}`)
    }
    return schema
  }

  getAllSchemas(): Array<{ name: string, schema: any }> {
    return Object.entries(this.schemas).map(([name, schema]) => ({
      name: name.replace(/\.schema\.json$/, ''),
      schema,
    }))
  }

  clearCache(): void {}
}

export function getCatalogsDirectory(): string {
  return getWorkspacePaths().catalogs
}

export function getSchemasDirectory(): string {
  return getWorkspacePaths().schemas
}

let defaultStore: CatalogStore = new FsCatalogStore()
const cacheResetListeners: Array<() => void> = []

export function registerCacheResetListener(listener: () => void): () => void {
  cacheResetListeners.push(listener)
  return () => {
    const index = cacheResetListeners.indexOf(listener)
    if (index !== -1) {
      cacheResetListeners.splice(index, 1)
    }
  }
}

export function setDefaultCatalogStore(store: CatalogStore): void {
  defaultStore = store
  clearCatalogCache()
}

export function getDefaultCatalogStore(): CatalogStore {
  return defaultStore
}

export function getCatalog<K extends BloggerCatalogName>(name: K): BloggerCatalogMap[K] {
  return defaultStore.getCatalog(name)
}

export function getDirectives(): BloggerDirectivesCatalog {
  return getCatalog('directives')
}

export function getOperators(): BloggerOperatorsCatalog {
  return getCatalog('operators')
}

export function getDiagnostics(): BloggerDiagnosticsCatalog {
  return getCatalog('diagnostics')
}

export function getTypes(): BloggerTypesCatalog {
  return getCatalog('types')
}

export function getGlobals(): BloggerGlobalsCatalog {
  return getCatalog('globals')
}

export function getWidgets(): BloggerWidgetsCatalog {
  return getCatalog('widgets')
}

export function getSettings(): BloggerSettingsCatalog {
  return getCatalog('settings')
}

export function getMessages(): BloggerMessagesCatalog {
  return getCatalog('messages')
}

export function getScopes(): BloggerScopesCatalog {
  return getCatalog('scopes')
}

export function getAllCatalogs(): BloggerCatalogMap {
  return {
    directives: getDirectives(),
    operators: getOperators(),
    types: getTypes(),
    widgets: getWidgets(),
    settings: getSettings(),
    globals: getGlobals(),
    messages: getMessages(),
    scopes: getScopes(),
    diagnostics: getDiagnostics(),
  }
}

export function getSchema(name: string): any {
  return defaultStore.getSchema(name)
}

export function getAllSchemas(): Array<{ name: string, schema: any }> {
  return defaultStore.getAllSchemas()
}

export function clearCatalogCache(): void {
  defaultStore.clearCache?.()
  for (const listener of cacheResetListeners) {
    listener()
  }
}
