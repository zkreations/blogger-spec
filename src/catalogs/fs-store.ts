import type {
  BloggerCatalogMap,
  BloggerCatalogName,
} from '../types.js'
import type { CatalogStore } from './store.js'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getWorkspacePaths } from '../paths.js'

export function getCatalogsDirectory(): string {
  return getWorkspacePaths().catalogs
}

export function getSchemasDirectory(): string {
  return getWorkspacePaths().schemas
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

