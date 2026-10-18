import type { SpecCatalog } from './catalogs/index.js'
import { getSpecCatalog } from './catalogs/index.js'

export type BloggerScopeType = 'global' | 'includable' | 'lambda' | 'loop' | 'section' | 'widget' | 'with'

export interface BloggerScopeSymbol {
  readonly name: string
  readonly type?: string
  readonly scopeType: BloggerScopeType
  readonly requiresDataPrefix?: boolean
  readonly metadata?: Record<string, unknown>
}

export interface PushScopeOptions {
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

  pushScope(type: BloggerScopeType, options?: PushScopeOptions): BloggerScopeFrame {
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
}
