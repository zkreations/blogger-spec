/**
 * Shared TypeScript types for Blogger Specification models, catalogs, and test fixtures.
 */

import type {
  BloggerDiagnosticCode,
  BloggerDirectiveName,
  BloggerMessageKey,
  BloggerOperatorName,
  BloggerWidgetType,
} from './catalogs/types.generated.js'

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

export type {
  BloggerDiagnosticCode,
  BloggerDirectiveName,
  BloggerMessageKey,
  BloggerOperatorName,
  BloggerWidgetType,
}

export interface BloggerDiagnosticRule {
  code: BloggerDiagnosticCode
  name: string
  category: BloggerDiagnosticCategory
  severity: BloggerDiagnosticSeverity
  message: string
  replacement?: string
  evidence: BloggerEvidenceLevel
  verifiedAt: string
}

export interface BloggerStructureDiagnostic {
  code: BloggerDiagnosticCode
  rule: BloggerDiagnosticRule
  message: string
  severity: BloggerDiagnosticSeverity
  tagName: string
  tagStart?: number
  tagEnd?: number
}

export type DirectiveNestingAction = 'reject' | 'strip' | 'ignore'

export interface DirectiveNestingPolicyAction {
  diagnostic: BloggerDiagnosticCode
  action: DirectiveNestingAction
}

export interface DirectiveInvalidNestingPolicy {
  on_invalid_parent?: DirectiveNestingPolicyAction
  on_invalid_child?: DirectiveNestingPolicyAction & {
    exceptions?: Record<string, DirectiveNestingPolicyAction>
  }
}

export interface DirectiveNestingViolation {
  code: BloggerDiagnosticCode
  rule: BloggerDiagnosticRule
  action: DirectiveNestingAction
  message: string
}

export interface DirectiveAttributesValidationResult {
  valid: boolean
  missingRequired: string[]
  unknown: string[]
  deprecated: Array<{
    name: string
    reason?: string
    replacement?: string
  }>
  invalidExpressions: string[]
  inverted: Array<{
    code: string
    attribute: string
    expected: string
  }>
}

export interface VariableAttributesValidationResult {
  valid: boolean
  invalidAttributes: string[]
  missingAttributes: string[]
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
  associativity?: 'left-to-right' | 'right-to-left' | 'inner-to-outer' | 'non-associative'
  token_cost?: number
  operands: BloggerOperatorOperand[]
  return_type: string
  return_type_rule?: 'element_type' | 'self_or_array' | string
  grammar_aliases?: string[]
  doc_aliases?: string[]
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
  allow_empty?: boolean
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
    invalid_nesting_policy?: DirectiveInvalidNestingPolicy
    arbitrary_attributes?: boolean
  }
  attributes?: Record<string, BloggerDirectiveAttribute>
  deprecated_attributes?: Record<string, any>
  constraints?: Record<string, any>
  type_attributes?: Record<string, { allowed: string[], required?: string[] }>
  attribute_inversions?: Record<string, { expected: string, diagnostic: BloggerDiagnosticCode }>
}

export interface BloggerDirectiveAttributeToken {
  name: string
  value: string
  quote?: '"' | '\'' | undefined
  start: number
  end: number
  valueStart: number
  valueEnd: number
}

export interface BloggerDirectiveToken {
  tagName: string
  isClosing: boolean
  isSelfClosing: boolean
  hasSelfClosingSlash: boolean
  tagStart: number
  tagEnd: number
  attributesText: string
  rawAttributesText: string
  attributesOffset: number
  attributes: Record<string, BloggerDirectiveAttributeToken>
}

