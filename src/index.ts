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

export const directives = getDirectives()
export const operators = getOperators()
export const types = getTypes()
export const widgets = getWidgets()
export const settings = getSettings()
export const globals = getGlobals()
export const messages = getMessages()
export const scopes = getScopes()
export const diagnostics = getDiagnostics()
export const inclusions = getInclusions()

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
export * from './helpers.js'
export * from './quota.js'
export * from './types.js'
