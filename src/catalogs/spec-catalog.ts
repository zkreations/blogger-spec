import type {
  BloggerDiagnosticCode,
  BloggerDiagnosticRule,
  BloggerDiagnosticsCatalog,
  BloggerDirectiveAttribute,
  BloggerDirectiveDefinition,
  BloggerDirectiveName,
  BloggerDirectivesCatalog,
  BloggerGlobalsCatalog,
  BloggerInclusionDefinition,
  BloggerInclusionsCatalog,
  BloggerLayoutVersionsCatalog,
  BloggerMessagesCatalog,
  BloggerOperatorDefinition,
  BloggerOperatorName,
  BloggerOperatorsCatalog,
  BloggerScopesCatalog,
  BloggerSettingsCatalog,
  BloggerTypesCatalog,
  BloggerWidgetsCatalog,
  BloggerWidgetType,
  DirectiveAttributesValidationResult,
  DirectiveNestingAction,
  DirectiveNestingViolation,
  VariableAttributesValidationResult,
} from '../types.js'
import type { CatalogStore } from './store.js'
import { getDefaultCatalogStore, registerCacheResetListener } from './store.js'

let defaultSpecCatalogInstance: SpecCatalog | null = null

registerCacheResetListener(() => {
  defaultSpecCatalogInstance = null
})

export function getSpecCatalog(store?: CatalogStore): SpecCatalog {
  if (store) {
    return new SpecCatalog(store)
  }
  if (!defaultSpecCatalogInstance) {
    defaultSpecCatalogInstance = new SpecCatalog(getDefaultCatalogStore())
  }
  return defaultSpecCatalogInstance
}

export function getOperatorPrecedence(op: string, store?: CatalogStore): number | undefined {
  return getSpecCatalog(store).getOperatorPrecedence(op)
}

export function validateVariableAttributes(
  variableType: string,
  presentAttributes: string[],
  store?: CatalogStore,
): VariableAttributesValidationResult {
  return getSpecCatalog(store).validateVariableAttributes(variableType, presentAttributes)
}

export function validateDirectiveAttributes(
  tagName: string,
  presentAttributes: string[],
  store?: CatalogStore,
): DirectiveAttributesValidationResult {
  return getSpecCatalog(store).validateDirectiveAttributes(tagName, presentAttributes)
}

export function getThemeDesignerDescriptions(store?: CatalogStore): readonly string[] {
  return getSpecCatalog(store).getThemeDesignerDescriptions()
}

export function getVariableTypeAttributes(type?: string, store?: CatalogStore): any {
  return getSpecCatalog(store).getVariableTypeAttributes(type)
}

export type { DirectiveAttributesValidationResult } from '../types.js'

