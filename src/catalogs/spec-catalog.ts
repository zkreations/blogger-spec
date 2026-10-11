import type {
  BloggerDiagnosticCode,
  BloggerDiagnosticRule,
  BloggerDiagnosticsCatalog,
  BloggerDirectiveAttribute,
  BloggerDirectiveDefinition,
  BloggerDirectiveName,
  BloggerDirectivesCatalog,
  BloggerGlobalsCatalog,
  BloggerMessagesCatalog,
  BloggerOperatorDefinition,
  BloggerOperatorName,
  BloggerOperatorsCatalog,
  BloggerScopesCatalog,
  BloggerTypesCatalog,
  BloggerWidgetsCatalog,
} from '../types.js'
import type { CatalogStore } from './store.js'
import { getDefaultCatalogStore } from './store.js'

export interface DirectiveAttributesValidationResult {
  valid: boolean
  missingRequired: string[]
  unknown: string[]
  deprecated: Array<{
    name: string
    reason?: string
    replacement?: string
  }>
}

export class SpecCatalog {
  private readonly store: CatalogStore
  private readonly directiveMap = new Map<string, BloggerDirectiveDefinition>()
  private readonly operatorMap = new Map<string, BloggerOperatorDefinition>()
  private readonly diagnosticMap = new Map<string, BloggerDiagnosticRule>()
  private readonly validChildrenMap = new Map<string, Set<string> | null>()
  private readonly validParentsMap = new Map<string, Set<string> | null>()
  private readonly widgetMap = new Map<string, any>()
  private readonly settingMap = new Map<string, any>()
  private readonly globalMap = new Map<string, any>()
  private readonly messageMap = new Map<string, any>()
  private readonly scopeMap = new Map<string, any>()
  private readonly scopeOrder: string[] = []
  private readonly typeMap = new Map<string, any>()
  private readonly coercionRules: Record<string, any> = {}

  constructor(store: CatalogStore = getDefaultCatalogStore()) {
    this.store = store
    this.indexDirectives()
    this.indexOperators()
    this.indexDiagnostics()
    this.indexWidgets()
    this.indexSettings()
    this.indexGlobals()
    this.indexMessages()
    this.indexScopes()
    this.indexTypes()
  }

  private indexDirectives(): void {
    const directives = (this.store.getCatalog('directives') as BloggerDirectivesCatalog).directives || {}
    for (const [name, def] of Object.entries(directives)) {
      this.directiveMap.set(name, def)
      if (def.grammar?.valid_children) {
        this.validChildrenMap.set(name, new Set(def.grammar.valid_children))
      }
      else {
        this.validChildrenMap.set(name, null)
      }
      if (def.grammar?.valid_parents) {
        this.validParentsMap.set(name, new Set(def.grammar.valid_parents))
      }
      else {
        this.validParentsMap.set(name, null)
      }
    }
  }

  private indexOperators(): void {
    const operators = (this.store.getCatalog('operators') as BloggerOperatorsCatalog).operators || {}
    for (const [op, def] of Object.entries(operators)) {
      this.operatorMap.set(op, def)
    }
  }

  private indexDiagnostics(): void {
    const rules = (this.store.getCatalog('diagnostics') as BloggerDiagnosticsCatalog).rules || {}
    for (const [code, rule] of Object.entries(rules)) {
      this.diagnosticMap.set(code, rule)
    }
  }

  private indexWidgets(): void {
    const widgets = (this.store.getCatalog('widgets') as BloggerWidgetsCatalog).widgets || {}
    for (const [name, def] of Object.entries(widgets)) {
      this.widgetMap.set(name, def)
    }
  }

  private indexSettings(): void {
    const settingsCatalog = this.store.getCatalog('settings') as any
    const settings = settingsCatalog.widgets || settingsCatalog.settings || {}
    for (const [name, def] of Object.entries(settings)) {
      this.settingMap.set(name, def)
    }
  }

  private indexGlobals(): void {
    const objects = (this.store.getCatalog('globals') as BloggerGlobalsCatalog).objects || {}
    for (const [name, def] of Object.entries(objects)) {
      this.globalMap.set(name, def)
      if (name.startsWith('data:')) {
        this.globalMap.set(name.slice(5), def)
      }
    }
  }

  private indexMessages(): void {
    const messages = (this.store.getCatalog('messages') as BloggerMessagesCatalog).messages || {}
    for (const [key, def] of Object.entries(messages)) {
      this.messageMap.set(key, def)
    }
  }

  private indexScopes(): void {
    const scopesData = this.store.getCatalog('scopes') as BloggerScopesCatalog
    if (Array.isArray(scopesData.resolution_precedence)) {
      this.scopeOrder.push(...scopesData.resolution_precedence)
    }
    const scopes = scopesData.scopes || {}
    for (const [name, def] of Object.entries(scopes)) {
      this.scopeMap.set(name, def)
    }
  }

  private indexTypes(): void {
    const typesData = this.store.getCatalog('types') as BloggerTypesCatalog
    if (typesData.coercion_rules) {
      Object.assign(this.coercionRules, typesData.coercion_rules)
    }
    const types = typesData.types || {}
    for (const [name, def] of Object.entries(types)) {
      this.typeMap.set(name, def)
    }
  }

  isDirective(tagName: string): tagName is BloggerDirectiveName {
    return this.directiveMap.has(tagName)
  }

  getDirective(tagName: string): BloggerDirectiveDefinition | undefined {
    return this.directiveMap.get(tagName)
  }

