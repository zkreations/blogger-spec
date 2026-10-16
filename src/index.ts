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
    directives = getDirectives()
  }
  catch {}
  try {
    operators = getOperators()
  }
  catch {}
  try {
    types = getTypes()
  }
  catch {}
  try {
    widgets = getWidgets()
  }
  catch {}
  try {
    settings = getSettings()
  }
  catch {}
  try {
    globals = getGlobals()
  }
  catch {}
  try {
    messages = getMessages()
  }
  catch {}
  try {
    scopes = getScopes()
  }
  catch {}
  try {
    diagnostics = getDiagnostics()
  }
  catch {}
  try {
    inclusions = getInclusions()
  }
  catch {}
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
