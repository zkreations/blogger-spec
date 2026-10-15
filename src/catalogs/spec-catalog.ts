import type {
  BloggerDiagnosticCode,
  BloggerDiagnosticRule,
  BloggerDiagnosticsCatalog,
  BloggerDirectiveAttribute,
  BloggerDirectiveDefinition,
  BloggerDirectiveName,
  BloggerDirectivesCatalog,
  BloggerDirectiveToken,
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
  BloggerStructureDiagnostic,
  BloggerTypesCatalog,
  BloggerWidgetsCatalog,
  BloggerWidgetType,
  VariableAttributesValidationResult,
} from '../types.js'
import type { CatalogStore } from './store.js'
import { scanDirectiveTokens } from '../parser/directive-scanner.js'
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
  private readonly grammarOperatorMap = new Map<string, BloggerOperatorDefinition>()
  private readonly docAliasMap = new Map<string, BloggerOperatorDefinition>()
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

  validateDirectiveNesting(parentTag: string, childTag: string): BloggerDiagnosticRule | null {
    if (parentTag === 'b:section' && childTag === 'b:section') {
      return this.getDiagnostic('BX1035') ?? null
    }
    if (childTag === 'b:widget' && parentTag !== 'b:section') {
      return this.getDiagnostic('BX1034') ?? null
    }
    if (!this.isValidChild(parentTag, childTag) || !this.isValidParent(childTag, parentTag)) {
      return this.getDiagnostic('BX1023') ?? null
    }
    return null
  }

  validateTemplateStructure(tokensOrXml: readonly BloggerDirectiveToken[] | string): BloggerStructureDiagnostic[] {
    const tokens = typeof tokensOrXml === 'string'
      ? scanDirectiveTokens(tokensOrXml)
      : tokensOrXml

    const diagnostics: BloggerStructureDiagnostic[] = []
    const tagStack: BloggerDirectiveToken[] = []
    const globalSectionWidgetIds = new Map<string, BloggerDirectiveToken>()
    const containerIncludableIds = new Map<BloggerDirectiveToken, Set<string>>()

    for (const token of tokens) {
      if (token.isClosing) {
        const lower = token.tagName.toLowerCase()
        let matchIdx = -1
        for (let i = tagStack.length - 1; i >= 0; i--) {
          if (tagStack[i]!.tagName.toLowerCase() === lower) {
            matchIdx = i
            break
          }
        }
        if (matchIdx !== -1) {
          tagStack.splice(matchIdx)
        }
        continue
      }

      const parentToken = tagStack.length > 0 ? tagStack[tagStack.length - 1] : undefined
      const isSection = token.tagName === 'b:section'
      const isWidget = token.tagName === 'b:widget'
      const isIncludable = token.tagName === 'b:includable'

      // 1. Nesting Checks
      if (isSection) {
        const inSection = tagStack.some(t => t.tagName === 'b:section')
        if (inSection) {
          const rule = this.getDiagnostic('BX1035')
          if (rule) {
            diagnostics.push({
              code: rule.code,
              rule,
              message: rule.message,
              severity: rule.severity,
              tagName: token.tagName,
              tagStart: token.tagStart,
              tagEnd: token.tagEnd,
            })
          }
        }
      }

      if (isWidget) {
        const inSection = tagStack.some(t => t.tagName === 'b:section')
        if (!inSection) {
          const rule = this.getDiagnostic('BX1034')
          if (rule) {
            diagnostics.push({
              code: rule.code,
              rule,
              message: rule.message,
              severity: rule.severity,
              tagName: token.tagName,
              tagStart: token.tagStart,
              tagEnd: token.tagEnd,
            })
          }
        }
      }

      if (isIncludable) {
        const validContainer = tagStack.some(t => t.tagName === 'b:widget' || t.tagName === 'b:defaultmarkup')
        if (!validContainer) {
          const rule = this.getDiagnostic('BX1023')
          if (rule) {
            diagnostics.push({
              code: rule.code,
              rule,
              message: `<b:includable> must be placed inside <b:widget> or <b:defaultmarkup>.`,
              severity: rule.severity,
              tagName: token.tagName,
              tagStart: token.tagStart,
              tagEnd: token.tagEnd,
            })
          }
        }
      }

      if (parentToken && !isSection && !isWidget && this.isDirective(parentToken.tagName) && this.isDirective(token.tagName)) {
        const nestingRule = this.validateDirectiveNesting(parentToken.tagName, token.tagName)
        if (nestingRule && nestingRule.code !== 'BX1034' && nestingRule.code !== 'BX1035') {
          diagnostics.push({
            code: nestingRule.code,
            rule: nestingRule,
            message: `Tag <${token.tagName}> is not permitted inside <${parentToken.tagName}>.`,
            severity: nestingRule.severity,
            tagName: token.tagName,
            tagStart: token.tagStart,
            tagEnd: token.tagEnd,
          })
        }
      }

      // 2. Duplicate element ID across template for <b:section> and <b:widget>
      if (isSection || isWidget) {
        const idAttr = token.attributes.id
        if (idAttr) {
          const idVal = idAttr.value.trim()
          if (!idVal) {
            const rule = this.getDiagnostic('BX1039')
            if (rule) {
              diagnostics.push({
                code: rule.code,
                rule,
                message: `Element <${token.tagName}> has an empty 'id' attribute.`,
                severity: rule.severity,
                tagName: token.tagName,
                tagStart: idAttr.start,
                tagEnd: idAttr.end,
              })
            }
          }
          else if (globalSectionWidgetIds.has(idVal)) {
            const rule = this.getDiagnostic('BX1033')
            if (rule) {
              diagnostics.push({
                code: rule.code,
                rule,
                message: `Duplicate element identifier '${idVal}' detected. Blogger requires all <b:section> and <b:widget> elements to have unique 'id' attributes.`,
                severity: rule.severity,
                tagName: token.tagName,
                tagStart: idAttr.start,
                tagEnd: idAttr.end,
              })
            }
          }
          else {
            globalSectionWidgetIds.set(idVal, token)
          }
        }
      }

      // 3. Duplicate <b:includable id="..."> within container
      if (isIncludable) {
        let container: BloggerDirectiveToken | undefined
        for (let i = tagStack.length - 1; i >= 0; i--) {
          if (tagStack[i]!.tagName === 'b:widget' || tagStack[i]!.tagName === 'b:defaultmarkup') {
            container = tagStack[i]
            break
          }
        }

        const idAttr = token.attributes.id
        if (idAttr) {
          const idVal = idAttr.value.trim()
          if (!idVal) {
            const rule = this.getDiagnostic('BX1039')
            if (rule) {
              diagnostics.push({
                code: rule.code,
                rule,
                message: `<b:includable> requires a non-empty 'id' attribute.`,
                severity: rule.severity,
                tagName: token.tagName,
                tagStart: idAttr.start,
                tagEnd: idAttr.end,
              })
            }
          }
          else if (container) {
            let idSet = containerIncludableIds.get(container)
            if (!idSet) {
              idSet = new Set()
              containerIncludableIds.set(container, idSet)
            }
            if (idSet.has(idVal)) {
              const rule = this.getDiagnostic('BX1036')
              if (rule) {
                diagnostics.push({
                  code: rule.code,
                  rule,
                  message: `Duplicate includable identifier '${idVal}' in <${container.tagName}>.`,
                  severity: rule.severity,
                  tagName: token.tagName,
                  tagStart: idAttr.start,
                  tagEnd: idAttr.end,
                })
              }
            }
            else {
              idSet.add(idVal)
            }
          }
        }
      }

      // 4. Validate <Variable type="..."> attributes
      if (token.tagName === 'Variable') {
        const typeAttr = token.attributes.type
        if (typeAttr && typeAttr.value) {
          const varType = typeAttr.value.toLowerCase()
          const presentAttrs = Object.keys(token.attributes)
          const varValidation = this.validateVariableAttributes(varType, presentAttrs)
          if (!varValidation.valid && varValidation.invalidAttributes.length > 0) {
            const rule = this.getDiagnostic('BX1040')
            if (rule) {
              diagnostics.push({
                code: rule.code,
                rule,
                message: `Attribute(s) '${varValidation.invalidAttributes.join(', ')}' not supported for <Variable type="${varType}">.`,
                severity: rule.severity,
                tagName: token.tagName,
                tagStart: token.tagStart,
                tagEnd: token.tagEnd,
              })
            }
          }
        }
      }

      if (!token.isSelfClosing) {
        tagStack.push(token)
      }
    }

    return diagnostics
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
