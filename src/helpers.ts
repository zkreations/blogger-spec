import type { CatalogStore, DirectiveAttributesValidationResult } from './catalogs/index.js'
import type {
  BloggerDiagnosticCode,
  BloggerDiagnosticRule,
  BloggerDirectiveAttribute,
  BloggerDirectiveDefinition,
  BloggerDirectiveName,
  BloggerInclusionDefinition,
  BloggerOperatorDefinition,
  BloggerOperatorName,
} from './types.js'
import {

  getDefaultCatalogStore,
  registerCacheResetListener,
  SpecCatalog,
} from './catalogs/index.js'

export {
  type DirectiveAttributesValidationResult,
  SpecCatalog,
}

let specCatalogInstance: SpecCatalog | null = null

registerCacheResetListener(() => {
  specCatalogInstance = null
})

export function getSpecCatalog(store?: CatalogStore): SpecCatalog {
  if (store) {
    return new SpecCatalog(store)
  }
  if (!specCatalogInstance) {
    specCatalogInstance = new SpecCatalog(getDefaultCatalogStore())
  }
  return specCatalogInstance
}

export function isDirective(tagName: string): tagName is BloggerDirectiveName {
  return getSpecCatalog().isDirective(tagName)
}

export function getDirective(tagName: string): BloggerDirectiveDefinition | undefined {
  return getSpecCatalog().getDirective(tagName)
}

export function getAllDirectives(): Record<string, BloggerDirectiveDefinition> {
  return getSpecCatalog().getAllDirectives()
}

export function isSelfClosingDirective(tagName: string): boolean {
  return getSpecCatalog().isSelfClosingDirective(tagName)
}

export function isValidChild(parentTagName: string, childTagName: string): boolean {
  return getSpecCatalog().isValidChild(parentTagName, childTagName)
}

export function isValidParent(childTagName: string, parentTagName: string): boolean {
  return getSpecCatalog().isValidParent(childTagName, parentTagName)
}

export function getDirectiveAttributes(tagName: string): Record<string, BloggerDirectiveAttribute> | undefined {
  return getSpecCatalog().getDirectiveAttributes(tagName)
}

export function validateDirectiveAttributes(
  tagName: string,
  presentAttributes: string[],
): DirectiveAttributesValidationResult {
  return getSpecCatalog().validateDirectiveAttributes(tagName, presentAttributes)
}

export function isOperator(op: string): op is BloggerOperatorName {
  return getSpecCatalog().isOperator(op)
}

export function isGrammarOperator(op: string): boolean {
  return getSpecCatalog().isGrammarOperator(op)
}

export function isDocAlias(alias: string): boolean {
  return getSpecCatalog().isDocAlias(alias)
}

export function getOperator(op: string): BloggerOperatorDefinition | undefined {
  return getSpecCatalog().getOperator(op)
}

export function getAllOperators(): Record<string, BloggerOperatorDefinition> {
  return getSpecCatalog().getAllOperators()
}

export function getGrammarOperators(): Record<string, BloggerOperatorDefinition> {
  return getSpecCatalog().getGrammarOperators()
}

export function getOperatorPrecedence(op: string): number | undefined {
  return getSpecCatalog().getOperatorPrecedence(op)
}

export function isDiagnosticCode(code: string): code is BloggerDiagnosticCode {
  return getSpecCatalog().isDiagnosticCode(code)
}

export function getDiagnosticRule(code: string): BloggerDiagnosticRule | undefined {
  return getSpecCatalog().getDiagnosticRule(code)
}

export function getAllDiagnostics(): Record<string, BloggerDiagnosticRule> {
  return getSpecCatalog().getAllDiagnostics()
}

export function isWidget(name: string): boolean {
  return getSpecCatalog().isWidget(name)
}

export function getWidget(name: string): any {
  return getSpecCatalog().getWidget(name)
}

export function getAllWidgets(): Record<string, any> {
  return getSpecCatalog().getAllWidgets()
}

export function getWidgetSettings(widgetName: string): any {
  return getSpecCatalog().getWidgetSettings(widgetName)
}

export function getAllWidgetSettings(): Record<string, any> {
  return getSpecCatalog().getAllWidgetSettings()
}

export function isGlobal(name: string): boolean {
  return getSpecCatalog().isGlobal(name)
}

export function getGlobal(name: string): any {
  return getSpecCatalog().getGlobal(name)
}

export function getAllGlobals(): Record<string, any> {
  return getSpecCatalog().getAllGlobals()
}

export function isMessage(key: string): boolean {
  return getSpecCatalog().isMessage(key)
}

export function getMessage(key: string): any {
  return getSpecCatalog().getMessage(key)
}

export function getAllMessages(): Record<string, any> {
  return getSpecCatalog().getAllMessages()
}

export function isScope(name: string): boolean {
  return getSpecCatalog().isScope(name)
}

export function getScope(name: string): any {
  return getSpecCatalog().getScope(name)
}

export function getAllScopes(): Record<string, any> {
  return getSpecCatalog().getAllScopes()
}

export function getScopePrecedence(): string[] {
  return getSpecCatalog().getScopePrecedence()
}

export function isType(name: string): boolean {
  return getSpecCatalog().isType(name)
}

export function getType(name: string): any {
  return getSpecCatalog().getType(name)
}

export function getAllTypes(): Record<string, any> {
  return getSpecCatalog().getAllTypes()
}

export function getCoercionRules(): Record<string, any> {
  return getSpecCatalog().getCoercionRules()
}

export function isServerInclusion(name: string): boolean {
  return getSpecCatalog().isServerInclusion(name)
}

export function getServerInclusion(name: string): BloggerInclusionDefinition | undefined {
  return getSpecCatalog().getInclusion(name)
}

export function getAllServerInclusions(): Record<string, BloggerInclusionDefinition> {
  return getSpecCatalog().getAllInclusions()
}

export function isUniversalInclusion(name: string): boolean {
  return getSpecCatalog().isUniversalInclusion(name)
}

export {
  ExpressionParser,
  parseExpression,
  tokenize,
} from './ast.js'

export {
  analyzeExpressionBudget,
  COMPILER_NESTING_LIMIT,
  COMPILER_QUOTA_LIMIT,
  COMPILER_QUOTA_WARNING,
  countExpressionTokens,
  evaluateExpressionBudget,
  flattenMultilineExpression,
  tokenizeExpression,
  tokenizeExpressionTokens,
  unescapeXmlEntities,
} from './quota.js'

export {
  getCompatibleOperatorNames,
  getCompatibleOperators,
  getTypeDefinition,
  getTypeModifiers,
  isTruthy,
  isTypeAssignable,
  resolveOperatorReturnType,
} from './type-system.js'
