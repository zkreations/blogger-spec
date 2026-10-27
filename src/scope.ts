import type { SpecCatalog } from './catalogs/index.js'
import type { BloggerDirectiveToken } from './types.js'
import { getSpecCatalog } from './catalogs/index.js'
import { resolveDataPath } from './data-path.js'

export type BloggerScopeType = 'global' | 'includable' | 'lambda' | 'loop' | 'section' | 'widget' | 'with'

export interface BloggerScopeSymbol {
  readonly name: string
  readonly type?: string
  readonly scopeType: BloggerScopeType
  readonly requiresDataPrefix?: boolean
  readonly metadata?: Record<string, unknown>
}

export interface BloggerPushScopeOptions {
  id?: string
  widgetType?: string
  symbols?: Record<string, string | Partial<BloggerScopeSymbol>>
}

export interface BloggerScopeFrame {
  readonly id?: string
  readonly type: BloggerScopeType
  readonly widgetType?: string
  readonly symbols: Map<string, BloggerScopeSymbol>
}

export class ScopeEnvironment {
  private frames: BloggerScopeFrame[] = []
  private catalog: SpecCatalog

  constructor(catalog: SpecCatalog = getSpecCatalog(), options?: { initialWidgetType?: string }) {
    this.catalog = catalog

    const globalSymbols = new Map<string, BloggerScopeSymbol>()
    for (const globalName of Object.keys(catalog.getAllGlobals())) {
      const stripped = globalName.startsWith('data:') ? globalName.slice(5) : globalName
      const def = catalog.getGlobal(globalName)
      const rootType = def?.cardinality === 'collection'
        ? (def.item_type ? `array[${def.item_type}]` : 'array')
        : 'object'
      const sym: BloggerScopeSymbol = {
        name: stripped,
        type: rootType,
        scopeType: 'global',
        requiresDataPrefix: true,
        metadata: { globalKey: globalName, description: def?.description },
      }
      globalSymbols.set(stripped, sym)
      globalSymbols.set(globalName, sym)
    }

    this.frames.push({
      type: 'global',
      symbols: globalSymbols,
    })

    if (options?.initialWidgetType) {
      this.pushScope('widget', { widgetType: options.initialWidgetType })
    }
  }

  getDepth(): number {
    return this.frames.length
  }

  getCurrentScope(): BloggerScopeFrame {
    return this.frames[this.frames.length - 1]!
  }

  getFrames(): readonly BloggerScopeFrame[] {
    return this.frames
  }

  getActiveWidgetType(): string | undefined {
    for (let i = this.frames.length - 1; i >= 0; i--) {
      const frame = this.frames[i]!
      if (frame.type === 'widget' && frame.widgetType) {
        return frame.widgetType
      }
    }
    return undefined
  }

  pushScope(type: BloggerScopeType, options?: BloggerPushScopeOptions): BloggerScopeFrame {
    const symbols = new Map<string, BloggerScopeSymbol>()
    const widgetType = options?.widgetType ?? (type === 'widget' ? (this.getActiveWidgetType() ?? 'Blog') : undefined)

    if (type === 'widget' && widgetType) {
      const widget = this.catalog.getWidget(widgetType)
      if (widget?.canonical) {
        for (const [propName, propDef] of Object.entries(widget.canonical)) {
          const sym: BloggerScopeSymbol = {
            name: propName,
            type: propDef.type,
            scopeType: 'widget',
            requiresDataPrefix: true,
            metadata: { description: propDef.description },
          }
          symbols.set(propName, sym)
          symbols.set(`data:${propName}`, sym)
        }
      }
      const widgetMetaSym: BloggerScopeSymbol = {
        name: 'widget',
        type: 'object',
        scopeType: 'widget',
        requiresDataPrefix: true,
        metadata: { description: 'Host-scoped metadata (instanceId, sectionId, type, version)' },
      }
      symbols.set('widget', widgetMetaSym)
      symbols.set('data:widget', widgetMetaSym)
    }

    if (options?.symbols) {
      const requiresDataPrefix = type !== 'lambda'
      for (const [rawName, symOrType] of Object.entries(options.symbols)) {
        const typeName = typeof symOrType === 'string' ? symOrType : (symOrType.type ?? 'unknown')
        const meta = typeof symOrType === 'object' ? symOrType.metadata : undefined
        const name = rawName.startsWith('data:') && type === 'lambda' ? rawName.slice(5) : rawName

        const symbolObj: BloggerScopeSymbol = {
          name,
          type: typeName,
          scopeType: type,
          requiresDataPrefix: typeof symOrType === 'object' && symOrType.requiresDataPrefix !== undefined
            ? symOrType.requiresDataPrefix
            : requiresDataPrefix,
          metadata: meta,
        }

        if (type === 'lambda') {
          symbols.set(name, symbolObj)
        }
        else {
          const stripped = name.startsWith('data:') ? name.slice(5) : name
          symbols.set(stripped, symbolObj)
          symbols.set(`data:${stripped}`, symbolObj)
        }
      }
    }

    const frame: BloggerScopeFrame = {
      id: options?.id,
      type,
      widgetType,
      symbols,
    }

    this.frames.push(frame)
    return frame
  }

