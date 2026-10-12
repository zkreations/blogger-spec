/**
 * Shared TypeScript types for Blogger Specification models, catalogs, and test fixtures.
 */

export type BloggerEvidenceLevel = 'official' | 'observed' | 'approximate' | 'unknown'

export type BloggerDiagnosticCategory
  = | 'hallucination'
    | 'syntax'
    | 'expressions'
    | 'quota'
    | 'structure'
    | 'deprecation'
    | 'runtime'

export type BloggerDiagnosticSeverity = 'error' | 'warning' | 'info'

export type BloggerDiagnosticCode = string
export type BloggerDirectiveName = string
export type BloggerOperatorName = string

export interface BloggerDiagnosticRule {
  code: string
  name: string
  category: BloggerDiagnosticCategory
  severity: BloggerDiagnosticSeverity
  message: string
  replacement?: string
  evidence: BloggerEvidenceLevel
  verifiedAt: string
}

export interface BloggerOperatorOperand {
  name: string
  types: string[]
  required: boolean
  description?: string
}

export interface BloggerOperatorOverload {
  signature: string
  description?: string
  operands: BloggerOperatorOperand[]
  return_type: string
}

export interface BloggerOperatorSyntax {
  supports_infix: boolean
  supports_functional: boolean
  functional_identifier: string | null
  variadic: boolean
  infix?: string | null
  functional?: string | null
}

export interface BloggerOperatorDefinition {
  name?: string
  family: string
  description: string
  syntax: BloggerOperatorSyntax
  precedence_level: number
  operands: BloggerOperatorOperand[]
  return_type: string
  aliases?: string[]
  overloads?: BloggerOperatorOverload[]
  examples?: Array<{
    expression: string
    result: string
    description: string
  }>
}

export interface BloggerDirectiveAttribute {
  type?: string
  attribute_kind?: 'native_expression' | 'prefixed_expression' | 'static_literal'
  description?: string
  required?: boolean
  expr?: boolean
  allowed_values?: any[]
}

export interface BloggerDirectiveDefinition {
  category: string
  namespace: string
  description: string
  closure_mode?: 'self_closing' | 'container' | 'dual'
  self_closing?: boolean
  grammar?: {
    valid_parents?: string[]
    valid_children?: string[]
  }
  attributes?: Record<string, BloggerDirectiveAttribute>
  deprecated_attributes?: Record<string, any>
  constraints?: Record<string, any>
}

export interface BloggerFixture {
  id: string
  title: string
  evidence: BloggerEvidenceLevel
  verifiedAt: string
  covers: string[]
  input: {
    kind: 'expression' | 'template'
    source: string
    mode?: 'fragment' | 'full_document'
    context?: Record<string, any>
  }
  expected: {
    outcome: 'value' | 'html' | 'rejected'
    value?: any
    html?: string
    canonicalDom?: boolean
    diagnosticCodes?: string[]
    stage?: 'parser' | 'compiler' | 'quota' | 'linter'
  }
}

export interface BloggerFixturesManifest {
  version: string
  generatedAt: string
  metrics: {
    totalFixtures: number
    positiveFixtures: number
    negativeFixtures: number
    coveredSpecEntities: number
  }
  fixtures: BloggerFixture[]
}

export interface BloggerDirectivesCatalog {
  $schema?: string
  version?: string
  title?: string
  description?: string
  directives: Record<string, BloggerDirectiveDefinition>
  domain_metadata?: Record<string, any>
  [key: string]: any
}

export interface BloggerPrecedenceHierarchyLevel {
  level: number
  category: string
  associativity: string
  operators: string[]
}

export interface BloggerOperatorsCatalog {
  $schema?: string
  version?: string
  title?: string
  description?: string
  precedence_hierarchy?: BloggerPrecedenceHierarchyLevel[]
  operators: Record<string, BloggerOperatorDefinition>
  families?: Record<string, any>
  evaluation_contexts?: Record<string, any>
  [key: string]: any
}

export interface BloggerDiagnosticsCatalog {
  $schema?: string
  version?: string
  rules: Record<string, BloggerDiagnosticRule>
}

export interface BloggerTypeModifierDefinition {
  description: string
  output_type: string
  syntax: string
  direct_syntax?: string
  expr_syntax?: string
  example?: string
  [key: string]: any
}