export class SpecCatalog {
  private readonly store: CatalogStore
  private readonly directiveMap = new Map<string, BloggerDirectiveDefinition>()
  private readonly operatorMap = new Map<string, BloggerOperatorDefinition>()
  private readonly grammarOperatorMap = new Map<string, BloggerOperatorDefinition>()
  private readonly docAliasMap = new Map<string, BloggerOperatorDefinition>()
  private readonly diagnosticMap = new Map<string, BloggerDiagnosticRule>()
  private readonly grammarGroupMap = new Map<string, string[]>()
  private readonly expandedValidChildrenMap = new Map<string, Set<string>>()
  private readonly expandedValidParentsMap = new Map<string, Set<string>>()
  private readonly widgetMap = new Map<string, any>()
  private readonly settingMap = new Map<string, any>()
  private readonly globalMap = new Map<string, any>()
  private readonly messageMap = new Map<string, any>()
  private readonly scopeMap = new Map<string, any>()
  private readonly scopeOrder: string[] = []
  private readonly typeMap = new Map<string, any>()
  private readonly coercionRules: Record<string, any> = {}
  private readonly inclusionMap = new Map<string, BloggerInclusionDefinition>()

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
    this.indexInclusions()
  }

  private indexDirectives(): void {
    const dirCatalog = this.store.getCatalog('directives') as BloggerDirectivesCatalog
    const directives = dirCatalog.directives || {}
    const groups = (dirCatalog.domain_metadata?.grammar_groups as Record<string, string[]>) || {}
    for (const [groupName, members] of Object.entries(groups)) {
      if (Array.isArray(members)) {
        this.grammarGroupMap.set(groupName, members)
      }
    }

    for (const [name, def] of Object.entries(directives)) {
      this.directiveMap.set(name, def)
    }

    for (const [name, def] of Object.entries(directives)) {
      if (def.grammar?.valid_children) {
        this.expandedValidChildrenMap.set(name, this.expandGroupTokens(def.grammar.valid_children))
      }
      if (def.grammar?.valid_parents) {
        this.expandedValidParentsMap.set(name, this.expandGroupTokens(def.grammar.valid_parents))
      }
    }
  }

  private expandGroupTokens(tokens: readonly string[]): Set<string> {
    const result = new Set<string>()
    const visited = new Set<string>()

    const walk = (token: string) => {
      if (visited.has(token)) {
        return
      }
      visited.add(token)

      if (token.startsWith('@')) {
        const members = this.grammarGroupMap.get(token) || []
        for (const member of members) {
          walk(member)
        }
      }
      else {
        result.add(token)
      }
    }

    for (const token of tokens) {
      walk(token)
    }

    return result
  }

  private isTagAllowedInSet(tag: string, allowedSet: Set<string>): boolean {
    if (allowedSet.has(tag)) {
      return true
    }
    if (tag.startsWith('data:') && allowedSet.has('data:*')) {
      return true
    }
    const lower = tag.toLowerCase()
    if (!this.isDirective(tag) && lower !== 'head' && lower !== 'html' && lower !== 'body' && allowedSet.has('html:*')) {
      return true
    }
    return false
  }

  private indexOperators(): void {
    const operators = (this.store.getCatalog('operators') as BloggerOperatorsCatalog).operators || {}
    for (const [op, def] of Object.entries(operators)) {
      this.operatorMap.set(op, def)
      this.grammarOperatorMap.set(op, def)
      this.grammarOperatorMap.set(op.toLowerCase(), def)

      if (Array.isArray(def.grammar_aliases)) {
        for (const alias of def.grammar_aliases) {
          this.grammarOperatorMap.set(alias, def)
          this.grammarOperatorMap.set(alias.toLowerCase(), def)
        }
      }

      if (Array.isArray(def.doc_aliases)) {
        for (const alias of def.doc_aliases) {
          this.docAliasMap.set(alias, def)
          this.docAliasMap.set(alias.toLowerCase(), def)
        }
      }
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
    const settingsCatalog = this.store.getCatalog('settings') as BloggerSettingsCatalog
    const settings = settingsCatalog.widgets || {}
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

  private indexInclusions(): void {
    try {
      const inclusionsData = this.store.getCatalog('inclusions') as BloggerInclusionsCatalog
      const inclusions = inclusionsData?.inclusions || {}
      for (const [name, def] of Object.entries(inclusions)) {
        this.inclusionMap.set(name, def)
      }
    }
    catch {}
  }

  isDirective(tagName: string): tagName is BloggerDirectiveName {
    return this.directiveMap.has(tagName) || tagName.startsWith('data:')
  }

  getDirective(tagName: string): BloggerDirectiveDefinition | undefined {
    if (this.directiveMap.has(tagName)) {
      return this.directiveMap.get(tagName)
    }
    if (tagName.startsWith('data:')) {
      return this.directiveMap.get('data:*')
    }
    return undefined
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
    return Boolean(def?.self_closing || def?.closure_mode === 'self_closing')
  }

  canNest(parentTag: string, childTag: string): boolean {
    const parentDef = this.getDirective(parentTag)
    const childDef = this.getDirective(childTag)

    if (parentDef) {
      if (this.isSelfClosingDirective(parentTag)) {
        return false
      }
      const canonicalParent = parentTag.startsWith('data:') ? 'data:*' : parentTag
      const allowedChildren = this.expandedValidChildrenMap.get(canonicalParent)
      if (allowedChildren) {
        if (!this.isTagAllowedInSet(childTag, allowedChildren)) {
          return false
        }
      }
    }

    if (childDef) {
      const canonicalChild = childTag.startsWith('data:') ? 'data:*' : childTag
      const allowedParents = this.expandedValidParentsMap.get(canonicalChild)
      if (allowedParents) {
        if (!this.isTagAllowedInSet(parentTag, allowedParents)) {
          return false
        }
      }
    }

    return true
  }

  validateNesting(parentTag: string, childTag: string): DirectiveNestingViolation | null {
    if (this.canNest(parentTag, childTag)) {
      return null
    }

    const parentDef = this.getDirective(parentTag)
    const childDef = this.getDirective(childTag)

    let diagCode = 'BX1023'
    let action: DirectiveNestingAction = 'reject'

    const parentPolicy = parentDef?.grammar?.invalid_nesting_policy?.on_invalid_child
    if (parentPolicy) {
      const exception = parentPolicy.exceptions?.[childTag]
      if (exception) {
        diagCode = exception.diagnostic
        action = exception.action
      }
      else {
        diagCode = parentPolicy.diagnostic
        action = parentPolicy.action
      }
    }
    else {
      const childPolicy = childDef?.grammar?.invalid_nesting_policy?.on_invalid_parent
      if (childPolicy) {
        diagCode = childPolicy.diagnostic
        action = childPolicy.action
      }
    }

    const rule = this.getDiagnostic(diagCode) ?? this.getDiagnostic('BX1023')!

    let message = rule.message
    if (rule.code === 'BX1023') {
      message = `Tag <${childTag}> is not permitted inside <${parentTag}>.`
    }

    return {
      code: rule.code,
      rule,
      action,
      message,
    }
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
        invalidExpressions: [],
        inverted: [],
      }
    }

    const allowedAttrs = directive.attributes || {}
    const deprecatedMap = directive.deprecated_attributes || {}
    const allowsArbitrary = Boolean(directive.grammar?.arbitrary_attributes)

    const unknown: string[] = []
    const deprecated: DirectiveAttributesValidationResult['deprecated'] = []
    const invalidExpressions: string[] = []
    const inverted: DirectiveAttributesValidationResult['inverted'] = []

    if (tagName === 'b:includable' && presentAttributes.includes('name') && !presentAttributes.includes('id')) {
      inverted.push({ code: 'BX1015', attribute: 'name', expected: 'id' })
    }
    else if (tagName === 'b:include' && presentAttributes.includes('id') && !(presentAttributes.includes('name') || presentAttributes.includes('expr:name'))) {
      inverted.push({ code: 'BX1016', attribute: 'id', expected: 'name' })
    }
    else if (tagName === 'b:switch' && presentAttributes.includes('expr') && !presentAttributes.includes('var')) {
      inverted.push({ code: 'BX1014', attribute: 'expr', expected: 'var' })
    }

    for (const attr of presentAttributes) {
      const hasExpr = attr.startsWith('expr:')
      const canonicalAttr = hasExpr ? attr.slice(5) : attr

      if (deprecatedMap[canonicalAttr]) {
        deprecated.push({
          name: attr,
          reason: deprecatedMap[canonicalAttr].reason,
          replacement: deprecatedMap[canonicalAttr].replacement,
        })
      }
      else if (allowedAttrs[canonicalAttr]) {
        const meta = allowedAttrs[canonicalAttr]
        if (hasExpr && (meta.expr === false || meta.attribute_kind === 'static_literal')) {
          invalidExpressions.push(attr)
        }
      }
      else if (inverted.some(inv => inv.attribute === canonicalAttr)) {
        // Handled as specific inverted diagnostic
      }
      else if (!allowsArbitrary) {
        unknown.push(attr)
      }
    }

    const missingRequired: string[] = []
    for (const [attrName, meta] of Object.entries(allowedAttrs)) {
      if (meta.required) {
        if (inverted.some(inv => inv.expected === attrName)) {
          continue
        }

        const hasLiteral = presentAttributes.includes(attrName)
        const allowsExpr = meta.expr !== false && meta.attribute_kind !== 'static_literal'
        const hasExpr = allowsExpr && presentAttributes.includes(`expr:${attrName}`)

        if (!hasLiteral && !hasExpr) {
          missingRequired.push(attrName)
        }
      }
    }

    return {
      valid: missingRequired.length === 0
        && unknown.length === 0
        && invalidExpressions.length === 0
        && inverted.length === 0,
      missingRequired,
      unknown,
      deprecated,
      invalidExpressions,
      inverted,
    }
  }

  getThemeDesignerDescriptions(): readonly string[] {
    const directivesCatalog = this.store.getCatalog('directives') as BloggerDirectivesCatalog
    return (directivesCatalog.domain_metadata?.theme_designer_descriptions as string[]) ?? []
  }

  getLayoutVersions(): BloggerLayoutVersionsCatalog | undefined {
    const directivesCatalog = this.store.getCatalog('directives') as BloggerDirectivesCatalog
    return directivesCatalog.domain_metadata?.layout_versions
  }

  getVariableTypeAttributes(type?: string): { allowed: string[], required?: string[] } | Record<string, { allowed: string[], required?: string[] }> | undefined {
    const varDef = this.getDirective('Variable')
    const typeAttrs = varDef?.type_attributes
    if (!typeAttrs) {
      return undefined
    }
    if (type) {
      return typeAttrs[type.toLowerCase()]
    }
    return typeAttrs
  }

  validateVariableAttributes(
    variableType: string,
    presentAttributes: string[],
  ): VariableAttributesValidationResult {
    const meta = this.getVariableTypeAttributes(variableType) as { allowed: string[], required?: string[] } | undefined
    if (!meta) {
      return {
        valid: false,
        invalidAttributes: presentAttributes,
        missingAttributes: [],
      }
    }

    const allowedSet = new Set(meta.allowed)
    const presentSet = new Set(presentAttributes)

    const invalidAttributes = presentAttributes.filter(attr => !allowedSet.has(attr))
    const missingAttributes = (meta.required || []).filter(attr => !presentSet.has(attr))

    return {
      valid: invalidAttributes.length === 0 && missingAttributes.length === 0,
      invalidAttributes,
      missingAttributes,
    }
  }

  validateDirectiveNesting(parentTag: string, childTag: string): DirectiveNestingViolation | null {
    return this.validateNesting(parentTag, childTag)
  }

  isOperator(op: string): op is BloggerOperatorName {
    return this.grammarOperatorMap.has(op) || this.grammarOperatorMap.has(op.toLowerCase())
  }

  isGrammarOperator(op: string): boolean {
    return this.isOperator(op)
  }

  isDocAlias(alias: string): boolean {
    return this.docAliasMap.has(alias) || this.docAliasMap.has(alias.toLowerCase())
  }

  getOperator(op: string): BloggerOperatorDefinition | undefined {
    return this.grammarOperatorMap.get(op)
      ?? this.grammarOperatorMap.get(op.toLowerCase())
      ?? this.docAliasMap.get(op)
      ?? this.docAliasMap.get(op.toLowerCase())
  }

  getAllOperators(): Record<string, BloggerOperatorDefinition> {
    const result: Record<string, BloggerOperatorDefinition> = {}
    for (const [k, v] of this.operatorMap.entries()) {
      result[k] = v
    }
    return result
  }

  getGrammarOperators(): Record<string, BloggerOperatorDefinition> {
    const result: Record<string, BloggerOperatorDefinition> = {}
    for (const [k, v] of this.grammarOperatorMap.entries()) {
      result[k] = v
    }
    return result
  }

  getOperatorPrecedence(op: string): number | undefined {
    // Precedence strictly applies to valid grammar operators in Blogger
    const grammarDef = this.grammarOperatorMap.get(op) ?? this.grammarOperatorMap.get(op.toLowerCase())
    return grammarDef?.precedence_level
  }

  isDiagnosticCode(code: string): code is BloggerDiagnosticCode {
    return this.diagnosticMap.has(code)
  }

  getDiagnosticRule(code: string): BloggerDiagnosticRule | undefined {
    return this.diagnosticMap.get(code)
  }

  getDiagnostic(code: string): BloggerDiagnosticRule | undefined {
    return this.getDiagnosticRule(code)
  }

  getAllDiagnostics(): Record<string, BloggerDiagnosticRule> {
    const result: Record<string, BloggerDiagnosticRule> = {}
    for (const [k, v] of this.diagnosticMap.entries()) {
      result[k] = v
    }
    return result
  }

  isWidget(name: string): name is BloggerWidgetType {
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

  isServerInclusion(name: string): boolean {
    if (!name) {
      return false
    }
    if (name.startsWith('super.')) {
      return true
    }
    return this.inclusionMap.has(name)
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
}

export function isDirective(tagName: string, store?: CatalogStore): tagName is BloggerDirectiveName {
  return getSpecCatalog(store).isDirective(tagName)
}

export function getDirective(tagName: string, store?: CatalogStore): BloggerDirectiveDefinition | undefined {
  return getSpecCatalog(store).getDirective(tagName)
}

export function getAllDirectives(store?: CatalogStore): Record<string, BloggerDirectiveDefinition> {
  return getSpecCatalog(store).getAllDirectives()
}

export function isSelfClosingDirective(tagName: string, store?: CatalogStore): boolean {
  return getSpecCatalog(store).isSelfClosingDirective(tagName)
}

export function canNest(parentTagName: string, childTagName: string, store?: CatalogStore): boolean {
  return getSpecCatalog(store).canNest(parentTagName, childTagName)
}

export function validateNesting(parentTagName: string, childTagName: string, store?: CatalogStore): DirectiveNestingViolation | null {
  return getSpecCatalog(store).validateNesting(parentTagName, childTagName)
}

export function getDirectiveAttributes(tagName: string, store?: CatalogStore): Record<string, BloggerDirectiveAttribute> | undefined {
  return getSpecCatalog(store).getDirectiveAttributes(tagName)
}

export function getLayoutVersions(store?: CatalogStore): BloggerLayoutVersionsCatalog | undefined {
  return getSpecCatalog(store).getLayoutVersions()
}

export function isOperator(op: string, store?: CatalogStore): op is BloggerOperatorName {
  return getSpecCatalog(store).isOperator(op)
}

export function isGrammarOperator(op: string, store?: CatalogStore): boolean {
  return getSpecCatalog(store).isGrammarOperator(op)
}

export function isDocAlias(alias: string, store?: CatalogStore): boolean {
  return getSpecCatalog(store).isDocAlias(alias)
}

export function getOperator(op: string, store?: CatalogStore): BloggerOperatorDefinition | undefined {
  return getSpecCatalog(store).getOperator(op)
}

export function getAllOperators(store?: CatalogStore): Record<string, BloggerOperatorDefinition> {
  return getSpecCatalog(store).getAllOperators()
}

export function getGrammarOperators(store?: CatalogStore): Record<string, BloggerOperatorDefinition> {
  return getSpecCatalog(store).getGrammarOperators()
}

export function isDiagnosticCode(code: string, store?: CatalogStore): code is BloggerDiagnosticCode {
  return getSpecCatalog(store).isDiagnosticCode(code)
}

export function getDiagnosticRule(code: string, store?: CatalogStore): BloggerDiagnosticRule | undefined {
  return getSpecCatalog(store).getDiagnosticRule(code)
}

export function getDiagnostic(code: string, store?: CatalogStore): BloggerDiagnosticRule | undefined {
  return getSpecCatalog(store).getDiagnostic(code)
}

export function getAllDiagnostics(store?: CatalogStore): Record<string, BloggerDiagnosticRule> {
  return getSpecCatalog(store).getAllDiagnostics()
}

export function isWidget(name: string, store?: CatalogStore): name is BloggerWidgetType {
  return getSpecCatalog(store).isWidget(name)
}

export function getWidget(name: string, store?: CatalogStore): any {
  return getSpecCatalog(store).getWidget(name)
}

export function getAllWidgets(store?: CatalogStore): Record<string, any> {
  return getSpecCatalog(store).getAllWidgets()
}

export function getWidgetSettings(widgetName: string, store?: CatalogStore): any {
  return getSpecCatalog(store).getWidgetSettings(widgetName)
}

export function getAllWidgetSettings(store?: CatalogStore): Record<string, any> {
  return getSpecCatalog(store).getAllWidgetSettings()
}

export function isGlobal(name: string, store?: CatalogStore): boolean {
  return getSpecCatalog(store).isGlobal(name)
}

export function getGlobal(name: string, store?: CatalogStore): any {
  return getSpecCatalog(store).getGlobal(name)
}

export function getAllGlobals(store?: CatalogStore): Record<string, any> {
  return getSpecCatalog(store).getAllGlobals()
}

export function isMessage(key: string, store?: CatalogStore): boolean {
  return getSpecCatalog(store).isMessage(key)
}

export function getMessage(key: string, store?: CatalogStore): any {
  return getSpecCatalog(store).getMessage(key)
}

export function getAllMessages(store?: CatalogStore): Record<string, any> {
  return getSpecCatalog(store).getAllMessages()
}

export function isScope(name: string, store?: CatalogStore): boolean {
  return getSpecCatalog(store).isScope(name)
}

export function getScope(name: string, store?: CatalogStore): any {
  return getSpecCatalog(store).getScope(name)
}

export function getAllScopes(store?: CatalogStore): Record<string, any> {
  return getSpecCatalog(store).getAllScopes()
}

export function getScopePrecedence(store?: CatalogStore): string[] {
  return getSpecCatalog(store).getScopePrecedence()
}

export function isType(name: string, store?: CatalogStore): boolean {
  return getSpecCatalog(store).isType(name)
}

export function getType(name: string, store?: CatalogStore): any {
  return getSpecCatalog(store).getType(name)
}

export function getAllTypes(store?: CatalogStore): Record<string, any> {
  return getSpecCatalog(store).getAllTypes()
}

export function getCoercionRules(store?: CatalogStore): Record<string, any> {
  return getSpecCatalog(store).getCoercionRules()
}

export function isServerInclusion(name: string, store?: CatalogStore): boolean {
  return getSpecCatalog(store).isServerInclusion(name)
}

export function getServerInclusion(name: string, store?: CatalogStore): BloggerInclusionDefinition | undefined {
  return getSpecCatalog(store).getInclusion(name)
}

export function getAllServerInclusions(store?: CatalogStore): Record<string, BloggerInclusionDefinition> {
  return getSpecCatalog(store).getAllInclusions()
}

export function isUniversalInclusion(name: string, store?: CatalogStore): boolean {
  return getSpecCatalog(store).isUniversalInclusion(name)
}
