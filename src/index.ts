/* eslint-disable import/no-mutable-exports */
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
  registerCacheResetListener,
} from './catalogs/index.js'

export let directives = getDirectives()
export let operators = getOperators()
export let types = getTypes()
export let widgets = getWidgets()
export let settings = getSettings()
export let globals = getGlobals()
export let messages = getMessages()
export let scopes = getScopes()
export let diagnostics = getDiagnostics()
export let inclusions = getInclusions()

registerCacheResetListener(() => {
  try {
    const next = {
      directives: getDirectives(),
      operators: getOperators(),
      types: getTypes(),
      widgets: getWidgets(),
      settings: getSettings(),
      globals: getGlobals(),
      messages: getMessages(),
      scopes: getScopes(),
      diagnostics: getDiagnostics(),
      inclusions: getInclusions(),
    }

    directives = next.directives
    operators = next.operators
    types = next.types
    widgets = next.widgets
    settings = next.settings
    globals = next.globals
    messages = next.messages
    scopes = next.scopes
    diagnostics = next.diagnostics
    inclusions = next.inclusions
  }
  catch {
    // Retain previous snapshots if the custom store is a partial test mock
  }
})

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