export interface BloggerTypeDefinition {
  category: 'base' | 'subtype' | 'skin' | 'collection' | 'meta'
  description: string
  parent_type: string | null
  user_constructible: boolean
  ts_type: string
  item_type?: string
  parameterized_forms?: string[]
  skin_metadata?: Record<string, any>
  modifiers: Record<string, BloggerTypeModifierDefinition>
  [key: string]: any
}

export interface BloggerTypesCatalog {
  $schema?: string
  version?: string
  title?: string
  description?: string
  coercion_rules?: Record<string, any>
  truthiness_matrix?: {
    truthy: string[]
    falsy: string[]
  }
  types: Record<string, BloggerTypeDefinition>
  modifiers?: Record<string, any>
  [key: string]: any
}

export interface BloggerGlobalsCatalog {
  $schema?: string
  version?: string
  objects: Record<string, any>
  [key: string]: any
}

export interface BloggerWidgetsCatalog {
  $schema?: string
  version?: string
  widgets: Record<string, any>
  [key: string]: any
}

export interface BloggerSettingsCatalog {
  $schema?: string
  version?: string
  settings?: Record<string, any>
  [key: string]: any
}

export interface BloggerMessagesCatalog {
  $schema?: string
  version?: string
  messages?: Record<string, any>
  [key: string]: any
}

export interface BloggerScopesCatalog {
  $schema?: string
  version?: string
  scopes?: Record<string, any>
  [key: string]: any
}

export type BloggerInclusionCategory = 'universal' | 'common' | 'icon' | 'theme' | 'deprecated'

export interface BloggerInclusionDefinition {
  name: string
  category: BloggerInclusionCategory
  description: string
  evidence: BloggerEvidenceLevel
  verifiedAt: string
  deprecated?: boolean
  deprecation_note?: string
  layouts_versions?: number[]
  widget_version?: number
  target_widgets?: string[]
}

export interface BloggerInclusionsCatalog {
  $schema?: string
  title?: string
  description?: string
  super_prefix_rule: {
    prefix: string
    description: string
    behavior: string
  }
  inclusions: Record<string, BloggerInclusionDefinition>
  [key: string]: any
}

export type BloggerCatalogName
  = | 'directives'
    | 'operators'
    | 'types'
    | 'widgets'
    | 'settings'
    | 'globals'
    | 'messages'
    | 'scopes'
    | 'diagnostics'
    | 'inclusions'

export interface BloggerCatalogMap {
  directives: BloggerDirectivesCatalog
  operators: BloggerOperatorsCatalog
  types: BloggerTypesCatalog
  widgets: BloggerWidgetsCatalog
  settings: BloggerSettingsCatalog
  globals: BloggerGlobalsCatalog
  messages: BloggerMessagesCatalog
  scopes: BloggerScopesCatalog
  diagnostics: BloggerDiagnosticsCatalog
  inclusions: BloggerInclusionsCatalog
}

export interface BloggerEngineAdapter {
  evaluateExpression?: (expr: string, context?: Record<string, any>) => any
  renderTemplate?: (template: string, context?: Record<string, any>) => string
  analyze?: (source: string, mode: 'expression' | 'template') => Array<{ code: string }>
}

export type SpecConsumerAdapter = BloggerEngineAdapter

export interface ConformanceFilter {
  kind?: 'expression' | 'template'
  covers?: string[]
  evidence?: BloggerEvidenceLevel[]
  ids?: string[]
}

export interface ConformanceOptions {
  fixtures?: BloggerFixture[] | BloggerFixturesManifest
  filter?: ConformanceFilter
  normalizeHtml?: (html?: string) => string
}

export interface ConformanceCaseResult {
  id: string
  passed: boolean
  message?: string
  expected: any
  actual?: any
}

export interface ConformanceReport {
  total: number
  passed: number
  failed: number
  skipped: number
  results: ConformanceCaseResult[]
}

export interface BloggerExpressionToken {
  value: string
  tokenType: string
  tokensConsumed: number
  pos: number
}

export interface BloggerExpressionTokenInfo {
  value: string
  tokenType: string
  tokensConsumed: number
}

export type BloggerExpressionBudgetStatus = 'SAFE' | 'WARNING' | 'EXCEEDED'

export interface BloggerExpressionBudgetResult {
  expression: string
  totalTokens: number
  isValid: boolean
  status: BloggerExpressionBudgetStatus
  tokenStream: BloggerExpressionTokenInfo[]
  recommendation: string
}
