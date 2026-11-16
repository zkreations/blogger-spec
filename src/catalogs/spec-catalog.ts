import type {
  BloggerCompilerLimits,
  BloggerCompilerQuotas,
  BloggerDiagnosticCode,
  BloggerDiagnosticRule,
  BloggerDirectiveAttribute,
  BloggerDirectiveAttributesValidationResult,
  BloggerDirectiveAttributeToken,
  BloggerDirectiveDefinition,
  BloggerDirectiveName,
  BloggerDirectiveNestingViolation,
  BloggerDomMutationPipelineCatalog,
  BloggerGlobalObjectDefinition,
  BloggerHallucinatedDirectiveConfig,
  BloggerIncludableResolutionHierarchy,
  BloggerInclusionDefinition,
  BloggerInclusionDiagnosticKey,
  BloggerLayoutVersionsCatalog,
  BloggerLocaleRecord,
  BloggerMessageDefinition,
  BloggerMessageDiagnosticKey,
  BloggerOperatorDefinition,
  BloggerOperatorName,
  BloggerPrecedenceHierarchyLevel,
  BloggerRenderPipelineCatalog,
  BloggerRootAttributesCatalog,
  BloggerRuntimeEvaluationState,
  BloggerScopeDefinition,
  BloggerSkinCompilationCatalog,
  BloggerStandardDiagnosticKey,
  BloggerStandardDiagnostics,
  BloggerSuperDelegationRule,
  BloggerTypeDefinition,
  BloggerVariableAttributesValidationResult,
  BloggerViewId,
  BloggerViewMatrixEntry,
  BloggerWidgetDefinition,
  BloggerWidgetSettingsDefinition,
  BloggerWidgetType,
} from '../types.js'
import type {
  BuildBlogNavMessageOptions,
  DirectiveAttributesValidationTarget,
  DirectiveSnippetOptions,
  OperatorSnippetOptions,
} from './services/index.js'
import type { CatalogStore } from './store.js'
import {
  BLOGGER_BOOLEAN_VALUES,
  isBloggerBoolean,
} from '../types.js'
import {
  DiagnosticCatalogService,
  DirectiveCatalogService,
  LocaleCatalogService,
  OperatorCatalogService,
  TypeCatalogService,
  WidgetCatalogService,
} from './services/index.js'
import {
  embeddedContexts,
  getDefaultCatalogStore,
  registerCacheResetListener,
} from './store.js'

export type {
  BloggerDirectiveAttributesValidationResult,
  BloggerVariableAttributesValidationResult,
  BuildBlogNavMessageOptions,
  DirectiveAttributesValidationTarget,
  DirectiveSnippetOptions,
  OperatorSnippetOptions,
}

