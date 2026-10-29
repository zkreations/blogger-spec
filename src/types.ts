/**
 * Shared TypeScript types for Blogger Specification models, catalogs, and test fixtures.
 */

import type {
  BloggerDiagnosticCode,
  BloggerDiagnosticRule,
  BloggerDiagnosticSeverity,
  BloggerDirectiveNestingAction,
  BloggerEvidenceLevel,
  BloggerFixture,
  BloggerFixturesManifest,
  BloggerLayoutVersion,
  BloggerOperatorDefinition,
  BloggerViewId,
} from './generated/types.generated.js'

export type * from './generated/types.generated.js'

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
  readonly availableInViews?: readonly BloggerViewId[]
  readonly unconfiguredState?: 'empty' | 'missing'
  readonly condition?: string
  readonly runtimeState?: 'active' | 'empty' | 'missing'
  readonly sourceConstraint?: string
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

export interface BloggerHallucinatedDirectiveConfig {
  readonly targetTag: string
  readonly attrMap: Readonly<Record<string, string>>
  readonly requiredAttrs?: readonly string[]
}

export interface BloggerDirectiveNestingViolation {
  code: BloggerDiagnosticCode
  rule: BloggerDiagnosticRule
  action: BloggerDirectiveNestingAction
  message: string
}

export interface BloggerDirectiveAttributeViolation {
  readonly attribute: string
  readonly code: BloggerDiagnosticCode
  readonly message: string
  readonly start?: number
  readonly end?: number
  readonly valueStart?: number
  readonly valueEnd?: number
}

export interface BloggerDirectiveAttributesValidationResult {
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
  readonly violations: BloggerDirectiveAttributeViolation[]
}

export interface BloggerVariableAttributesValidationResult {
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

export interface BloggerScanDirectiveOptions {
  stopAtOffset?: number
  catalog?: any
}

export interface BloggerTemplateVersionResult {
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

export interface BloggerConformanceFilter {
  kind?: 'expression' | 'template'
  covers?: string[]
  evidence?: BloggerEvidenceLevel[]
  ids?: string[]
}

export interface BloggerConformanceOptions {
  fixtures?: BloggerFixture[] | BloggerFixturesManifest
  filter?: BloggerConformanceFilter
  normalizeHtml?: (html?: string) => string
}

export interface BloggerConformanceCaseResult {
  id: string
  passed: boolean
  message?: string
  expected: any
  actual?: any
}

export interface BloggerConformanceReport {
  total: number
  passed: number
  failed: number
  skipped: number
  results: BloggerConformanceCaseResult[]
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

export type BloggerIncludableResolutionTier
  = | 'local_widget'
    | 'gadget_specific'
    | 'universal_widget'
    | 'shared_common'
    | 'platform_server'
    | 'unresolved'

export interface BloggerIncludableResolutionContext {
  targetId: string
  widgetId?: string
  widgetType?: string
  isGlobalScope?: boolean
}

export interface BloggerIncludableResolutionResult {
  targetId: string
  tier: BloggerIncludableResolutionTier
  resolved: boolean
  sourceContainer?: string
  diagnostic?: BloggerDiagnosticCode
  failureComment?: string
}

/**
 * Returns canonical error abort comment when an includable fails to resolve.
 */
export function formatGadgetAbortComment(widgetId: string): string {
  return `<!--Failed to render gadget '${widgetId}'.\n\nThere was an error processing the markup.\n-->`
}

export type BloggerMutationTargetKind = 'container' | 'html_element' | 'widget_synthetic_wrapper'

export interface BloggerMutationStackFrame {
  readonly tagName?: string
  readonly targetKind?: BloggerMutationTargetKind
  readonly classes: string[]
  readonly attributes: Record<string, string>
  readonly isVoid?: boolean
  readonly whitespaceRemove?: boolean
}

export interface BloggerDOMMutationBuffer {
  pushTarget: (tagName?: string, initialClasses?: string[], initialAttrs?: Record<string, string>) => BloggerMutationStackFrame
  popTarget: () => BloggerMutationStackFrame | undefined
  peekTarget: () => BloggerMutationStackFrame | undefined
  addClass: (className: string) => boolean
  setAttribute: (name: string, value: string) => boolean
  getDepth: () => number
  hasActiveTarget: () => boolean
}