  getAllDirectives(): Record<string, BloggerDirectiveDefinition> {
    const result: Record<string, BloggerDirectiveDefinition> = {}
    for (const [k, v] of this.directiveMap.entries()) {
      result[k] = v
    }
    return result
  }

  isSelfClosingDirective(tagName: string): boolean {
    const def = this.getDirective(tagName)
    return Boolean(def?.self_closing)
  }

  isValidChild(parentTagName: string, childTagName: string): boolean {
    const validSet = this.validChildrenMap.get(parentTagName)
    if (!validSet) {
      return true
    }
    return validSet.has(childTagName)
  }

  isValidParent(childTagName: string, parentTagName: string): boolean {
    const validSet = this.validParentsMap.get(childTagName)
    if (!validSet) {
      return true
    }
    return validSet.has(parentTagName)
  }

  getDirectiveAttributes(tagName: string): Record<string, BloggerDirectiveAttribute> | undefined {
    return this.getDirective(tagName)?.attributes
  }

  validateDirectiveAttributes(
    tagName: string,
    presentAttributes: string[],
  ): DirectiveAttributesValidationResult {
    const directive = this.getDirective(tagName)
    if (!directive) {
      return {
        valid: false,
        missingRequired: [],
        unknown: presentAttributes,
        deprecated: [],
      }
    }

    const allowedAttrs = directive.attributes || {}
    const deprecatedMap = directive.deprecated_attributes || {}

    const missingRequired: string[] = []
    for (const [attrName, meta] of Object.entries(allowedAttrs)) {
      if (meta.required && !presentAttributes.includes(attrName)) {
        missingRequired.push(attrName)
      }
    }

    const unknown: string[] = []
    const deprecated: DirectiveAttributesValidationResult['deprecated'] = []

    for (const attr of presentAttributes) {
      const canonicalAttr = attr.startsWith('expr:') ? attr.slice(5) : attr
      if (deprecatedMap[canonicalAttr]) {
        deprecated.push({
          name: attr,
          reason: deprecatedMap[canonicalAttr].reason,
          replacement: deprecatedMap[canonicalAttr].replacement,
        })
      }
      else if (!allowedAttrs[canonicalAttr]) {
        unknown.push(attr)
      }
    }

    return {
      valid: missingRequired.length === 0 && unknown.length === 0,
      missingRequired,
      unknown,
      deprecated,
    }
  }

  isOperator(op: string): op is BloggerOperatorName {
    return this.operatorMap.has(op)
  }

  getOperator(op: string): BloggerOperatorDefinition | undefined {
    return this.operatorMap.get(op)
  }

  getAllOperators(): Record<string, BloggerOperatorDefinition> {
    const result: Record<string, BloggerOperatorDefinition> = {}
    for (const [k, v] of this.operatorMap.entries()) {
      result[k] = v
    }
    return result
  }

  getOperatorPrecedence(op: string): number | undefined {
    return this.getOperator(op)?.precedence_level
  }

  isDiagnosticCode(code: string): code is BloggerDiagnosticCode {
    return this.diagnosticMap.has(code)
  }

  getDiagnosticRule(code: string): BloggerDiagnosticRule | undefined {
    return this.diagnosticMap.get(code)
  }

  getAllDiagnostics(): Record<string, BloggerDiagnosticRule> {
    const result: Record<string, BloggerDiagnosticRule> = {}
    for (const [k, v] of this.diagnosticMap.entries()) {
      result[k] = v
    }
    return result
  }

  isWidget(name: string): boolean {
    return this.widgetMap.has(name)
  }

  getWidget(name: string): any {
    return this.widgetMap.get(name)
  }

  getAllWidgets(): Record<string, any> {
    const result: Record<string, any> = {}
    for (const [k, v] of this.widgetMap.entries()) {
      result[k] = v
    }
    return result
  }

  getWidgetSettings(widgetName: string): any {
    return this.settingMap.get(widgetName)
  }

  getAllWidgetSettings(): Record<string, any> {
    const result: Record<string, any> = {}
    for (const [k, v] of this.settingMap.entries()) {
      result[k] = v
    }
    return result
  }

  isGlobal(name: string): boolean {
    return this.globalMap.has(name)
  }

  getGlobal(name: string): any {
    return this.globalMap.get(name)
  }

  getAllGlobals(): Record<string, any> {
    const result: Record<string, any> = {}
    for (const [k, v] of this.globalMap.entries()) {
      result[k] = v
    }
    return result
  }

  isMessage(key: string): boolean {
    return this.messageMap.has(key)
  }

  getMessage(key: string): any {
    return this.messageMap.get(key)
  }

  getAllMessages(): Record<string, any> {
    const result: Record<string, any> = {}
    for (const [k, v] of this.messageMap.entries()) {
      result[k] = v
    }
    return result
  }

  isScope(name: string): boolean {
    return this.scopeMap.has(name)
  }

  getScope(name: string): any {
    return this.scopeMap.get(name)
  }

  getAllScopes(): Record<string, any> {
    const result: Record<string, any> = {}
    for (const [k, v] of this.scopeMap.entries()) {
      result[k] = v
    }
    return result
  }

  getScopePrecedence(): string[] {
    return [...this.scopeOrder]
  }

  isType(name: string): boolean {
    return this.typeMap.has(name)
  }

  getType(name: string): any {
    return this.typeMap.get(name)
  }

  getAllTypes(): Record<string, any> {
    const result: Record<string, any> = {}
    for (const [k, v] of this.typeMap.entries()) {
      result[k] = v
    }
    return result
  }

  getCoercionRules(): Record<string, any> {
    return { ...this.coercionRules }
  }
}