export {
  BLOGGER_BOOLEAN_VALUES,
  isBloggerBoolean,
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

export class SpecCatalog {
  readonly store: CatalogStore
  readonly diagnostics: DiagnosticCatalogService
  readonly directives: DirectiveCatalogService
  readonly operators: OperatorCatalogService
  readonly widgets: WidgetCatalogService
  readonly types: TypeCatalogService
  readonly locales: LocaleCatalogService

  constructor(store: CatalogStore = getDefaultCatalogStore()) {
    this.store = store
    this.diagnostics = new DiagnosticCatalogService(this.store)
    this.directives = new DirectiveCatalogService(this.store, this.diagnostics)
    this.operators = new OperatorCatalogService(this.store)
    this.widgets = new WidgetCatalogService(this.store)
    this.types = new TypeCatalogService(this.store, this.directives)
    this.locales = new LocaleCatalogService(this.store, this.widgets)
  }

  // --- Directives Domain ---
  isDirective(tagName: string): tagName is BloggerDirectiveName {
    return this.directives.isDirective(tagName)
  }

  getDirective(tagName: string): BloggerDirectiveDefinition | undefined {
    return this.directives.getDirective(tagName)
  }

  getAllDirectives(): Record<string, BloggerDirectiveDefinition> {
    return this.directives.getAllDirectives()
  }

  isSelfClosingDirective(tagName: string): boolean {
    return this.directives.isSelfClosingDirective(tagName)
  }

  canNest(parentTag: string, childTag: string): boolean {
    return this.directives.canNest(parentTag, childTag)
  }

  validateDirectiveNesting(parentTag: string, childTag: string): BloggerDirectiveNestingViolation | null {
    return this.directives.validateDirectiveNesting(parentTag, childTag)
  }

  canBeAtRoot(tagName: string): boolean {
    return this.directives.canBeAtRoot(tagName)
  }

  getDirectiveAttributes(tagName: string): Record<string, BloggerDirectiveAttribute> | undefined {
    return this.directives.getDirectiveAttributes(tagName)
  }

  validateDirectiveAttributes(
    target: string | DirectiveAttributesValidationTarget,
    attributesOrCatalog?: string[] | Record<string, BloggerDirectiveAttributeToken | { value?: string }> | any,
  ): BloggerDirectiveAttributesValidationResult {
    return this.directives.validateDirectiveAttributes(target, attributesOrCatalog)
  }

  getLayoutVersions(): BloggerLayoutVersionsCatalog | undefined {
    return this.directives.getLayoutVersions()
  }

  getRootAttributes(): BloggerRootAttributesCatalog | undefined {
    return this.directives.getRootAttributes()
  }

  getIncludableResolutionHierarchy(): BloggerIncludableResolutionHierarchy | undefined {
    return this.directives.getIncludableResolutionHierarchy()
  }

  getDomMutationPipeline(): BloggerDomMutationPipelineCatalog | undefined {
    return this.directives.getDomMutationPipeline()
  }

  getSkinCompilation(): BloggerSkinCompilationCatalog | undefined {
    return this.directives.getSkinCompilation()
  }

  getRenderPipeline(): BloggerRenderPipelineCatalog | undefined {
    return this.directives.getRenderPipeline()
  }

  getHtmlVoidElements(): ReadonlySet<string> {
    return this.directives.getHtmlVoidElements()
  }

  getCompilerLimits(): BloggerCompilerLimits | undefined {
    return this.directives.getCompilerLimits()
  }

  getDirectiveNestingLimit(): number {
    return this.directives.getDirectiveNestingLimit()
  }

  getIncludeRecursionLimit(): number {
    return this.directives.getIncludeRecursionLimit()
  }

  getHallucinatedDirectives(): ReadonlyMap<string, BloggerDiagnosticCode> {
    return this.directives.getHallucinatedDirectives()
  }

  isHallucinatedDirective(tagName: string): boolean {
    return this.directives.isHallucinatedDirective(tagName)
  }

  getHallucinatedDirectiveDiagnostic(tagName: string): BloggerDiagnosticCode | undefined {
    return this.directives.getHallucinatedDirectiveDiagnostic(tagName)
  }

  getHallucinatedDirectiveTransform(code: string): BloggerHallucinatedDirectiveConfig | undefined {
    return this.directives.getHallucinatedDirectiveTransform(code)
  }

  getInvertedAttribute(code: string): string | undefined {
    return this.directives.getInvertedAttribute(code)
  }

  isDirectiveExpressionAttribute(tagName: string, attrName: string): boolean {
    return this.directives.isDirectiveExpressionAttribute(tagName, attrName)
  }

  getDirectiveSnippet(tagName: string, options?: DirectiveSnippetOptions): string {
    return this.directives.getDirectiveSnippet(tagName, options)
  }

  // --- Operators Domain ---
  isOperator(op: string): op is BloggerOperatorName {
    return this.operators.isOperator(op)
  }

  isGrammarOperator(op: string): boolean {
    return this.operators.isGrammarOperator(op)
  }

  isDocAlias(alias: string): boolean {
    return this.operators.isDocAlias(alias)
  }

  getOperator(op: string): BloggerOperatorDefinition | undefined {
    return this.operators.getOperator(op)
  }

  isFunctionalOperator(op: string): boolean {
    return this.operators.isFunctionalOperator(op)
  }

  getAllOperators(): Record<string, BloggerOperatorDefinition> {
    return this.operators.getAllOperators()
  }

  getGrammarOperators(): Record<string, BloggerOperatorDefinition> {
    return this.operators.getGrammarOperators()
  }

  getOperatorPrecedence(op: string): number | undefined {
    return this.operators.getOperatorPrecedence(op)
  }

  getPrecedenceHierarchy(): readonly BloggerPrecedenceHierarchyLevel[] {
    return this.operators.getPrecedenceHierarchy()
  }

  getLevelBindingPower(level: number): number | undefined {
    return this.operators.getLevelBindingPower(level)
  }

  getOperatorBindingPower(op: string): number | undefined {
    return this.operators.getOperatorBindingPower(op)
  }

  isLogicalOperator(op: string): boolean {
    return this.operators.isLogicalOperator(op)
  }

  isRightAssociativeOperator(op: string): boolean {
    return this.operators.isRightAssociativeOperator(op)
  }

  getCompilerQuotas(): BloggerCompilerQuotas | undefined {
    return this.operators.getCompilerQuotas()
  }

  getExpressionQuotaLimit(): number {
    return this.operators.getExpressionQuotaLimit()
  }

  getExpressionQuotaWarning(): number {
    return this.operators.getExpressionQuotaWarning()
  }

  getExpressionQuotaDiagnostic(): BloggerDiagnosticCode | undefined {
    return this.operators.getExpressionQuotaDiagnostic()
  }

  getExpressionQuotaWarningDiagnostic(): BloggerDiagnosticCode | undefined {
    return this.operators.getExpressionQuotaWarningDiagnostic()
  }

  getLambdaKeywords(): ReadonlySet<string> {
    return this.operators.getLambdaKeywords()
  }

  getProhibitedSyntaxDiagnostic(key: 'js_methods' | 'js_equality_operators'): BloggerDiagnosticCode {
    return this.operators.getProhibitedSyntaxDiagnostic(key)
  }

  getOperatorSnippet(operatorName: string, options?: OperatorSnippetOptions): string {
    return this.operators.getOperatorSnippet(operatorName, options)
  }

  // --- Widgets & Settings & Globals Domain ---
  isWidget(name: string): name is BloggerWidgetType {
    return this.widgets.isWidget(name)
  }

  getWidget(name: string): BloggerWidgetDefinition | undefined {
    return this.widgets.getWidget(name)
  }

  getWidgetData(name: string): BloggerWidgetDefinition['canonical'] | undefined {
    return this.widgets.getWidgetData(name)
  }

  getCommonWidget(): BloggerWidgetDefinition | undefined {
    return this.widgets.getCommonWidget()
  }

  getAllWidgets(): Record<string, BloggerWidgetDefinition> {
    return this.widgets.getAllWidgets()
  }

  getWidgetSettings(widgetName: string): BloggerWidgetSettingsDefinition | undefined {
    return this.widgets.getWidgetSettings(widgetName)
  }

  getBlogPagination(): BloggerWidgetSettingsDefinition['pagination'] {
    return this.widgets.getBlogPagination()
  }

  getBlogSnippets(): BloggerWidgetSettingsDefinition['snippets'] {
    return this.widgets.getBlogSnippets()
  }

  getAllWidgetSettings(): Record<string, BloggerWidgetSettingsDefinition> {
    return this.widgets.getAllWidgetSettings()
  }

  isGlobal(name: string): boolean {
    return this.widgets.isGlobal(name)
  }

  getGlobal(name: string): BloggerGlobalObjectDefinition | undefined {
    return this.widgets.getGlobal(name)
  }

  getAllGlobals(): Record<string, BloggerGlobalObjectDefinition> {
    return this.widgets.getAllGlobals()
  }

  getViewsMatrix(): Readonly<Record<BloggerViewId, BloggerViewMatrixEntry>> {
    return this.widgets.getViewsMatrix()
  }

  getViewMatrixEntry(viewId: BloggerViewId): BloggerViewMatrixEntry | undefined {
    return this.widgets.getViewMatrixEntry(viewId)
  }

  getRuntimeEvaluationStates(): Readonly<Record<string, BloggerRuntimeEvaluationState>> {
    return this.widgets.getRuntimeEvaluationStates()
  }

  isServerInclusion(name: string): boolean {
    return this.widgets.isServerInclusion(name)
  }

  getSuperPrefix(): string {
    return this.widgets.getSuperPrefix()
  }

  getInclusion(name: string): BloggerInclusionDefinition | undefined {
    return this.widgets.getInclusion(name)
  }

  getAllInclusions(): Record<string, BloggerInclusionDefinition> {
    return this.widgets.getAllInclusions()
  }

  isUniversalInclusion(name: string): boolean {
    return this.widgets.isUniversalInclusion(name)
  }

  isPortableInclusion(name: string): boolean {
    return this.widgets.isPortableInclusion(name)
  }

  isThemeBoundInclusion(name: string): boolean {
    return this.widgets.isThemeBoundInclusion(name)
  }

  getInclusionMarkup(name: string): string | undefined {
    return this.widgets.getInclusionMarkup(name)
  }

  getSuperDelegationRule(): BloggerSuperDelegationRule | undefined {
    return this.widgets.getSuperDelegationRule()
  }

  getWidgetDefaultInclusions(widgetType: string): readonly string[] {
    return this.widgets.getWidgetDefaultInclusions(widgetType)
  }

  isValidSuperInclusion(widgetType: string, subroutineName: string): boolean {
    return this.widgets.isValidSuperInclusion(widgetType, subroutineName)
  }

  getAllWidgetDefaultInclusions(): Record<string, string[]> {
    return this.widgets.getAllWidgetDefaultInclusions()
  }

  getInclusionDiagnostic(key: BloggerInclusionDiagnosticKey): BloggerDiagnosticCode {
    return this.widgets.getInclusionDiagnostic(key)
  }

  // --- Diagnostics Domain ---
  isDiagnosticCode(code: string): code is BloggerDiagnosticCode {
    return this.diagnostics.isDiagnosticCode(code)
  }

  getDiagnostic(code: string): BloggerDiagnosticRule | undefined {
    return this.diagnostics.getDiagnostic(code)
  }

  getAllDiagnostics(): Record<string, BloggerDiagnosticRule> {
    return this.diagnostics.getAllDiagnostics()
  }

  getDiagnosticByName(name: string): { code: BloggerDiagnosticCode, rule: BloggerDiagnosticRule } | undefined {
    return this.diagnostics.getDiagnosticByName(name)
  }

  getDiagnosticCodeByName(name: string): BloggerDiagnosticCode {
    return this.diagnostics.getDiagnosticCodeByName(name)
  }

  getStandardDiagnostics(): Readonly<BloggerStandardDiagnostics> {
    return this.diagnostics.getStandardDiagnostics()
  }

  getStandardDiagnostic(key: BloggerStandardDiagnosticKey): BloggerDiagnosticCode {
    return this.diagnostics.getStandardDiagnostic(key)
  }

  // --- Types & Scopes Domain ---
  isScope(name: string): boolean {
    return this.types.isScope(name)
  }

  getScope(name: string): BloggerScopeDefinition | undefined {
    return this.types.getScope(name)
  }

  getAllScopes(): Record<string, BloggerScopeDefinition> {
    return this.types.getAllScopes()
  }

  getScopePrecedence(): string[] {
    return this.types.getScopePrecedence()
  }

  isType(name: string): boolean {
    return this.types.isType(name)
  }

  getType(name: string): BloggerTypeDefinition | undefined {
    return this.types.getType(name)
  }

  getAllTypes(): Record<string, BloggerTypeDefinition> {
    return this.types.getAllTypes()
  }

  getCoercionRules(): Record<string, any> {
    return this.types.getCoercionRules()
  }

  getScalarTypes(): readonly string[] {
    return this.types.getScalarTypes()
  }

  getFalsyStringLiterals(): ReadonlySet<string> {
    return this.types.getFalsyStringLiterals()
  }

  getTruthyStringLiterals(): ReadonlySet<string> {
    return this.types.getTruthyStringLiterals()
  }

  isTruthy(value: any): boolean {
    return this.types.isTruthy(value)
  }

  getExpressionDiagnostic(key: 'prohibited_null_literal' | 'string_boolean_in_expression'): BloggerDiagnosticCode {
    return this.types.getExpressionDiagnostic(key)
  }

  getThemeDesignerDescriptions(): readonly string[] {
    return this.types.getThemeDesignerDescriptions()
  }

  getCdataDirectives(): readonly string[] {
    return this.types.getCdataDirectives()
  }

  getVariableTypeAttributes(): Record<string, { allowed: string[], required?: string[] }> | undefined
  getVariableTypeAttributes(type: string): { allowed: string[], required?: string[] } | undefined
  getVariableTypeAttributes(type?: string): { allowed: string[], required?: string[] } | Record<string, { allowed: string[], required?: string[] }> | undefined {
    return type !== undefined ? this.types.getVariableTypeAttributes(type) : this.types.getVariableTypeAttributes()
  }

  validateVariableAttributes(
    variableType: string,
    presentAttributes: string[],
  ): BloggerVariableAttributesValidationResult {
    return this.types.validateVariableAttributes(variableType, presentAttributes)
  }

  // --- Locales & Messages Domain ---
  isMessage(key: string): boolean {
    return this.locales.isMessage(key)
  }

  getMessage(key: string): BloggerMessageDefinition | undefined {
    return this.locales.getMessage(key)
  }

  getAllMessages(): Record<string, BloggerMessageDefinition> {
    return this.locales.getAllMessages()
  }

  getMessageDiagnostic(key: BloggerMessageDiagnosticKey): BloggerDiagnosticCode {
    return this.locales.getMessageDiagnostic(key)
  }

  getLocale(code: string): BloggerLocaleRecord | undefined {
    return this.locales.getLocale(code)
  }

  resolveBcp47Locale(locale = 'en'): string {
    return this.locales.resolveBcp47Locale(locale)
  }

  getAllLocales(): Record<string, BloggerLocaleRecord> {
    return this.locales.getAllLocales()
  }

  getDefaultLocale(): string {
    return this.locales.getDefaultLocale()
  }

  isRTL(locale: string): boolean {
    return this.locales.isRTL(locale)
  }

  getTranslation(key: string, locale = 'en'): string | undefined {
    return this.locales.getTranslation(key, locale)
  }

  getLocalizedMessage(messageKey: string, locale = 'en'): string | undefined {
    return this.locales.getLocalizedMessage(messageKey, locale)
  }

  getAllLocalizedMessages(locale = 'en'): Record<string, string> {
    return this.locales.getAllLocalizedMessages(locale)
  }

  getWidgetNavMessage(widgetType = 'Blog', locale = 'en'): string {
    return this.locales.getWidgetNavMessage(widgetType, locale)
  }

  getWidgetDefaultTitle(widgetType: string, locale = 'en'): string {
    return this.locales.getWidgetDefaultTitle(widgetType, locale)
  }

  stripDefaultWidgetTypeSuffix(title: string, widgetType: string): string {
    return this.locales.stripDefaultWidgetTypeSuffix(title, widgetType)
  }

  buildBlogNavMessage(options: BuildBlogNavMessageOptions, locale?: string): string {
    return this.locales.buildBlogNavMessage(options, locale)
  }

  getSearchQueryResultsMessage(query: string, locale = 'en', isHtml = false): string {
    return this.locales.getSearchQueryResultsMessage(query, locale, isHtml)
  }

  getFormattedGlobalMessage(key: string, locale = 'en', params: Record<string, string> = {}): string {
    return this.locales.getFormattedGlobalMessage(key, locale, params)
  }

  getArchiveRangeMessage(year: number, month?: number, locale = 'en'): string {
    return this.locales.getArchiveRangeMessage(year, month, locale)
  }

  resolvePlural(messageKey: string, count: number, locale = 'en'): string | undefined {
    return this.locales.resolvePlural(messageKey, count, locale)
  }

  formatParameterizedMessage(
    key: string,
    params: Array<{ name?: string, value: any }>,
    locale = 'en',
  ): string {
    return this.locales.formatParameterizedMessage(key, params, locale)
  }

  getMockContext(viewId: BloggerViewId, overrides?: Record<string, any>): Record<string, any> {
    return getMockContext(viewId, overrides)
  }
}

// Module-level functions delegating to SpecCatalog instance
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

export function validateDirectiveNesting(parentTagName: string, childTagName: string, catalog: SpecCatalog = getSpecCatalog()): BloggerDirectiveNestingViolation | null {
  return catalog.validateDirectiveNesting(parentTagName, childTagName)
}

export function canBeAtRoot(tagName: string, catalog: SpecCatalog = getSpecCatalog()): boolean {
  return catalog.canBeAtRoot(tagName)
}

export function getDirectiveAttributes(tagName: string, catalog: SpecCatalog = getSpecCatalog()): Record<string, BloggerDirectiveAttribute> | undefined {
  return catalog.getDirectiveAttributes(tagName)
}

export function validateDirectiveAttributes(
  target: string | DirectiveAttributesValidationTarget,
  attributesOrCatalog?: string[] | Record<string, BloggerDirectiveAttributeToken | { value?: string }> | SpecCatalog,
  catalog: SpecCatalog = getSpecCatalog(),
): BloggerDirectiveAttributesValidationResult {
  if (typeof target !== 'string') {
    const spec = (attributesOrCatalog && typeof attributesOrCatalog === 'object' && 'validateDirectiveAttributes' in attributesOrCatalog)
      ? (attributesOrCatalog as SpecCatalog)
      : catalog
    return spec.validateDirectiveAttributes(target)
  }
  return catalog.validateDirectiveAttributes(target, attributesOrCatalog as any)
}

export function getLayoutVersions(catalog: SpecCatalog = getSpecCatalog()): BloggerLayoutVersionsCatalog | undefined {
  return catalog.getLayoutVersions()
}

export function getIncludableResolutionHierarchy(catalog: SpecCatalog = getSpecCatalog()): BloggerIncludableResolutionHierarchy | undefined {
  return catalog.getIncludableResolutionHierarchy()
}

export function getDomMutationPipeline(catalog: SpecCatalog = getSpecCatalog()): BloggerDomMutationPipelineCatalog | undefined {
  return catalog.getDomMutationPipeline()
}

export function getSkinCompilation(catalog: SpecCatalog = getSpecCatalog()): BloggerSkinCompilationCatalog | undefined {
  return catalog.getSkinCompilation()
}

export function getRenderPipeline(catalog: SpecCatalog = getSpecCatalog()): BloggerRenderPipelineCatalog | undefined {
  return catalog.getRenderPipeline()
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

export function isFunctionalOperator(op: string, catalog: SpecCatalog = getSpecCatalog()): boolean {
  return catalog.isFunctionalOperator(op)
}

export function getAllOperators(catalog: SpecCatalog = getSpecCatalog()): Record<string, BloggerOperatorDefinition> {
  return catalog.getAllOperators()
}

export function getGrammarOperators(catalog: SpecCatalog = getSpecCatalog()): Record<string, BloggerOperatorDefinition> {
  return catalog.getGrammarOperators()
}

export function getOperatorPrecedence(op: string, catalog: SpecCatalog = getSpecCatalog()): number | undefined {
  return catalog.getOperatorPrecedence(op)
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

export function getDiagnostic(code: string, catalog: SpecCatalog = getSpecCatalog()): BloggerDiagnosticRule | undefined {
  return catalog.getDiagnostic(code)
}

export function getAllDiagnostics(catalog: SpecCatalog = getSpecCatalog()): Record<string, BloggerDiagnosticRule> {
  return catalog.getAllDiagnostics()
}

export function getDiagnosticByName(name: string, catalog: SpecCatalog = getSpecCatalog()): { code: BloggerDiagnosticCode, rule: BloggerDiagnosticRule } | undefined {
  return catalog.getDiagnosticByName(name)
}

export function getDiagnosticCodeByName(name: string, catalog: SpecCatalog = getSpecCatalog()): BloggerDiagnosticCode {
  return catalog.getDiagnosticCodeByName(name)
}

export function isWidget(name: string, catalog: SpecCatalog = getSpecCatalog()): name is BloggerWidgetType {
  return catalog.isWidget(name)
}

export function getWidget(name: string, catalog: SpecCatalog = getSpecCatalog()): BloggerWidgetDefinition | undefined {
  return catalog.getWidget(name)
}

export function getCommonWidget(catalog: SpecCatalog = getSpecCatalog()): BloggerWidgetDefinition | undefined {
  return catalog.getCommonWidget()
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

export function getBlogPagination(catalog: SpecCatalog = getSpecCatalog()): BloggerWidgetSettingsDefinition['pagination'] {
  return catalog.getBlogPagination()
}

export function getBlogSnippets(catalog: SpecCatalog = getSpecCatalog()): BloggerWidgetSettingsDefinition['snippets'] {
  return catalog.getBlogSnippets()
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

export function getViewsMatrix(catalog: SpecCatalog = getSpecCatalog()): Readonly<Record<BloggerViewId, BloggerViewMatrixEntry>> {
  return catalog.getViewsMatrix()
}

export function getViewMatrixEntry(viewId: BloggerViewId, catalog: SpecCatalog = getSpecCatalog()): BloggerViewMatrixEntry | undefined {
  return catalog.getViewMatrixEntry(viewId)
}

export function getRuntimeEvaluationStates(catalog: SpecCatalog = getSpecCatalog()): Readonly<Record<string, BloggerRuntimeEvaluationState>> {
  return catalog.getRuntimeEvaluationStates()
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

export function getLocale(code: string, catalog: SpecCatalog = getSpecCatalog()): BloggerLocaleRecord | undefined {
  return catalog.getLocale(code)
}

export function getAllLocales(catalog: SpecCatalog = getSpecCatalog()): Record<string, BloggerLocaleRecord> {
  return catalog.getAllLocales()
}

export function isRTL(locale: string, catalog: SpecCatalog = getSpecCatalog()): boolean {
  return catalog.isRTL(locale)
}

export function getTranslation(key: string, locale = 'en', catalog: SpecCatalog = getSpecCatalog()): string | undefined {
  return catalog.getTranslation(key, locale)
}

export function getLocalizedMessage(messageKey: string, locale = 'en', catalog: SpecCatalog = getSpecCatalog()): string | undefined {
  return catalog.getLocalizedMessage(messageKey, locale)
}

export function getAllLocalizedMessages(locale = 'en', catalog: SpecCatalog = getSpecCatalog()): Record<string, string> {
  return catalog.getAllLocalizedMessages(locale)
}

export function resolvePlural(messageKey: string, count: number, locale = 'en', catalog: SpecCatalog = getSpecCatalog()): string | undefined {
  return catalog.resolvePlural(messageKey, count, locale)
}

export function formatParameterizedMessage(
  key: string,
  params: Array<{ name?: string, value: any }>,
  locale = 'en',
  catalog: SpecCatalog = getSpecCatalog(),
): string {
  return catalog.formatParameterizedMessage(key, params, locale)
}

export function getWidgetNavMessage(widgetType = 'Blog', locale = 'en', catalog: SpecCatalog = getSpecCatalog()): string {
  return catalog.getWidgetNavMessage(widgetType, locale)
}

export function getWidgetDefaultTitle(widgetType: string, locale = 'en', catalog: SpecCatalog = getSpecCatalog()): string {
  return catalog.getWidgetDefaultTitle(widgetType, locale)
}

export function stripDefaultWidgetTypeSuffix(title: string, widgetType: string, catalog: SpecCatalog = getSpecCatalog()): string {
  return catalog.stripDefaultWidgetTypeSuffix(title, widgetType)
}

export function buildBlogNavMessage(options: BuildBlogNavMessageOptions, locale?: string, catalog: SpecCatalog = getSpecCatalog()): string {
  return catalog.buildBlogNavMessage(options, locale)
}

export function getSearchQueryResultsMessage(query: string, locale = 'en', isHtml = false, catalog: SpecCatalog = getSpecCatalog()): string {
  return catalog.getSearchQueryResultsMessage(query, locale, isHtml)
}

export function getFormattedGlobalMessage(key: string, locale = 'en', params: Record<string, string> = {}, catalog: SpecCatalog = getSpecCatalog()): string {
  return catalog.getFormattedGlobalMessage(key, locale, params)
}

export function getArchiveRangeMessage(year: number, month?: number, locale = 'en', catalog: SpecCatalog = getSpecCatalog()): string {
  return catalog.getArchiveRangeMessage(year, month, locale)
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

export function isPortableInclusion(name: string, catalog: SpecCatalog = getSpecCatalog()): boolean {
  return catalog.isPortableInclusion(name)
}

export function isThemeBoundInclusion(name: string, catalog: SpecCatalog = getSpecCatalog()): boolean {
  return catalog.isThemeBoundInclusion(name)
}

export function getInclusionMarkup(name: string, catalog: SpecCatalog = getSpecCatalog()): string | undefined {
  return catalog.getInclusionMarkup(name)
}

export function getSuperDelegationRule(catalog: SpecCatalog = getSpecCatalog()): BloggerSuperDelegationRule | undefined {
  return catalog.getSuperDelegationRule()
}

export function getWidgetDefaultInclusions(widgetType: string, catalog: SpecCatalog = getSpecCatalog()): readonly string[] {
  return catalog.getWidgetDefaultInclusions(widgetType)
}

export function isValidSuperInclusion(widgetType: string, subroutineName: string, catalog: SpecCatalog = getSpecCatalog()): boolean {
  return catalog.isValidSuperInclusion(widgetType, subroutineName)
}

export function getAllWidgetDefaultInclusions(catalog: SpecCatalog = getSpecCatalog()): Record<string, string[]> {
  return catalog.getAllWidgetDefaultInclusions()
}

export function getInclusionDiagnostic(key: BloggerInclusionDiagnosticKey, catalog: SpecCatalog = getSpecCatalog()): BloggerDiagnosticCode {
  return catalog.getInclusionDiagnostic(key)
}

export function getMessageDiagnostic(key: BloggerMessageDiagnosticKey, catalog: SpecCatalog = getSpecCatalog()): BloggerDiagnosticCode {
  return catalog.getMessageDiagnostic(key)
}

export function getSuperPrefix(catalog: SpecCatalog = getSpecCatalog()): string {
  return catalog.getSuperPrefix()
}

export function getCompilerLimits(catalog: SpecCatalog = getSpecCatalog()): BloggerCompilerLimits | undefined {
  return catalog.getCompilerLimits()
}

export function getDefaultLocale(catalog: SpecCatalog = getSpecCatalog()): string {
  return catalog.getDefaultLocale()
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

export function getHallucinatedDirectiveTransform(code: string, catalog: SpecCatalog = getSpecCatalog()): BloggerHallucinatedDirectiveConfig | undefined {
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

export function validateVariableAttributes(
  variableType: string,
  presentAttributes: string[],
  catalog: SpecCatalog = getSpecCatalog(),
): BloggerVariableAttributesValidationResult {
  return catalog.validateVariableAttributes(variableType, presentAttributes)
}

function deepCloneAndMerge<T>(base: T, overrides?: Record<string, any>): T {
  if (base === null || typeof base !== 'object') {
    return base
  }

  if (Array.isArray(base)) {
    const clonedArr = base.map(item => deepCloneAndMerge(item)) as any
    for (const key of Object.keys(base)) {
      if (!/^\d+$/.test(key)) {
        clonedArr[key] = deepCloneAndMerge((base as any)[key])
      }
    }
    return clonedArr
  }

  const result: Record<string, any> = {}
  for (const key of Object.keys(base as any)) {
    result[key] = deepCloneAndMerge((base as any)[key])
  }

  if (overrides && typeof overrides === 'object' && !Array.isArray(overrides)) {
    for (const [key, val] of Object.entries(overrides)) {
      if (
        val !== null
        && typeof val === 'object'
        && !Array.isArray(val)
        && result[key] !== null
        && typeof result[key] === 'object'
        && !Array.isArray(result[key])
      ) {
        result[key] = deepCloneAndMerge(result[key], val)
      }
      else {
        result[key] = deepCloneAndMerge(val)
      }
    }
  }

  return result as T
}

export function getMockContext(
  viewId: BloggerViewId,
  overrides?: Record<string, any>,
): Record<string, any> {
  const base = embeddedContexts[viewId]
  if (!base) {
    throw new Error(`Unknown Blogger view ID for mock context: '${viewId}'`)
  }

  const cloned = deepCloneAndMerge(base, overrides)

  const blog1 = cloned.widgetData?.Blog1
  if (blog1 && Array.isArray(blog1.allBylineItems)) {
    for (const item of blog1.allBylineItems) {
      if (item && typeof item === 'object' && item.name) {
        blog1.allBylineItems[item.name] = item
      }
    }
  }

  return cloned
}