  popScope(): BloggerScopeFrame | undefined {
    if (this.frames.length <= 1) {
      return undefined
    }
    return this.frames.pop()
  }

  resolveIdentifier(name: string): BloggerScopeSymbol | undefined {
    for (let i = this.frames.length - 1; i >= 0; i--) {
      const frame = this.frames[i]!
      if (frame.type === 'lambda') {
        if (name.startsWith('data:')) {
          continue
        }
        if (frame.symbols.has(name)) {
          return frame.symbols.get(name)
        }
      }
      else {
        if (frame.symbols.has(name)) {
          return frame.symbols.get(name)
        }
        const stripped = name.startsWith('data:') ? name.slice(5) : name
        if (frame.symbols.has(stripped)) {
          return frame.symbols.get(stripped)
        }
      }
    }
    return undefined
  }

  hasSymbol(name: string): boolean {
    return Boolean(this.resolveIdentifier(name))
  }

  getAllVisibleSymbols(): Map<string, BloggerScopeSymbol> {
    const result = new Map<string, BloggerScopeSymbol>()
    for (const frame of this.frames) {
      for (const [key, symbol] of frame.symbols.entries()) {
        result.set(key, symbol)
      }
    }
    return result
  }

  clone(): ScopeEnvironment {
    const copy = new ScopeEnvironment(this.catalog)
    copy.frames = this.frames.map(f => ({
      id: f.id,
      type: f.type,
      widgetType: f.widgetType,
      symbols: new Map(f.symbols),
    }))
    return copy
  }

  getResolutionPrecedence(): string[] {
    return this.catalog.getScopePrecedence()
  }

  inferDirectiveSymbols(
    token: BloggerDirectiveToken,
    options?: { widgetType?: string },
  ): Record<string, BloggerScopeSymbol> {
    const result: Record<string, BloggerScopeSymbol> = {}
    const tagName = token.tagName.toLowerCase()
    const activeWidgetType = options?.widgetType ?? this.getActiveWidgetType() ?? 'Blog'

    if (tagName === 'b:loop') {
      const valuesAttr = token.attributes.values?.value ?? token.attributes.value?.value
      const varAttr = token.attributes.var?.value
      const indexAttr = token.attributes.index?.value

      let itemType = 'unknown'
      let itemMeta: Record<string, unknown> | undefined

      if (valuesAttr) {
        const inferred = inferDirectiveExpressionType(valuesAttr, this.catalog, this, activeWidgetType)
        if (inferred.type === 'number') {
          itemType = 'number'
        }
        else if (inferred.type.startsWith('array[') && inferred.type.endsWith(']')) {
          itemType = inferred.type.slice(6, -1)
          itemMeta = inferred.metadata
        }
        else if (inferred.metadata?.item_properties) {
          itemType = (inferred.metadata.item_type as string) ?? 'object'
          itemMeta = inferred.metadata
        }
        else if (inferred.type === 'array') {
          itemType = (inferred.metadata?.item_type as string) ?? 'object'
          itemMeta = inferred.metadata
        }
        else {
          itemType = inferred.type
          itemMeta = inferred.metadata
        }
      }

      if (varAttr) {
        const cleanName = varAttr.startsWith('data:') ? varAttr.slice(5) : varAttr
        const varSym: BloggerScopeSymbol = {
          name: cleanName,
          type: itemType,
          scopeType: 'loop',
          requiresDataPrefix: true,
          metadata: itemMeta,
        }
        result[cleanName] = varSym
        result[`data:${cleanName}`] = varSym
      }

      if (indexAttr) {
        const cleanIndex = indexAttr.startsWith('data:') ? indexAttr.slice(5) : indexAttr
        const indexSym: BloggerScopeSymbol = {
          name: cleanIndex,
          type: 'number',
          scopeType: 'loop',
          requiresDataPrefix: true,
          metadata: { description: 'Loop iteration index (0-based).' },
        }
        result[cleanIndex] = indexSym
        result[`data:${cleanIndex}`] = indexSym
      }
    }
    else if (tagName === 'b:with') {
      const valueAttr = token.attributes.value?.value ?? token.attributes.expr?.value
      const varAttr = token.attributes.var?.value

      if (varAttr && valueAttr) {
        const inferred = inferDirectiveExpressionType(valueAttr, this.catalog, this, activeWidgetType)
        const cleanName = varAttr.startsWith('data:') ? varAttr.slice(5) : varAttr
        const sym: BloggerScopeSymbol = {
          name: cleanName,
          type: inferred.type,
          scopeType: 'with',
          requiresDataPrefix: true,
          metadata: inferred.metadata,
        }
        result[cleanName] = sym
        result[`data:${cleanName}`] = sym
      }
    }

    return result
  }

