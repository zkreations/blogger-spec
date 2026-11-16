import type {
  BloggerDiagnosticCode,
  BloggerDirectiveDefinition,
  BloggerScopeDefinition,
  BloggerScopesCatalog,
  BloggerTypeDefinition,
  BloggerTypesCatalog,
  BloggerVariableAttributesValidationResult,
} from '../../types.js'
import type { CatalogStore } from '../store.js'

export interface TypeDirectiveResolver {
  getDirective: (tagName: string) => BloggerDirectiveDefinition | undefined
}

export class TypeCatalogService {
  private readonly typeMap = new Map<string, BloggerTypeDefinition>()
  private readonly scopeMap = new Map<string, BloggerScopeDefinition>()
  private readonly scopeOrder: string[] = []
  private readonly coercionRules: Record<string, any> = {}
  private readonly scalarTypes: string[] = []
  private readonly falsyStringLiterals = new Set<string>()
  private readonly truthyStringLiterals = new Set<string>()

  constructor(
    private readonly store: CatalogStore,
    private readonly directives?: TypeDirectiveResolver,
  ) {
    this.index()
  }

  private index(): void {
    const scopesData = this.store.getCatalog('scopes') as BloggerScopesCatalog
    const precedence = scopesData?.domain_metadata?.resolution_precedence
    if (Array.isArray(precedence)) {
      this.scopeOrder.push(...precedence)
    }
    const scopes = scopesData?.scopes || {}
    for (const [name, def] of Object.entries(scopes)) {
      this.scopeMap.set(name, def)
    }

    const typesData = this.store.getCatalog('types') as BloggerTypesCatalog
    const meta = typesData?.domain_metadata
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
    const types = typesData?.types || {}
    for (const [name, def] of Object.entries(types)) {
      this.typeMap.set(name, def)
    }
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
    if (Object.prototype.toString.call(value) === '[object String]' || (typeof value === 'object' && value !== null && Boolean((value as any)[Symbol.for('blogger-spec.skin-value')]))) {
      value = String(value)
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

  getExpressionDiagnostic(key: 'prohibited_null_literal' | 'string_boolean_in_expression'): BloggerDiagnosticCode {
    const typesData = this.store.getCatalog('types') as any
    const code = typesData?.domain_metadata?.expression_diagnostics?.[key]
    if (!code) {
      throw new Error(`Expression diagnostic '${key}' is not defined in types catalog domain_metadata.expression_diagnostics`)
    }
    return code
  }

  getThemeDesignerDescriptions(): readonly string[] {
    const typesCatalog = this.store.getCatalog('types') as BloggerTypesCatalog
    return (typesCatalog?.domain_metadata?.theme_designer_descriptions as string[]) ?? []
  }

  getCdataDirectives(): readonly string[] {
    const skinDef = this.directives?.getDirective('b:skin')
    const cdataChildren = skinDef?.grammar?.valid_children?.filter(c => c !== 'CDATA') ?? []
    return cdataChildren.length > 0 ? cdataChildren : ['Variable', 'Group']
  }

  getVariableTypeAttributes(): Record<string, { allowed: string[], required?: string[] }> | undefined
  getVariableTypeAttributes(type: string): { allowed: string[], required?: string[] } | undefined
  getVariableTypeAttributes(type?: string): { allowed: string[], required?: string[] } | Record<string, { allowed: string[], required?: string[] }> | undefined {
    const varDef = this.directives?.getDirective('Variable')
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
  ): BloggerVariableAttributesValidationResult {
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
}
