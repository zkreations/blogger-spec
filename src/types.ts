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

export type BloggerWidgetType
  = | 'AdSense'
    | 'Attribution'
    | 'BlogArchive'
    | 'BlogList'
    | 'BlogSearch'
    | 'Blog'
    | 'BloggerButton'
    | 'ContactForm'
    | 'FeaturedPost'
    | 'Feed'
    | 'Followers'
    | 'Header'
    | 'Image'
    | 'Label'
    | 'LinkList'
    | 'PageList'
    | 'PopularPosts'
    | 'Profile'
    | 'ReportAbuse'
    | 'Stats'
    | 'Subscribe'
    | 'HTML'
    | 'Text'
    | 'TextList'
    | 'Translate'
    | 'Wikipedia'

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
  associativity?: 'left-to-right' | 'right-to-left' | 'inner-to-outer' | 'non-associative'
  token_cost?: number
  operands: BloggerOperatorOperand[]
  return_type: string
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
  type_attributes?: Record<string, { allowed: string[], required?: string[] }>
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

export interface BloggerDirectivesCatalog {
  $schema?: string
  version?: string
  title?: string
  description?: string
  directives: Record<string, BloggerDirectiveDefinition>
  domain_metadata?: {
    theme_designer_descriptions?: string[]
    layout_versions?: BloggerLayoutVersionsCatalog
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
  evaluation_contexts?: Record<string, any>
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
  }
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
