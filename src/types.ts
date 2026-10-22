/**
 * Shared TypeScript types for Blogger Specification models, catalogs, and test fixtures.
 */

import type {
  BloggerDiagnosticCode,
  BloggerDiagnosticRule,
  BloggerDiagnosticSeverity,
  BloggerEvidenceLevel,
  BloggerFixture,
  BloggerFixturesManifest,
  BloggerLayoutVersion,
  BloggerOperatorDefinition,
  DirectiveNestingAction,
} from './catalogs/types.generated.js'

export type * from './catalogs/types.generated.js'

export const BLOGGER_BOOLEAN_VALUES = ['yes', 'no', 'true', 'false'] as const
export type BloggerBooleanValue = typeof BLOGGER_BOOLEAN_VALUES[number]

export function isBloggerBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return true
  }
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase()
    return lower === 'yes' || lower === 'no' || lower === 'true' || lower === 'false'
  }
  return false
}

export interface BloggerTextEdit {
  readonly start: number
  readonly end: number
  readonly newText: string
}

export interface BloggerDiagnosticFix {
  readonly title: string
  readonly isPreferred?: boolean
  readonly edits: readonly BloggerTextEdit[]
}

export interface BloggerStructureDiagnostic {
  code: BloggerDiagnosticCode
  rule: BloggerDiagnosticRule
  message: string
  severity: BloggerDiagnosticSeverity
  tagName: string
  attribute?: string
  tagStart?: number
  tagEnd?: number
  suggestedReplacement?: string
  fixes?: readonly BloggerDiagnosticFix[]
}

export interface BloggerMemberInfo {
  readonly name: string
  readonly type: string
  readonly sourceCatalog: 'globals' | 'widgets' | 'types' | 'messages' | 'variables' | 'settings'
  readonly isModifier?: boolean
  readonly isCollection?: boolean
  readonly itemType?: string
  readonly isDeprecated?: boolean
  readonly description?: string
  readonly deprecationReason?: string
  readonly replacement?: string
}

export interface BloggerCursorContext {
  readonly offset: number
  readonly expectedKind: 'member' | 'operator' | 'expression' | 'lambda_param' | 'lambda_arrow' | 'none'
  readonly leftOperand?: string
  readonly partialMember?: string
  readonly partialOperator?: string
  readonly memberChain?: readonly string[]
  readonly enclosingLambda?: {
    readonly paramName?: string
    readonly isWaitingForArrow?: boolean
    readonly isWaitingParam?: boolean
    readonly collectionOperand?: string
  }
}

export interface HallucinatedDirectiveConfig {
  readonly targetTag: string
  readonly attrMap: Readonly<Record<string, string>>
  readonly requiredAttrs?: readonly string[]
}

export interface DirectiveNestingViolation {
  code: BloggerDiagnosticCode
  rule: BloggerDiagnosticRule
  action: DirectiveNestingAction
  message: string
}

export interface DirectiveAttributeViolation {
  readonly attribute: string
  readonly code: BloggerDiagnosticCode
  readonly message: string
  readonly start?: number
  readonly end?: number
  readonly valueStart?: number
  readonly valueEnd?: number
}

export interface DirectiveAttributesValidationResult {
  readonly valid: boolean
  readonly missingRequired: string[]
  readonly unknown: string[]
  readonly deprecated: Array<{
    readonly name: string
    readonly reason?: string
    readonly replacement?: string | null
    readonly start?: number
    readonly end?: number
    readonly valueStart?: number
    readonly valueEnd?: number
  }>
  readonly invalidExpressions: string[]
  readonly inverted: Array<{
    readonly code: string
    readonly attribute: string
    readonly expected: string
    readonly start?: number
    readonly end?: number
    readonly valueStart?: number
    readonly valueEnd?: number
  }>
  readonly disallowedValues: Array<{
    readonly attribute: string
    readonly value: string
    readonly allowed: string[]
    readonly start?: number
    readonly end?: number
    readonly valueStart?: number
    readonly valueEnd?: number
  }>
  readonly violations: DirectiveAttributeViolation[]
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
