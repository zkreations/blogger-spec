import type {
  BloggerDiagnosticCode,
  BloggerDiagnosticRule,
  BloggerDiagnosticsCatalog,
  BloggerDirectiveAttribute,
  BloggerDirectiveDefinition,
  BloggerDirectiveName,
  BloggerDirectivesCatalog,
  BloggerGlobalObjectDefinition,
  BloggerGlobalsCatalog,
  BloggerInclusionDefinition,
  BloggerInclusionsCatalog,
  BloggerLayoutVersionsCatalog,
  BloggerMessageDefinition,
  BloggerMessagesCatalog,
  BloggerOperatorDefinition,
  BloggerOperatorName,
  BloggerOperatorsCatalog,
  BloggerScopeDefinition,
  BloggerScopesCatalog,
  BloggerSettingsCatalog,
  BloggerTypeDefinition,
  BloggerTypesCatalog,
  BloggerWidgetDefinition,
  BloggerWidgetsCatalog,
  BloggerWidgetSettingsDefinition,
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

export function getOperatorPrecedence(op: string, catalog: SpecCatalog = getSpecCatalog()): number | undefined {
  return catalog.getOperatorPrecedence(op)
}

export function validateVariableAttributes(
  variableType: string,
  presentAttributes: string[],
  catalog: SpecCatalog = getSpecCatalog(),
): VariableAttributesValidationResult {
  return catalog.validateVariableAttributes(variableType, presentAttributes)
}

export function validateDirectiveAttributes(
  tagName: string,
  presentAttributes: string[],
  catalog: SpecCatalog = getSpecCatalog(),
): DirectiveAttributesValidationResult {
  return catalog.validateDirectiveAttributes(tagName, presentAttributes)
}

export function getThemeDesignerDescriptions(catalog: SpecCatalog = getSpecCatalog()): readonly string[] {
  return catalog.getThemeDesignerDescriptions()
}

export function getVariableTypeAttributes(type?: undefined, catalog?: SpecCatalog): Record<string, { allowed: string[], required?: string[] }> | undefined
export function getVariableTypeAttributes(type: string, catalog?: SpecCatalog): { allowed: string[], required?: string[] } | undefined
export function getVariableTypeAttributes(
  type?: string,
  catalog: SpecCatalog = getSpecCatalog(),
): { allowed: string[], required?: string[] } | Record<string, { allowed: string[], required?: string[] }> | undefined {
  return type !== undefined ? catalog.getVariableTypeAttributes(type) : catalog.getVariableTypeAttributes()
}

export type {
  DirectiveAttributesValidationResult,
  VariableAttributesValidationResult,
} from '../types.js'

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
  private readonly widgetMap = new Map<string, BloggerWidgetDefinition>()
  private readonly settingMap = new Map<string, BloggerWidgetSettingsDefinition>()
  private readonly globalMap = new Map<string, BloggerGlobalObjectDefinition>()
  private readonly messageMap = new Map<string, BloggerMessageDefinition>()
  private readonly scopeMap = new Map<string, BloggerScopeDefinition>()
  private readonly scopeOrder: string[] = []
  private readonly typeMap = new Map<string, BloggerTypeDefinition>()
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

  getVariableTypeAttributes(): Record<string, { allowed: string[], required?: string[] }> | undefined
  getVariableTypeAttributes(type: string): { allowed: string[], required?: string[] } | undefined
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
    const meta = this.getVariableTypeAttributes(variableType)
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

  getWidget(name: string): BloggerWidgetDefinition | undefined {
    return this.widgetMap.get(name)
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

  isMessage(key: string): boolean {
    return this.messageMap.has(key)
  }

  getMessage(key: string): BloggerMessageDefinition | undefined {
    return this.messageMap.get(key)
  }

  getAllMessages(): Record<string, BloggerMessageDefinition> {
    const result: Record<string, BloggerMessageDefinition> = {}
    for (const [k, v] of this.messageMap.entries()) {
      result[k] = v
    }
    return result
  }

  isScope(name: string): boolean {
    return this.scopeMap.has(name)
  }

  getScope(name: string): BloggerScopeDefinition | undefined {
    return this.scopeMap.get(name)
  }

  getAllScopes(): Record<string, BloggerScopeDefinition> {
    const result: Record<string, BloggerScopeDefinition> = {}
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

  getType(name: string): BloggerTypeDefinition | undefined {
    return this.typeMap.get(name)
  }

  getAllTypes(): Record<string, BloggerTypeDefinition> {
    const result: Record<string, BloggerTypeDefinition> = {}
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

export function isDirective(tagName: string, catalog: SpecCatalog = getSpecCatalog()): tagName is BloggerDirectiveName {
  return catalog.isDirective(tagName)
}

export function getDirective(tagName: string, catalog: SpecCatalog = getSpecCatalog()): BloggerDirectiveDefinition | undefined {
  return catalog.getDirective(tagName)
}

export function getAllDirectives(catalog: SpecCatalog = getSpecCatalog()): Record<string, BloggerDirectiveDefinition> {
  return catalog.getAllDirectives()
}

export function isSelfClosingDirective(tagName: string, catalog: SpecCatalog = getSpecCatalog()): boolean {
  return catalog.isSelfClosingDirective(tagName)
}

export function canNest(parentTagName: string, childTagName: string, catalog: SpecCatalog = getSpecCatalog()): boolean {
  return catalog.canNest(parentTagName, childTagName)
}

export function validateNesting(parentTagName: string, childTagName: string, catalog: SpecCatalog = getSpecCatalog()): DirectiveNestingViolation | null {
  return catalog.validateNesting(parentTagName, childTagName)
}

export function getDirectiveAttributes(tagName: string, catalog: SpecCatalog = getSpecCatalog()): Record<string, BloggerDirectiveAttribute> | undefined {
  return catalog.getDirectiveAttributes(tagName)
}

export function getLayoutVersions(catalog: SpecCatalog = getSpecCatalog()): BloggerLayoutVersionsCatalog | undefined {
  return catalog.getLayoutVersions()
}

export function isOperator(op: string, catalog: SpecCatalog = getSpecCatalog()): op is BloggerOperatorName {
  return catalog.isOperator(op)
}

export function isGrammarOperator(op: string, catalog: SpecCatalog = getSpecCatalog()): boolean {
  return catalog.isGrammarOperator(op)
}

export function isDocAlias(alias: string, catalog: SpecCatalog = getSpecCatalog()): boolean {
  return catalog.isDocAlias(alias)
}

export function getOperator(op: string, catalog: SpecCatalog = getSpecCatalog()): BloggerOperatorDefinition | undefined {
  return catalog.getOperator(op)
}

export function getAllOperators(catalog: SpecCatalog = getSpecCatalog()): Record<string, BloggerOperatorDefinition> {
  return catalog.getAllOperators()
}

export function getGrammarOperators(catalog: SpecCatalog = getSpecCatalog()): Record<string, BloggerOperatorDefinition> {
  return catalog.getGrammarOperators()
}

export function isDiagnosticCode(code: string, catalog: SpecCatalog = getSpecCatalog()): code is BloggerDiagnosticCode {
  return catalog.isDiagnosticCode(code)
}

export function getDiagnosticRule(code: string, catalog: SpecCatalog = getSpecCatalog()): BloggerDiagnosticRule | undefined {
  return catalog.getDiagnosticRule(code)
}

export function getDiagnostic(code: string, catalog: SpecCatalog = getSpecCatalog()): BloggerDiagnosticRule | undefined {
  return catalog.getDiagnostic(code)
}

export function getAllDiagnostics(catalog: SpecCatalog = getSpecCatalog()): Record<string, BloggerDiagnosticRule> {
  return catalog.getAllDiagnostics()
}

export function isWidget(name: string, catalog: SpecCatalog = getSpecCatalog()): name is BloggerWidgetType {
  return catalog.isWidget(name)
}

export function getWidget(name: string, catalog: SpecCatalog = getSpecCatalog()): BloggerWidgetDefinition | undefined {
  return catalog.getWidget(name)
}

export function getAllWidgets(catalog: SpecCatalog = getSpecCatalog()): Record<string, BloggerWidgetDefinition> {
  return catalog.getAllWidgets()
}

export function getWidgetSettings(widgetName: string, catalog: SpecCatalog = getSpecCatalog()): BloggerWidgetSettingsDefinition | undefined {
  return catalog.getWidgetSettings(widgetName)
}

export function getAllWidgetSettings(catalog: SpecCatalog = getSpecCatalog()): Record<string, BloggerWidgetSettingsDefinition> {
  return catalog.getAllWidgetSettings()
}

export function isGlobal(name: string, catalog: SpecCatalog = getSpecCatalog()): boolean {
  return catalog.isGlobal(name)
}

export function getGlobal(name: string, catalog: SpecCatalog = getSpecCatalog()): BloggerGlobalObjectDefinition | undefined {
  return catalog.getGlobal(name)
}

export function getAllGlobals(catalog: SpecCatalog = getSpecCatalog()): Record<string, BloggerGlobalObjectDefinition> {
  return catalog.getAllGlobals()
}

export function isMessage(key: string, catalog: SpecCatalog = getSpecCatalog()): boolean {
  return catalog.isMessage(key)
}

export function getMessage(key: string, catalog: SpecCatalog = getSpecCatalog()): BloggerMessageDefinition | undefined {
  return catalog.getMessage(key)
}

export function getAllMessages(catalog: SpecCatalog = getSpecCatalog()): Record<string, BloggerMessageDefinition> {
  return catalog.getAllMessages()
}

export function isScope(name: string, catalog: SpecCatalog = getSpecCatalog()): boolean {
  return catalog.isScope(name)
}

export function getScope(name: string, catalog: SpecCatalog = getSpecCatalog()): BloggerScopeDefinition | undefined {
  return catalog.getScope(name)
}

export function getAllScopes(catalog: SpecCatalog = getSpecCatalog()): Record<string, BloggerScopeDefinition> {
  return catalog.getAllScopes()
}

export function getScopePrecedence(catalog: SpecCatalog = getSpecCatalog()): string[] {
  return catalog.getScopePrecedence()
}

export function isType(name: string, catalog: SpecCatalog = getSpecCatalog()): boolean {
  return catalog.isType(name)
}

export function getType(name: string, catalog: SpecCatalog = getSpecCatalog()): BloggerTypeDefinition | undefined {
  return catalog.getType(name)
}

export function getAllTypes(catalog: SpecCatalog = getSpecCatalog()): Record<string, BloggerTypeDefinition> {
  return catalog.getAllTypes()
}

export function getCoercionRules(catalog: SpecCatalog = getSpecCatalog()): Record<string, any> {
  return catalog.getCoercionRules()
}

export function isServerInclusion(name: string, catalog: SpecCatalog = getSpecCatalog()): boolean {
  return catalog.isServerInclusion(name)
}

export function getInclusion(name: string, catalog: SpecCatalog = getSpecCatalog()): BloggerInclusionDefinition | undefined {
  return catalog.getInclusion(name)
}

export function getAllInclusions(catalog: SpecCatalog = getSpecCatalog()): Record<string, BloggerInclusionDefinition> {
  return catalog.getAllInclusions()
}

export const getServerInclusion = getInclusion
export const getAllServerInclusions = getAllInclusions

export function isUniversalInclusion(name: string, catalog: SpecCatalog = getSpecCatalog()): boolean {
  return catalog.isUniversalInclusion(name)
}
