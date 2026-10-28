import {
  getAllCatalogs,
  getCatalog,
  getCommonWidget,
  getDiagnostics,
  getDirectives,
  getGlobals,
  getInclusions,
  getLocales,
  getMessages,
  getMockContext,
  getOperators,
  getScopes,
  getSettings,
  getTypes,
  getWidgets,
  validateDirectiveNesting,
} from './catalogs/index.js'

export const catalogs = {
  get directives() { return getDirectives() },
  get operators() { return getOperators() },
  get types() { return getTypes() },
  get widgets() { return getWidgets() },
  get commonWidget() { return getCommonWidget() },
  get settings() { return getSettings() },
  get globals() { return getGlobals() },
  get messages() { return getMessages() },
  get scopes() { return getScopes() },
  get diagnostics() { return getDiagnostics() },
  get inclusions() { return getInclusions() },
  get locales() { return getLocales() },
}

export {
  getAllCatalogs,
  getCatalog,
  getCommonWidget,
  getDiagnostics,
  getDirectives,
  getGlobals,
  getInclusions,
  getLocales,
  getMessages,
  getMockContext,
  getOperators,
  getScopes,
  getSettings,
  getTypes,
  getWidgets,
  validateDirectiveNesting,
}

export * from './ast.js'
export * from './catalogs/index.js'
export * from './data-path.js'
export * from './inclusion-expander.js'
export * from './parser/index.js'
export * from './quota.js'
export * from './scope.js'
export * from './type-system.js'
export * from './types.js'
export * from './version.js'
