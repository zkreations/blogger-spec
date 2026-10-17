import {
  getAllCatalogs,
  getCatalog,
  getDiagnostics,
  getDirectives,
  getGlobals,
  getInclusions,
  getMessages,
  getOperators,
  getScopes,
  getSettings,
  getTypes,
  getWidgets,
} from './catalogs/index.js'

export const catalogs = {
  get directives() { return getDirectives() },
  get operators() { return getOperators() },
  get types() { return getTypes() },
  get widgets() { return getWidgets() },
  get settings() { return getSettings() },
  get globals() { return getGlobals() },
  get messages() { return getMessages() },
  get scopes() { return getScopes() },
  get diagnostics() { return getDiagnostics() },
  get inclusions() { return getInclusions() },
}

export {
  getAllCatalogs,
  getCatalog,
  getDiagnostics,
  getDirectives,
  getGlobals,
  getInclusions,
  getMessages,
  getOperators,
  getScopes,
  getSettings,
  getTypes,
  getWidgets,
}

export * from './ast.js'
export * from './catalogs/index.js'
export * from './parser/index.js'
export * from './quota.js'
export * from './type-system.js'
export * from './types.js'
export * from './version.js'
