import type {
  BloggerDiagnosticCode,
  BloggerGlobalObjectDefinition,
  BloggerGlobalsCatalog,
  BloggerInclusionDefinition,
  BloggerInclusionDiagnosticKey,
  BloggerInclusionsCatalog,
  BloggerRuntimeEvaluationState,
  BloggerSettingsCatalog,
  BloggerSuperDelegationRule,
  BloggerViewId,
  BloggerViewMatrixEntry,
  BloggerWidgetDefinition,
  BloggerWidgetsCatalog,
  BloggerWidgetSettingsDefinition,
  BloggerWidgetType,
} from '../../types.js'
import type { CatalogStore } from '../store.js'

export class WidgetCatalogService {
  private readonly widgetMap = new Map<string, BloggerWidgetDefinition>()
  private readonly settingMap = new Map<string, BloggerWidgetSettingsDefinition>()
  private readonly globalMap = new Map<string, BloggerGlobalObjectDefinition>()
  private readonly inclusionMap = new Map<string, BloggerInclusionDefinition>()
  private readonly widgetDefaultInclusions = new Map<string, string[]>()
  private superPrefix = 'super.'

  constructor(private readonly store: CatalogStore) {
    this.index()
  }

  private index(): void {
    const widgets = (this.store.getCatalog('widgets') as BloggerWidgetsCatalog)?.widgets || {}
    for (const [name, def] of Object.entries(widgets)) {
      this.widgetMap.set(name, def)
    }

    const settingsCatalog = this.store.getCatalog('settings') as BloggerSettingsCatalog
    const settings = settingsCatalog?.widgets || {}
    for (const [name, def] of Object.entries(settings)) {
      this.settingMap.set(name, def)
    }

    const objects = (this.store.getCatalog('globals') as BloggerGlobalsCatalog)?.objects || {}
    for (const [name, def] of Object.entries(objects)) {
      this.globalMap.set(name, def)
      if (name.startsWith('data:')) {
        this.globalMap.set(name.slice(5), def)
      }
    }

    const inclusionsData = this.store.getCatalog('inclusions') as BloggerInclusionsCatalog
    const prefix = inclusionsData?.domain_metadata?.super_prefix_rule?.prefix
    if (!prefix) {
      throw new Error('Missing domain_metadata.super_prefix_rule.prefix in inclusions catalog')
    }
    this.superPrefix = prefix
    for (const [name, def] of Object.entries(inclusionsData?.inclusions || {})) {
      this.inclusionMap.set(name, { ...def, name: def.name ?? name })
    }
    this.widgetDefaultInclusions.clear()
    for (const [wType, list] of Object.entries(inclusionsData?.domain_metadata?.widget_default_inclusions || {})) {
      this.widgetDefaultInclusions.set(wType, list)
    }
  }

  isWidget(name: string): name is BloggerWidgetType {
    return this.widgetMap.has(name)
  }

  getWidget(name: string): BloggerWidgetDefinition | undefined {
    return this.widgetMap.get(name)
  }

  getWidgetData(name: string): BloggerWidgetDefinition['canonical'] | undefined {
    return this.widgetMap.get(name)?.canonical
  }

  getCommonWidget(): BloggerWidgetDefinition | undefined {
    return (this.store.getCatalog('widgets') as BloggerWidgetsCatalog)?.common
  }

  getAllWidgets(): Record<string, BloggerWidgetDefinition> {
    const result: Record<string, BloggerWidgetDefinition> = {}
    for (const [k, v] of this.widgetMap.entries()) {
      result[k] = v
    }
    return result
  }

  getWidgetSettings(widgetName: string): BloggerWidgetSettingsDefinition | undefined {
    return this.settingMap.get(widgetName)
  }

  getBlogPagination(): BloggerWidgetSettingsDefinition['pagination'] {
    return this.settingMap.get('Blog')?.pagination
  }

  getBlogSnippets(): BloggerWidgetSettingsDefinition['snippets'] {
    return this.settingMap.get('Blog')?.snippets
  }