  pushDirectiveScope(
    token: BloggerDirectiveToken,
    options?: { widgetType?: string },
  ): BloggerScopeFrame | undefined {
    const tagName = token.tagName.toLowerCase()
    if (tagName !== 'b:loop' && tagName !== 'b:with' && tagName !== 'b:includable') {
      return undefined
    }

    const scopeType: BloggerScopeType = tagName === 'b:loop' ? 'loop' : (tagName === 'b:with' ? 'with' : 'includable')
    const symbols = this.inferDirectiveSymbols(token, options)
    return this.pushScope(scopeType, {
      id: token.attributes.id?.value,
      widgetType: options?.widgetType ?? this.getActiveWidgetType(),
      symbols,
    })
  }
}

export function inferDirectiveExpressionType(
  exprStr: string,
  catalog: SpecCatalog = getSpecCatalog(),
  scope?: ScopeEnvironment,
  widgetType?: string,
): { type: string, metadata?: Record<string, unknown> } {
  const trimmed = exprStr.trim()

  // 1. Numeric range: e.g. "1 to 10" or "0 to 10"
  const toIdx = trimmed.indexOf(' to ')
  if (toIdx !== -1) {
    const leftPart = trimmed.slice(0, toIdx).trim()
    const rightPart = trimmed.slice(toIdx + 4).trim()
    if (leftPart && rightPart) {
      return { type: 'number' }
    }
  }

  // 2. Numeric literal
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return { type: 'number' }
  }

  // 3. String literal
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith('\'') && trimmed.endsWith('\''))) {
    return { type: 'string' }
  }

  // 4. Boolean literal
  if (trimmed === 'true' || trimmed === 'false') {
    return { type: 'boolean' }
  }

  // 5. Object literal: e.g. { maxItems: 10, label: "Destacados" }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const inner = trimmed.slice(1, -1).trim()
    const properties: Record<string, { type: string }> = {}
    const pairRegex = /(?:^|,)\s*([a-z_][\w-]*)\s*:\s*([^,]+)/gi
    for (const match of inner.matchAll(pairRegex)) {
      const key = match[1]!
      const rawVal = match[2]!.trim()
      const valType = inferDirectiveExpressionType(rawVal, catalog, scope, widgetType).type
      properties[key] = { type: valType }
    }
    return {
      type: 'object',
      metadata: { properties },
    }
  }

  // 6. Array literal: e.g. [1, 2, 3] or [{ name: "Daniel", age: 20 }]
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim()
    if (!inner) {
      return { type: 'array' }
    }
    if (inner.startsWith('{')) {
      const firstObjEnd = inner.indexOf('}')
      if (firstObjEnd !== -1) {
        const firstObjStr = inner.slice(0, firstObjEnd + 1)
        const objInferred = inferDirectiveExpressionType(firstObjStr, catalog, scope, widgetType)
        return {
          type: 'array[object]',
          metadata: {
            item_properties: (objInferred.metadata as any)?.properties,
            item_type: 'object',
          },
        }
      }
    }
    const firstElement = inner.split(',')[0]!.trim()
    const elemType = inferDirectiveExpressionType(firstElement, catalog, scope, widgetType).type
    return {
      type: `array[${elemType}]`,
      metadata: { item_type: elemType },
    }
  }

  // 7. Aggregate / Predicate lambda pipelines:
  if (/\bcount\s*\(/i.test(trimmed)) {
    return { type: 'number' }
  }
  if (/\bany\s*\(/i.test(trimmed)) {
    return { type: 'boolean' }
  }

  // 8. Filter / Where lambda pipelines:
  const filterIdx = trimmed.search(/\s+(?:filter|where)\s*\(/i)
  if (filterIdx !== -1) {
    const baseExpr = trimmed.slice(0, filterIdx).trim()
    return inferDirectiveExpressionType(baseExpr, catalog, scope, widgetType)
  }

  // 9. Ternary operator: cond ? "Yes" : "No"
  const qIdx = trimmed.indexOf('?')
  const colonIdx = trimmed.lastIndexOf(':')
  if (qIdx !== -1 && colonIdx > qIdx) {
    const consequent = trimmed.slice(qIdx + 1, colonIdx).trim()
    return inferDirectiveExpressionType(consequent, catalog, scope, widgetType)
  }

  // 10. Data path resolution: data:posts, data:posts.first, data:blog.title, data:links
  const resolved = resolveDataPath(trimmed, {
    catalog,
    scope,
    widgetType,
  })

  if (resolved) {
    return {
      type: resolved.type,
      metadata: {
        definition: resolved.definition,
        item_properties: resolved.definition?.item_properties,
        item_type: resolved.itemType,
      },
    }
  }

  return { type: 'unknown' }
}
