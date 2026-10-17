/**
 * Shared TypeScript types for Blogger Specification models, catalogs, and test fixtures.
 */

import type {
  BloggerDiagnosticCode,
  BloggerDiagnosticRule,
  BloggerDiagnosticSeverity,
  BloggerEvidenceLevel,
  BloggerLayoutVersion,
  BloggerOperatorDefinition,
  DirectiveNestingAction,
} from './catalogs/types.generated.js'

export type * from './catalogs/types.generated.js'

export interface BloggerStructureDiagnostic {
  code: BloggerDiagnosticCode
  rule: BloggerDiagnosticRule
  message: string
  severity: BloggerDiagnosticSeverity
  tagName: string
  tagStart?: number
  tagEnd?: number
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
    replacement?: string | null
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
  catalog?: any
}

export interface BloggerFixture {
  id: string
  title: string
  evidence: BloggerEvidenceLevel
  verified_at: string
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

export interface TemplateVersionResult {
  version: BloggerLayoutVersion
  confidence: 'explicit' | 'inferred'
  detectedFeatures: string[]
  summary: string
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

export interface BloggerCompatibleOperator extends BloggerOperatorDefinition {
  name: string
}