export interface ScanDirectiveOptions {
  stopAtOffset?: number
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

export type BloggerLayoutVersion = 1 | 2 | 3

export interface BloggerLayoutVersionDefinition {
  version: BloggerLayoutVersion
  name: string
  description: string
  structural_markers?: string[]
  prohibited_markers?: string[]
}

export interface BloggerLayoutVersionsCatalog {
  supported_versions: BloggerLayoutVersion[]
  default_version: BloggerLayoutVersion
  explicit_attributes: string[]
  versions: Record<string, BloggerLayoutVersionDefinition>
}

export interface TemplateVersionResult {
  version: BloggerLayoutVersion
  confidence: 'explicit' | 'inferred'
  detectedFeatures: string[]
  summary: string
}

export interface BloggerCompilerLimits {
  max_directive_nesting_depth: number
}

export interface BloggerCompilerQuotas {
  max_expression_tokens: number
  warning_expression_tokens: number
  token_cost_rules?: string
}

export type BloggerStandardDiagnosticKey
  = | 'missing_required_attribute'
    | 'deprecated_attribute'
    | 'empty_required_attribute'
    | 'disallowed_expression_attribute'
    | 'duplicate_element_id'
    | 'duplicate_includable_id'
    | 'invalid_variable_type_attribute'
    | 'prohibited_nesting'

export type BloggerStandardDiagnostics = Record<BloggerStandardDiagnosticKey, BloggerDiagnosticCode>

export interface BloggerDirectivesCatalog {
  $schema?: string
  version?: string
  title?: string
  description?: string
  directives: Record<string, BloggerDirectiveDefinition>
  domain_metadata?: {
    theme_designer_descriptions?: string[]
    layout_versions?: BloggerLayoutVersionsCatalog
    compiler_limits?: BloggerCompilerLimits
    hallucinated_directives?: Record<string, BloggerDiagnosticCode>
    standard_diagnostics?: BloggerStandardDiagnostics
    [key: string]: any
  }
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
  evaluation_contexts?: {
    compiler_quotas?: BloggerCompilerQuotas
    [key: string]: any
  }
  [key: string]: any
}

export interface BloggerDiagnosticsCatalog {
  $schema?: string
  version?: string
  title?: string
  description?: string
  rules: Record<string, BloggerDiagnosticRule>
  [key: string]: any
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
    falsy_string_literals?: string[]
    truthy_string_literals?: string[]
  }
  scalar_types?: string[]
  types: Record<string, BloggerTypeDefinition>
  modifiers?: Record<string, any>
  [key: string]: any
}

export interface BloggerCanonicalProperty {
  type: string
  description: string
  item_type?: string
  allowed_values?: string[]
  properties?: Record<string, BloggerCanonicalProperty>
  item_properties?: Record<string, BloggerCanonicalProperty>
  deprecated?: Record<string, any>
  [key: string]: any
}

export interface BloggerGlobalObjectDefinition {
  cardinality: 'singleton' | 'collection'
  description: string
  item_type?: string
  item_properties?: Record<string, BloggerCanonicalProperty>
  catalog_ref?: string
  canonical?: Record<string, BloggerCanonicalProperty>
  patterns?: any[]
  deprecated?: Record<string, any>
  [key: string]: any
}

export interface BloggerGlobalsCatalog {
  $schema?: string
  version?: string
  title?: string
  description?: string
  objects: Record<string, BloggerGlobalObjectDefinition>
  [key: string]: any
}

export interface BloggerWidgetDefinition {
  description: string
  canonical: Record<string, BloggerCanonicalProperty>
  deprecated?: Record<string, any>
  [key: string]: any
}

export interface BloggerWidgetsCatalog {
  $schema?: string
  version?: string
  title?: string
  description?: string
  widgets: Record<string, BloggerWidgetDefinition>
  [key: string]: any
}

export interface BloggerCanonicalSetting {
  type: string
  description: string
  default_value?: any
  allowed_values?: any[]
  properties?: Record<string, any>
  [key: string]: any
}

export interface BloggerWidgetSettingsDefinition {
  description: string
  canonical: Record<string, BloggerCanonicalSetting>
  patterns?: any[]
  deprecated?: Record<string, any>
  [key: string]: any
}

export interface BloggerSettingsCatalog {
  $schema?: string
  version?: string
  title?: string
  description?: string
  widgets: Record<string, BloggerWidgetSettingsDefinition>
  [key: string]: any
}

export interface BloggerMessageParameterDefinition {
  name: string
  description?: string
}

export interface BloggerMessageDefinition {
  type: 'message'
  description: string
  pattern?: string
  direct_invocation?: boolean
  parameters?: BloggerMessageParameterDefinition[]
  [key: string]: any
}

export interface BloggerMessagesCatalog {
  $schema?: string
  version?: string
  title?: string
  description?: string
  patterns?: any[]
  messages: Record<string, BloggerMessageDefinition>
  [key: string]: any
}

export interface BloggerScopeDefinition {
  name: string
  description: string
  boundary_tag: string | string[] | null
  inherits: boolean
  introduces: string[]
  data_prefix_required?: boolean
  visibility: 'local_only' | 'descendants' | 'global'
  shadowing: 'local-wins' | 'none'
  evidence: BloggerEvidenceLevel
  notes?: string
  [key: string]: any
}

export interface BloggerScopesCatalog {
  $schema?: string
  version?: string
  title?: string
  description?: string
  resolution_precedence?: string[]
  scopes: Record<string, BloggerScopeDefinition>
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
