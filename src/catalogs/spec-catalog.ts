import type {
  BloggerCompilerLimits,
  BloggerCompilerQuotas,
  BloggerDiagnosticCode,
  BloggerDiagnosticRule,
  BloggerDiagnosticsCatalog,
  BloggerDirectiveAttribute,
  BloggerDirectiveAttributeToken,
  BloggerDirectiveDefinition,
  BloggerDirectiveName,
  BloggerDirectivesCatalog,
  BloggerDirectiveToken,
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
  BloggerPrecedenceHierarchyLevel,
  BloggerScopeDefinition,
  BloggerScopesCatalog,
  BloggerStandardDiagnosticKey,
  BloggerStandardDiagnostics,
  BloggerTypeDefinition,
  BloggerTypesCatalog,
  BloggerWidgetDefinition,
  BloggerWidgetsCatalog,
  BloggerWidgetSettingsDefinition,
  BloggerWidgetType,
  DirectiveAttributesValidationResult,
  DirectiveAttributeViolation,
  DirectiveNestingAction,
  DirectiveNestingViolation,
  HallucinatedDirectiveConfig,
  VariableAttributesValidationResult,
} from '../types.js'
import type { CatalogStore } from './store.js'
import {
  BLOGGER_BOOLEAN_VALUES,
  isBloggerBoolean,
} from '../types.js'
import { getDefaultCatalogStore, registerCacheResetListener } from './store.js'

export type DirectiveAttributesValidationTarget
  = | BloggerDirectiveToken
    | { tagName: string, attributes: Record<string, BloggerDirectiveAttributeToken | { value?: string }> | string[] }

export interface DirectiveSnippetOptions {
  readonly selfClosing?: boolean
  readonly indent?: string
  readonly quote?: '\'' | '"'
}