  getAllWidgetSettings(): Record<string, BloggerWidgetSettingsDefinition> {
    const result: Record<string, BloggerWidgetSettingsDefinition> = {}
    for (const [k, v] of this.settingMap.entries()) {
      result[k] = v
    }
    return result
  }

  isGlobal(name: string): boolean {
    return this.globalMap.has(name)
  }

  getGlobal(name: string): BloggerGlobalObjectDefinition | undefined {
    return this.globalMap.get(name)
  }

  getAllGlobals(): Record<string, BloggerGlobalObjectDefinition> {
    const result: Record<string, BloggerGlobalObjectDefinition> = {}
    for (const [k, v] of this.globalMap.entries()) {
      result[k] = v
    }
    return result
  }

  getViewsMatrix(): Readonly<Record<BloggerViewId, BloggerViewMatrixEntry>> {
    const globalsCatalog = this.store.getCatalog('globals') as BloggerGlobalsCatalog
    return (globalsCatalog?.domain_metadata?.views ?? {}) as Readonly<Record<BloggerViewId, BloggerViewMatrixEntry>>
  }

  getViewMatrixEntry(viewId: BloggerViewId): BloggerViewMatrixEntry | undefined {
    return this.getViewsMatrix()[viewId]
  }

  getRuntimeEvaluationStates(): Readonly<Record<string, BloggerRuntimeEvaluationState>> {
    const globalsCatalog = this.store.getCatalog('globals') as BloggerGlobalsCatalog
    return globalsCatalog?.domain_metadata?.runtime_evaluation_states ?? {}
  }

  isServerInclusion(name: string): boolean {
    if (!name) {
      return false
    }
    if (name.startsWith(this.superPrefix)) {
      return true
    }
    return this.inclusionMap.has(name)
  }

  getSuperPrefix(): string {
    return this.superPrefix
  }

  getInclusion(name: string): BloggerInclusionDefinition | undefined {
    return this.inclusionMap.get(name)
  }

  getAllInclusions(): Record<string, BloggerInclusionDefinition> {
    const result: Record<string, BloggerInclusionDefinition> = {}
    for (const [k, v] of this.inclusionMap.entries()) {
      result[k] = v
    }
    return result
  }

  isUniversalInclusion(name: string): boolean {
    const inc = this.inclusionMap.get(name)
    return inc?.category === 'universal'
  }

  isPortableInclusion(name: string): boolean {
    const inc = this.inclusionMap.get(name)
    return inc?.safety === 'portable'
  }

  isThemeBoundInclusion(name: string): boolean {
    const inc = this.inclusionMap.get(name)
    return inc?.safety === 'theme_bound'
  }

  getInclusionMarkup(name: string): string | undefined {
    return this.inclusionMap.get(name)?.server_markup
  }

  getSuperDelegationRule(): BloggerSuperDelegationRule | undefined {
    const inclusionsData = this.store.getCatalog('inclusions') as BloggerInclusionsCatalog
    return inclusionsData?.domain_metadata?.super_delegation
  }

  getWidgetDefaultInclusions(widgetType: string): readonly string[] {
    const specific = this.widgetDefaultInclusions.get(widgetType) || []
    const universal = this.widgetDefaultInclusions.get('All') || []
    return Array.from(new Set([...specific, ...universal]))
  }

  isValidSuperInclusion(widgetType: string, subroutineName: string): boolean {
    const list = this.getWidgetDefaultInclusions(widgetType)
    return list.includes(subroutineName)
  }

  getAllWidgetDefaultInclusions(): Record<string, string[]> {
    const result: Record<string, string[]> = {}
    for (const [k, v] of this.widgetDefaultInclusions.entries()) {
      result[k] = [...v]
    }
    return result
  }

  getInclusionDiagnostic(key: BloggerInclusionDiagnosticKey): BloggerDiagnosticCode {
    const inclusionsData = this.store.getCatalog('inclusions') as BloggerInclusionsCatalog
    const code = inclusionsData?.domain_metadata?.standard_diagnostics?.[key]
    if (!code) {
      throw new Error(`Inclusion standard diagnostic '${key}' is not defined in inclusions catalog domain_metadata.standard_diagnostics`)
    }
    return code
  }
}
