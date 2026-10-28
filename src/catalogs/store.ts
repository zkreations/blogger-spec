import type {
  BloggerCatalogMap,
  BloggerCatalogName,
  BloggerDiagnosticsCatalog,
  BloggerDirectivesCatalog,
  BloggerGlobalsCatalog,
  BloggerInclusionsCatalog,
  BloggerLocalesCatalog,
  BloggerMessagesCatalog,
  BloggerOperatorsCatalog,
  BloggerScopesCatalog,
  BloggerSettingsCatalog,
  BloggerTypesCatalog,
  BloggerWidgetsCatalog,
} from '../types.js'
import { embeddedCatalogs, embeddedSchemas } from '../generated/embedded.generated.js'
import { CATALOG_NAMES } from './constants.js'

export { embeddedContexts } from '../generated/embedded.generated.js'
export { CATALOG_NAMES } from './constants.js'

export interface CatalogStore {
  getCatalog: <K extends BloggerCatalogName>(name: K) => BloggerCatalogMap[K]
  getSchema: (name: string) => any
  getAllSchemas: () => Array<{ name: string, schema: any }>
  clearCache?: () => void
}

export class MemoryCatalogStore implements CatalogStore {
  private readonly rawCatalogs: Partial<BloggerCatalogMap>
  private readonly schemas: Record<string, any>

  constructor(catalogs: Partial<BloggerCatalogMap> = {}, schemas: Record<string, any> = {}) {
    this.rawCatalogs = catalogs
    this.schemas = schemas
  }

  getCatalog<K extends BloggerCatalogName>(name: K): BloggerCatalogMap[K] {
    const cat = this.rawCatalogs[name]
    if (!cat) {
      throw new Error(`Catalog not found in memory store: ${name}`)
    }
    return cat as BloggerCatalogMap[K]
  }

  getSchema(name: string): any {
    const cleanName = name.replace(/\.schema\.json$/, '')
    const schema = this.schemas[cleanName]
      || this.schemas[`${cleanName}.schema.json`]
      || this.schemas[name]
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

let defaultStore: CatalogStore = new MemoryCatalogStore(embeddedCatalogs, embeddedSchemas)
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

export function getInclusions(): BloggerInclusionsCatalog {
  return getCatalog('inclusions')
}

export function getLocales(): BloggerLocalesCatalog {
  return getCatalog('locales')
}

export function getAllCatalogs(): BloggerCatalogMap {
  return Object.fromEntries(CATALOG_NAMES.map(name => [name, getCatalog(name)])) as unknown as BloggerCatalogMap
}

export function getSchema(name: string): any {
  return defaultStore.getSchema(name)
}

export function getAllSchemas(): Array<{ name: string, schema: any }> {
  return defaultStore.getAllSchemas()
}

export function clearCatalogCache(): void {
  defaultStore.clearCache?.()
  const listeners = [...cacheResetListeners]
  for (const listener of listeners) {
    listener()
  }
}