export interface OperatorSnippetOptions {
  readonly syntax?: 'functional' | 'infix'
}

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
  target: string | DirectiveAttributesValidationTarget,
  attributesOrCatalog?: string[] | Record<string, BloggerDirectiveAttributeToken | { value?: string }> | SpecCatalog,
  catalog: SpecCatalog = getSpecCatalog(),
): DirectiveAttributesValidationResult {
  if (typeof target !== 'string') {
    const spec = (attributesOrCatalog && typeof attributesOrCatalog === 'object' && 'validateDirectiveAttributes' in attributesOrCatalog)
      ? (attributesOrCatalog as SpecCatalog)
      : catalog
    return spec.validateDirectiveAttributes(target)
  }
  return catalog.validateDirectiveAttributes(target, attributesOrCatalog as any)
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
export {
  BLOGGER_BOOLEAN_VALUES,
  isBloggerBoolean,
}

export class SpecCatalog {
  private readonly store: CatalogStore
  private readonly directiveMap = new Map<string, BloggerDirectiveDefinition>()
  private readonly operatorMap = new Map<string, BloggerOperatorDefinition>()
  private readonly grammarOperatorMap = new Map<string, BloggerOperatorDefinition>()
  private readonly docAliasMap = new Map<string, BloggerOperatorDefinition>()
  private precedenceHierarchy: BloggerPrecedenceHierarchyLevel[] = []
  private readonly levelBindingPowerMap = new Map<number, number>()
  private readonly operatorBindingPowerMap = new Map<string, number>()
  private readonly operatorAssociativityMap = new Map<string, 'left-to-right' | 'right-to-left' | 'inner-to-outer' | 'non-associative'>()
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
  private readonly hallucinatedDirectives = new Map<string, BloggerDiagnosticCode>()
  private readonly hallucinatedDirectiveTransforms = new Map<string, HallucinatedDirectiveConfig>()
  private readonly invertedAttributeMaps = new Map<string, string>()
  private readonly standardDiagnostics = new Map<BloggerStandardDiagnosticKey, BloggerDiagnosticCode>()
  private readonly scalarTypes: string[] = []
  private readonly falsyStringLiterals = new Set<string>()
  private readonly truthyStringLiterals = new Set<string>()
  private readonly htmlVoidElements = new Set<string>()
  private superPrefix = 'super.'

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

    const hallucinated = dirCatalog.domain_metadata?.hallucinated_directives || {}
    for (const [tag, code] of Object.entries(hallucinated)) {
      this.hallucinatedDirectives.set(tag.toLowerCase(), code as BloggerDiagnosticCode)
    }

    const transforms = (dirCatalog.domain_metadata as any)?.hallucinated_directive_transforms || {}
    for (const [code, config] of Object.entries(transforms)) {
      this.hallucinatedDirectiveTransforms.set(code, config as HallucinatedDirectiveConfig)
    }

    const inverted = (dirCatalog.domain_metadata as any)?.inverted_attribute_maps || {}
    for (const [code, attr] of Object.entries(inverted)) {
      this.invertedAttributeMaps.set(code, attr as string)
    }

    const stdDiags = (dirCatalog.domain_metadata?.standard_diagnostics as Record<string, string>) || {}
    for (const [key, code] of Object.entries(stdDiags)) {
      this.standardDiagnostics.set(key as BloggerStandardDiagnosticKey, code as BloggerDiagnosticCode)
    }

    const voidElements = (dirCatalog.domain_metadata?.html_void_elements as string[]) || []
    for (const el of voidElements) {
      this.htmlVoidElements.add(el.toLowerCase())
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
    if (allowedSet.has(lower)) {
      return true
    }
    if (!this.isDirective(tag) && lower !== 'head' && lower !== 'html' && lower !== 'body' && allowedSet.has('html:*')) {
      return true
    }
    return false
  }

  private indexOperators(): void {
    const operatorsCatalog = this.store.getCatalog('operators') as BloggerOperatorsCatalog
    const hierarchy = operatorsCatalog.domain_metadata?.precedence_hierarchy || []
    this.precedenceHierarchy = hierarchy

    const maxLevel = hierarchy.length > 0 ? Math.max(...hierarchy.map((h: BloggerPrecedenceHierarchyLevel) => h.level)) : 10

    for (const item of hierarchy) {
      const bp = (maxLevel + 1 - item.level) * 10
      this.levelBindingPowerMap.set(item.level, bp)

      if (Array.isArray(item.operators)) {
        for (const op of item.operators) {
          if (item.associativity) {
            this.operatorAssociativityMap.set(op, item.associativity as any)
            this.operatorAssociativityMap.set(op.toLowerCase(), item.associativity as any)
          }
        }
      }
    }

    const operators = operatorsCatalog.operators || {}
    for (const [op, def] of Object.entries(operators)) {
      this.operatorMap.set(op, def)
      this.grammarOperatorMap.set(op, def)
      this.grammarOperatorMap.set(op.toLowerCase(), def)

      const level = def.precedence_level
      if (level !== undefined) {
        const bp = this.levelBindingPowerMap.get(level) ?? (maxLevel + 1 - level) * 10
        this.operatorBindingPowerMap.set(op, bp)
        this.operatorBindingPowerMap.set(op.toLowerCase(), bp)

        if (op === '? :') {
          this.operatorBindingPowerMap.set('?', bp)
        }
      }

      if (Array.isArray(def.grammar_aliases)) {
        for (const alias of def.grammar_aliases) {
          this.grammarOperatorMap.set(alias, def)
          this.grammarOperatorMap.set(alias.toLowerCase(), def)

          const bp = this.operatorBindingPowerMap.get(op)
          if (bp !== undefined) {
            this.operatorBindingPowerMap.set(alias, bp)
            this.operatorBindingPowerMap.set(alias.toLowerCase(), bp)
          }

          const assoc = this.operatorAssociativityMap.get(op)
          if (assoc) {
            this.operatorAssociativityMap.set(alias, assoc)
            this.operatorAssociativityMap.set(alias.toLowerCase(), assoc)
          }
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
      this.diagnosticMap.set(code, { ...rule, code: (rule.code ?? code) as BloggerDiagnosticCode })
    }
  }

  private indexWidgets(): void {
    const widgets = (this.store.getCatalog('widgets') as BloggerWidgetsCatalog).widgets || {}
    for (const [name, def] of Object.entries(widgets)) {
      this.widgetMap.set(name, def)
    }
  }

  private indexSettings(): void {
    const settings = (this.store.getCatalog('settings') as any)?.widgets || {}
    for (const [name, def] of Object.entries(settings)) {
      this.settingMap.set(name, def as any)
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
      this.messageMap.set(key, { ...def, type: def.type ?? 'message' })
    }
  }

  private indexScopes(): void {
    const scopesData = this.store.getCatalog('scopes') as BloggerScopesCatalog
    const precedence = scopesData.domain_metadata?.resolution_precedence
    if (Array.isArray(precedence)) {
      this.scopeOrder.push(...precedence)
    }
    const scopes = scopesData.scopes || {}
    for (const [name, def] of Object.entries(scopes)) {
      this.scopeMap.set(name, def)
    }
  }

  private indexTypes(): void {
    const typesData = this.store.getCatalog('types') as BloggerTypesCatalog
    const meta = typesData.domain_metadata
    if (meta?.coercion_rules) {
      Object.assign(this.coercionRules, meta.coercion_rules)
    }
    if (Array.isArray(meta?.scalar_types)) {
      this.scalarTypes.push(...meta.scalar_types)
    }
    if (meta?.truthiness_matrix?.falsy_string_literals) {
      for (const s of meta.truthiness_matrix.falsy_string_literals) {
        this.falsyStringLiterals.add(s.toLowerCase())
      }
    }
    if (meta?.truthiness_matrix?.truthy_string_literals) {
      for (const s of meta.truthiness_matrix.truthy_string_literals) {
        this.truthyStringLiterals.add(s.toLowerCase())
      }
    }
    const types = typesData.types || {}
    for (const [name, def] of Object.entries(types)) {
      this.typeMap.set(name, def)
    }
  }

  private indexInclusions(): void {
    const inclusionsData = this.store.getCatalog('inclusions') as BloggerInclusionsCatalog
    const prefix = inclusionsData.domain_metadata?.super_prefix_rule?.prefix
    if (!prefix) {
      throw new Error('Missing domain_metadata.super_prefix_rule.prefix in inclusions catalog')
    }
    this.superPrefix = prefix
    for (const [name, def] of Object.entries(inclusionsData.inclusions || {})) {
      this.inclusionMap.set(name, { ...def, name: def.name ?? name })
    }
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
    return Boolean(def?.closure_mode === 'self_closing' || (def as any)?.self_closing === true)
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

    const defaultProhibitedCode = this.getStandardDiagnostic('prohibited_nesting')
    let diagCode = defaultProhibitedCode
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

    const rule = this.getDiagnostic(diagCode)
      ?? this.getDiagnostic(defaultProhibitedCode)
      ?? {
        code: diagCode,
        name: `Nesting Diagnostic ${diagCode}`,
        category: 'syntax',
        severity: 'error',
        message: `Tag <${childTag}> is not permitted inside <${parentTag}>.`,
        evidence: 'unknown',
        verified_at: '2026-01-01',
      }

    let message = rule.message
    if (rule.code === defaultProhibitedCode) {
      message = `Tag <${childTag}> is not permitted inside <${parentTag}>.`
    }

    return {
      code: (rule.code ?? diagCode) as BloggerDiagnosticCode,
      rule,
      action,
      message,
    }
  }

  canBeAtRoot(tagName: string): boolean {
    const def = this.getDirective(tagName)
    if (!def) {
      return true
    }
    const validParents = def.grammar?.valid_parents
    if (!validParents) {
      return true
    }
    return validParents.some(p => p.startsWith('@') || p === 'body' || p === 'head' || p === 'html:*')
  }

  getDirectiveAttributes(tagName: string): Record<string, BloggerDirectiveAttribute> | undefined {
    return this.getDirective(tagName)?.attributes
  }

  validateDirectiveAttributes(
    target: string | DirectiveAttributesValidationTarget,
    attributesOrCatalog?: string[] | Record<string, BloggerDirectiveAttributeToken | { value?: string }> | SpecCatalog,
  ): DirectiveAttributesValidationResult {
    let tagName: string
    let attributesRecord: Record<string, { value?: string, start?: number, end?: number, valueStart?: number, valueEnd?: number }> = {}
    let presentAttributes: string[] = []

    if (typeof target === 'string') {
      tagName = target
      if (Array.isArray(attributesOrCatalog)) {
        presentAttributes = []
        for (const attr of attributesOrCatalog) {
          const eqIdx = attr.indexOf('=')
          if (eqIdx !== -1) {
            const attrName = attr.slice(0, eqIdx).trim()
            const val = attr.slice(eqIdx + 1).replace(/^["']|["']$/g, '').trim()
            attributesRecord[attrName] = { value: val }
            presentAttributes.push(attrName)
          }
          else {
            attributesRecord[attr] = {}
            presentAttributes.push(attr)
          }
        }
      }
      else if (attributesOrCatalog && typeof attributesOrCatalog === 'object' && !('getAllDirectives' in attributesOrCatalog)) {
        attributesRecord = attributesOrCatalog as any
        presentAttributes = Object.keys(attributesRecord)
      }
    }
    else {
      tagName = target.tagName
      if (Array.isArray(target.attributes)) {
        presentAttributes = []
        for (const attr of target.attributes) {
          const eqIdx = attr.indexOf('=')
          if (eqIdx !== -1) {
            const attrName = attr.slice(0, eqIdx).trim()
            const val = attr.slice(eqIdx + 1).replace(/^["']|["']$/g, '').trim()
            attributesRecord[attrName] = { value: val }
            presentAttributes.push(attrName)
          }
          else {
            attributesRecord[attr] = {}
            presentAttributes.push(attr)
          }
        }
      }
      else if (target.attributes && typeof target.attributes === 'object') {
        attributesRecord = target.attributes as any
        presentAttributes = Object.keys(attributesRecord)
      }
    }

    for (const [k, v] of Object.entries(attributesRecord as Record<string, any>)) {
      if (typeof v === 'string') {
        attributesRecord[k] = { value: v }
      }
    }

    const directive = this.getDirective(tagName)
    if (!directive) {
      return {
        valid: false,
        missingRequired: [],
        unknown: presentAttributes,
        deprecated: [],
        invalidExpressions: [],
        inverted: [],
        disallowedValues: [],
        violations: presentAttributes.map(attr => ({
          attribute: attr,
          code: 'BX1025' as BloggerDiagnosticCode,
          message: `Unknown directive <${tagName}>.`,
          ...attributesRecord[attr],
        })),
      }
    }

    const allowedAttrs = directive.attributes || {}
    const deprecatedMap = directive.deprecated_attributes || {}
    const allowsArbitrary = Boolean(directive.grammar?.arbitrary_attributes)

    const unknown: string[] = []
    const deprecated: DirectiveAttributesValidationResult['deprecated'] = []
    const invalidExpressions: string[] = []
    const inverted: DirectiveAttributesValidationResult['inverted'] = []
    const disallowedValues: DirectiveAttributesValidationResult['disallowedValues'] = []
    const violations: DirectiveAttributeViolation[] = []

    const inversions = directive.attribute_inversions || {}
    for (const [invAttr, invDef] of Object.entries(inversions)) {
      const expectedAttr = invDef.expected
      const hasInv = presentAttributes.includes(invAttr)
      const hasExpected = presentAttributes.includes(expectedAttr) || presentAttributes.includes(`expr:${expectedAttr}`)
      if (hasInv && !hasExpected) {
        const tokenInfo = attributesRecord[invAttr]
        const invCode = invDef.diagnostic as BloggerDiagnosticCode
        inverted.push({
          code: invCode,
          attribute: invAttr,
          expected: expectedAttr,
          start: tokenInfo?.start,
          end: tokenInfo?.end,
          valueStart: tokenInfo?.valueStart,
          valueEnd: tokenInfo?.valueEnd,
        })
        violations.push({
          attribute: invAttr,
          code: invCode,
          message: `Attribute '${invAttr}' is inverted; expected '${expectedAttr}' on <${tagName}>.`,
          ...tokenInfo,
        })
      }
    }

    for (const attr of presentAttributes) {
      const hasExpr = attr.startsWith('expr:')
      const canonicalAttr = hasExpr ? attr.slice(5) : attr
      const tokenInfo = attributesRecord[attr]

      if (deprecatedMap[canonicalAttr]) {
        const depMeta = deprecatedMap[canonicalAttr]!
        deprecated.push({
          name: attr,
          reason: depMeta.reason,
          replacement: depMeta.replacement,
          start: tokenInfo?.start,
          end: tokenInfo?.end,
          valueStart: tokenInfo?.valueStart,
          valueEnd: tokenInfo?.valueEnd,
        })
        violations.push({
          attribute: attr,
          code: 'BX1024' as BloggerDiagnosticCode,
          message: `Attribute '${attr}' on <${tagName}> is deprecated. ${depMeta.reason || ''}`.trim(),
          ...tokenInfo,
        })
      }
      else if (allowedAttrs[canonicalAttr]) {
        const meta = allowedAttrs[canonicalAttr]!
        if (hasExpr && (meta.expr === false || meta.attribute_kind === 'static_literal')) {
          invalidExpressions.push(attr)
          violations.push({
            attribute: attr,
            code: 'BX1042' as BloggerDiagnosticCode,
            message: `Attribute '${attr}' on <${tagName}> does not support expressions.`,
            ...tokenInfo,
          })
        }
        else if (!hasExpr && meta.attribute_kind !== 'native_expression') {
          const isBooleanAttr = meta.type === 'boolean'
          const allowedValues = meta.allowed_values ?? (isBooleanAttr ? BLOGGER_BOOLEAN_VALUES : undefined)

          if (allowedValues && Array.isArray(allowedValues)) {
            const val = tokenInfo?.value
            if (val !== undefined && val !== '') {
              const isAllowed = isBooleanAttr
                ? allowedValues.some(a => a.toLowerCase() === val.toLowerCase())
                : allowedValues.includes(val)

              if (!isAllowed) {
                disallowedValues.push({
                  attribute: attr,
                  value: val,
                  allowed: allowedValues,
                  start: tokenInfo?.start,
                  end: tokenInfo?.end,
                  valueStart: tokenInfo?.valueStart,
                  valueEnd: tokenInfo?.valueEnd,
                })
                const disallowedCode = (this.standardDiagnostics.get('disallowed_attribute_value') ?? 'BX1043') as BloggerDiagnosticCode
                violations.push({
                  attribute: attr,
                  code: disallowedCode,
                  message: `Value '${val}' is not allowed for attribute '${attr}' on <${tagName}>. Allowed values: ${allowedValues.join(', ')}.`,
                  ...tokenInfo,
                })
              }
            }
          }
        }
      }
      else if (inverted.some(inv => inv.attribute === canonicalAttr)) {
        // Handled as specific inverted diagnostic
      }
      else if (!allowsArbitrary) {
        unknown.push(attr)
        violations.push({
          attribute: attr,
          code: 'BX1025' as BloggerDiagnosticCode,
          message: `Unknown attribute '${attr}' on <${tagName}>.`,
          ...tokenInfo,
        })
      }
    }

    const rawTypeVal = attributesRecord.type?.value
    const subTypeValue = typeof rawTypeVal === 'string' ? rawTypeVal.trim().toLowerCase() : undefined
    const subtypeMeta = (directive.type_attributes && subTypeValue)
      ? directive.type_attributes[subTypeValue]
      : undefined

    const missingRequired: string[] = []
    const requiredAttrsToCheck = subtypeMeta?.required
      ? subtypeMeta.required
      : Object.entries(allowedAttrs).filter(([_, meta]) => meta.required).map(([name]) => name)

    for (const attrName of requiredAttrsToCheck) {
      if (inverted.some(inv => inv.expected === attrName)) {
        continue
      }

      const meta = allowedAttrs[attrName]
      const hasLiteral = presentAttributes.includes(attrName)
      const allowsExpr = meta ? (meta.expr !== false && meta.attribute_kind !== 'static_literal') : false
      const hasExpr = allowsExpr && presentAttributes.includes(`expr:${attrName}`)

      if (!hasLiteral && !hasExpr) {
        missingRequired.push(attrName)
        violations.push({
          attribute: attrName,
          code: 'BX1022' as BloggerDiagnosticCode,
          message: `Mandatory attribute '${attrName}' is missing on <${tagName}>.`,
        })
      }
    }

    return {
      valid: missingRequired.length === 0
        && unknown.length === 0
        && invalidExpressions.length === 0
        && inverted.length === 0
        && disallowedValues.length === 0,
      missingRequired,
      unknown,
      deprecated,
      invalidExpressions,
      inverted,
      disallowedValues,
      violations,
    }
  }

  getThemeDesignerDescriptions(): readonly string[] {
    const typesCatalog = this.store.getCatalog('types') as BloggerTypesCatalog
    return (typesCatalog.domain_metadata?.theme_designer_descriptions as string[]) ?? []
  }

  getLayoutVersions(): BloggerLayoutVersionsCatalog | undefined {
    const directivesCatalog = this.store.getCatalog('directives') as BloggerDirectivesCatalog
    return directivesCatalog.domain_metadata?.layout_versions
  }

  getHtmlVoidElements(): ReadonlySet<string> {
    return this.htmlVoidElements
  }

  getCdataDirectives(): readonly string[] {
    const skinDef = this.getDirective('b:skin')
    const cdataChildren = skinDef?.grammar?.valid_children?.filter(c => c !== 'CDATA') ?? []
    return cdataChildren.length > 0 ? cdataChildren : ['Variable', 'Group']
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

  getPrecedenceHierarchy(): readonly BloggerPrecedenceHierarchyLevel[] {
    return this.precedenceHierarchy
  }

  getLevelBindingPower(level: number): number | undefined {
    return this.levelBindingPowerMap.get(level)
  }

  getOperatorBindingPower(op: string): number | undefined {
    return this.operatorBindingPowerMap.get(op) ?? this.operatorBindingPowerMap.get(op.toLowerCase())
  }

  isLogicalOperator(op: string): boolean {
    const def = this.getOperator(op)
    return def?.family === 'logical'
  }

  isRightAssociativeOperator(op: string): boolean {
    const assoc = this.operatorAssociativityMap.get(op) ?? this.operatorAssociativityMap.get(op.toLowerCase())
    if (assoc) {
      return assoc === 'right-to-left'
    }
    const def = this.getOperator(op)
    if (def?.precedence_level !== undefined) {
      const levelItem = this.precedenceHierarchy.find(h => h.level === def.precedence_level)
      return levelItem?.associativity === 'right-to-left'
    }
    return false
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

  getWidgetData(name: string): BloggerWidgetDefinition['canonical'] | undefined {
    return this.widgetMap.get(name)?.canonical
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
    if (this.typeMap.has(name)) {
      return true
    }
    if (name.startsWith('array[') && name.endsWith(']')) {
      return this.isType(name.slice(6, -1))
    }
    return false
  }

  getType(name: string): BloggerTypeDefinition | undefined {
    const direct = this.typeMap.get(name)
    if (direct) {
      return direct
    }
    if (name.startsWith('array[') && name.endsWith(']')) {
      const itemType = name.slice(6, -1)
      if (this.isType(itemType)) {
        return {
          category: 'collection',
          description: `Ordered collection composed of ${itemType} values.`,
          item_type: itemType,
          parent_type: 'array',
          user_constructible: true,
          ts_type: `${itemType}[]`,
          modifiers: {},
          evidence: 'official',
          verified_at: '2026-10-10',
        }
      }
    }
    return undefined
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
    if (name.startsWith(this.superPrefix)) {
      return true
    }
    return this.inclusionMap.has(name)
  }

  getSuperPrefix(): string {
    return this.superPrefix
  }

  getCompilerLimits(): BloggerCompilerLimits | undefined {
    const dirCatalog = this.store.getCatalog('directives') as BloggerDirectivesCatalog
    return dirCatalog.domain_metadata?.compiler_limits
  }

  getDirectiveNestingLimit(): number {
    const limit = this.getCompilerLimits()?.max_directive_nesting_depth
    if (limit === undefined) {
      throw new Error('Missing compiler_limits.max_directive_nesting_depth in directives catalog')
    }
    return limit
  }

  getCompilerQuotas(): BloggerCompilerQuotas | undefined {
    const opCatalog = this.store.getCatalog('operators') as BloggerOperatorsCatalog
    return opCatalog.domain_metadata?.evaluation_contexts?.compiler_quotas
  }

  getExpressionQuotaLimit(): number {
    const limit = this.getCompilerQuotas()?.max_expression_tokens
    if (limit === undefined) {
      throw new Error('Missing compiler_quotas.max_expression_tokens in operators catalog')
    }
    return limit
  }

  getExpressionQuotaWarning(): number {
    const warning = this.getCompilerQuotas()?.warning_expression_tokens
    if (warning === undefined) {
      throw new Error('Missing compiler_quotas.warning_expression_tokens in operators catalog')
    }
    return warning
  }

  getExpressionQuotaDiagnostic(): BloggerDiagnosticCode | undefined {
    return this.getCompilerQuotas()?.diagnostic
  }

  getExpressionQuotaWarningDiagnostic(): BloggerDiagnosticCode | undefined {
    return this.getCompilerQuotas()?.warning_diagnostic
  }

  getLambdaKeywords(): ReadonlySet<string> {
    const result = new Set<string>()
    for (const [opKey, opDef] of this.operatorMap.entries()) {
      if (opDef.family === 'lambda') {
        result.add(opKey)
        for (const alias of opDef.grammar_aliases || []) {
          result.add(alias)
        }
      }
    }
    return result
  }

  getHallucinatedDirectives(): ReadonlyMap<string, BloggerDiagnosticCode> {
    return this.hallucinatedDirectives
  }

  isHallucinatedDirective(tagName: string): boolean {
    return this.hallucinatedDirectives.has(tagName.toLowerCase())
  }

  getHallucinatedDirectiveDiagnostic(tagName: string): BloggerDiagnosticCode | undefined {
    return this.hallucinatedDirectives.get(tagName.toLowerCase())
  }

  getHallucinatedDirectiveTransform(code: string): HallucinatedDirectiveConfig | undefined {
    return this.hallucinatedDirectiveTransforms.get(code)
  }

  getInvertedAttribute(code: string): string | undefined {
    return this.invertedAttributeMaps.get(code)
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

  getScalarTypes(): readonly string[] {
    if (this.scalarTypes.length === 0) {
      throw new Error('Missing scalar_types in types catalog')
    }
    return this.scalarTypes
  }

  getFalsyStringLiterals(): ReadonlySet<string> {
    return this.falsyStringLiterals
  }

  getTruthyStringLiterals(): ReadonlySet<string> {
    return this.truthyStringLiterals
  }

  isTruthy(value: any): boolean {
    if (value === null || value === undefined) {
      return false
    }
    if (typeof value === 'boolean') {
      return value
    }
    if (typeof value === 'number') {
      return !Number.isNaN(value)
    }
    if (typeof value === 'string') {
      const trimmed = value.trim().toLowerCase()
      if (this.falsyStringLiterals.has(trimmed)) {
        return false
      }
      if (this.truthyStringLiterals.has(trimmed)) {
        return true
      }
      return true
    }
    if (Array.isArray(value)) {
      return value.length > 0
    }
    if (typeof value === 'object') {
      return Object.keys(value).length > 0
    }
    return Boolean(value)
  }

  getStandardDiagnostics(): Readonly<BloggerStandardDiagnostics> {
    const result: any = {}
    for (const [k, v] of this.standardDiagnostics.entries()) {
      result[k] = v
    }
    return result
  }

  getStandardDiagnostic(key: BloggerStandardDiagnosticKey): BloggerDiagnosticCode {
    const code = this.standardDiagnostics.get(key)
    if (!code) {
      throw new Error(`Standard diagnostic '${key}' is not defined in directives catalog domain_metadata.standard_diagnostics`)
    }
    return code
  }

  isDirectiveExpressionAttribute(tagName: string, attrName: string): boolean {
    if (attrName.startsWith('expr:')) {
      return true
    }
    const def = this.getDirective(tagName)
    const attrDef = def?.attributes?.[attrName]
    return Boolean(attrDef?.attribute_kind === 'native_expression' || attrDef?.type === 'expression')
  }

  getDirectiveSnippet(tagName: string, options?: DirectiveSnippetOptions): string {
    const def = this.getDirective(tagName)
    if (!def) {
      return `<${tagName}>$0</${tagName}>`
    }

    const attrs = def.attributes || {}
    const requiredAttrNames = Object.keys(attrs).filter(attrName => attrs[attrName]?.required)

    let tabstopIndex = 1
    const attrSnippets: string[] = []

    const isThemeDesignerVar = tagName === 'Variable' || tagName === 'Group'
    const quote = options?.quote ?? (isThemeDesignerVar ? '"' : '\'')

    for (const attrName of requiredAttrNames) {
      let placeholder = attrName
      if (attrName === 'values') {
        placeholder = 'data:items'
      }
      else if (attrName === 'var') {
        placeholder = tagName === 'b:switch' ? 'data:view.type' : 'item'
      }
      else if (attrName === 'cond') {
        placeholder = 'data:condition'
      }
      else if (attrName === 'expr') {
        placeholder = 'data:expression'
      }
      else if (attrName === 'value') {
        placeholder = tagName === 'b:case' ? 'item' : 'value'
      }
      else if (attrName === 'name') {
        placeholder = 'name'
      }
      else if (attrName === 'id') {
        placeholder = 'id'
      }
      else if (attrName === 'type') {
        placeholder = 'type'
      }

      attrSnippets.push(`${attrName}=${quote}\${${tabstopIndex++}:${placeholder}}${quote}`)
    }

    const attrsString = attrSnippets.length > 0 ? ` ${attrSnippets.join(' ')}` : ''
    const isSelfClosing = options?.selfClosing ?? (def.closure_mode === 'self_closing')
    const indent = options?.indent ?? '  '

    if (isSelfClosing) {
      return `<${tagName}${attrsString}/>$0`
    }

    return `<${tagName}${attrsString}>\n${indent}$0\n</${tagName}>`
  }

  getOperatorSnippet(operatorName: string, options?: OperatorSnippetOptions): string {
    const op = this.getOperator(operatorName)
    if (!op) {
      return `${operatorName}($0)`
    }

    const isSymbolic = !/^[a-z_]/i.test(operatorName)
    const preferredSyntax = options?.syntax
      ?? (op.operands?.length === 1
        ? 'prefix'
        : (op.syntax?.supports_functional && !isSymbolic ? 'functional' : (op.syntax?.supports_infix ? 'infix' : 'functional')))

    if (preferredSyntax === 'functional' && op.syntax?.supports_functional) {
      const fnName = op.syntax.functional_identifier ?? operatorName
      const operands = op.operands || []
      let tabstopIndex = 1
      const args = operands.map(o => `\${${tabstopIndex++}:${o.name}}`)
      return `${fnName}(${args.join(', ')})$0`
    }

    if (op.family === 'lambda') {
      const collectionName = op.operands?.[0]?.name ?? 'items'
      const varName = 'item'
      const condition = 'condition'
      return `\${1:${collectionName}} ${operatorName} (\${2:${varName}} => \${3:${condition}})$0`
    }

    if (op.operands && op.operands.length === 1) {
      const operandName = op.operands[0]?.name ?? 'expression'
      const sep = /^[a-z]/i.test(operatorName) ? ' ' : ''
      return `${operatorName}${sep}\${1:${operandName}}$0`
    }

    const left = op.operands?.[0]?.name ?? 'left'
    const right = op.operands?.[1]?.name ?? 'right'
    return `\${1:${left}} ${operatorName} \${2:${right}}$0`
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

export function canBeAtRoot(tagName: string, catalog: SpecCatalog = getSpecCatalog()): boolean {
  return catalog.canBeAtRoot(tagName)
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

export function getPrecedenceHierarchy(catalog: SpecCatalog = getSpecCatalog()): readonly BloggerPrecedenceHierarchyLevel[] {
  return catalog.getPrecedenceHierarchy()
}

export function getLevelBindingPower(level: number, catalog: SpecCatalog = getSpecCatalog()): number | undefined {
  return catalog.getLevelBindingPower(level)
}

export function getOperatorBindingPower(op: string, catalog: SpecCatalog = getSpecCatalog()): number | undefined {
  return catalog.getOperatorBindingPower(op)
}

export function isLogicalOperator(op: string, catalog: SpecCatalog = getSpecCatalog()): boolean {
  return catalog.isLogicalOperator(op)
}

export function isRightAssociativeOperator(op: string, catalog: SpecCatalog = getSpecCatalog()): boolean {
  return catalog.isRightAssociativeOperator(op)
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

export function getSuperPrefix(catalog: SpecCatalog = getSpecCatalog()): string {
  return catalog.getSuperPrefix()
}

export function getCompilerLimits(catalog: SpecCatalog = getSpecCatalog()): BloggerCompilerLimits | undefined {
  return catalog.getCompilerLimits()
}

export function getDirectiveNestingLimit(catalog: SpecCatalog = getSpecCatalog()): number {
  return catalog.getDirectiveNestingLimit()
}

export function getCompilerQuotas(catalog: SpecCatalog = getSpecCatalog()): BloggerCompilerQuotas | undefined {
  return catalog.getCompilerQuotas()
}

export function getExpressionQuotaLimit(catalog: SpecCatalog = getSpecCatalog()): number {
  return catalog.getExpressionQuotaLimit()
}

export function getExpressionQuotaWarning(catalog: SpecCatalog = getSpecCatalog()): number {
  return catalog.getExpressionQuotaWarning()
}

export function getExpressionQuotaDiagnostic(catalog: SpecCatalog = getSpecCatalog()): BloggerDiagnosticCode | undefined {
  return catalog.getExpressionQuotaDiagnostic()
}

export function getExpressionQuotaWarningDiagnostic(catalog: SpecCatalog = getSpecCatalog()): BloggerDiagnosticCode | undefined {
  return catalog.getExpressionQuotaWarningDiagnostic()
}

export function getLambdaKeywords(catalog: SpecCatalog = getSpecCatalog()): ReadonlySet<string> {
  return catalog.getLambdaKeywords()
}

export function getHallucinatedDirectives(catalog: SpecCatalog = getSpecCatalog()): ReadonlyMap<string, BloggerDiagnosticCode> {
  return catalog.getHallucinatedDirectives()
}

export function isHallucinatedDirective(tagName: string, catalog: SpecCatalog = getSpecCatalog()): boolean {
  return catalog.isHallucinatedDirective(tagName)
}

export function getHallucinatedDirectiveDiagnostic(tagName: string, catalog: SpecCatalog = getSpecCatalog()): BloggerDiagnosticCode | undefined {
  return catalog.getHallucinatedDirectiveDiagnostic(tagName)
}

export function getHallucinatedDirectiveTransform(code: string, catalog: SpecCatalog = getSpecCatalog()): HallucinatedDirectiveConfig | undefined {
  return catalog.getHallucinatedDirectiveTransform(code)
}

export function getInvertedAttribute(code: string, catalog: SpecCatalog = getSpecCatalog()): string | undefined {
  return catalog.getInvertedAttribute(code)
}

export function getScalarTypes(catalog: SpecCatalog = getSpecCatalog()): readonly string[] {
  return catalog.getScalarTypes()
}

export function getFalsyStringLiterals(catalog: SpecCatalog = getSpecCatalog()): ReadonlySet<string> {
  return catalog.getFalsyStringLiterals()
}

export function getTruthyStringLiterals(catalog: SpecCatalog = getSpecCatalog()): ReadonlySet<string> {
  return catalog.getTruthyStringLiterals()
}

export function getStandardDiagnostics(catalog: SpecCatalog = getSpecCatalog()): Readonly<BloggerStandardDiagnostics> {
  return catalog.getStandardDiagnostics()
}

export function getStandardDiagnostic(
  key: BloggerStandardDiagnosticKey,
  catalog: SpecCatalog = getSpecCatalog(),
): BloggerDiagnosticCode {
  return catalog.getStandardDiagnostic(key)
}

export function isDirectiveExpressionAttribute(
  tagName: string,
  attrName: string,
  catalog: SpecCatalog = getSpecCatalog(),
): boolean {
  return catalog.isDirectiveExpressionAttribute(tagName, attrName)
}

export function getHtmlVoidElements(catalog: SpecCatalog = getSpecCatalog()): ReadonlySet<string> {
  return catalog.getHtmlVoidElements()
}

export function getCdataDirectives(catalog: SpecCatalog = getSpecCatalog()): readonly string[] {
  return catalog.getCdataDirectives()
}

export function getDirectiveSnippet(
  tagName: string,
  options?: DirectiveSnippetOptions,
  catalog: SpecCatalog = getSpecCatalog(),
): string {
  return catalog.getDirectiveSnippet(tagName, options)
}

export function getOperatorSnippet(
  operatorName: string,
  options?: OperatorSnippetOptions,
  catalog: SpecCatalog = getSpecCatalog(),
): string {
  return catalog.getOperatorSnippet(operatorName, options)
}
