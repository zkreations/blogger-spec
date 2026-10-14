import type { BloggerCatalogName } from '../types.js'
import addFormats from 'ajv-formats'
import Ajv2020 from 'ajv/dist/2020.js'
import {
  getAllSchemas,
  getCatalog,
  getDirectives,
  getGlobals,
  getInclusions,
  getOperators,
  getScopes,
  getSettings,
  getTypes,
  getWidgets,
} from '../catalogs/index.js'
import { verifyArtifactsFreshness } from './compiler.js'

export {
  type VerificationFreshnessItem,
  type VerificationFreshnessReport,
  verifyArtifactsFreshness,
} from './compiler.js'

export interface SpecValidationReport {
  valid: boolean
  errors: string[]
  metrics: {
    schemasChecked: number
    fixturesChecked: number
  }
}

export interface ValidateSpecOptions {
  reporter?: (message: string) => void
  checkDtsFreshness?: boolean
}

export function validateSpec(options?: ValidateSpecOptions): SpecValidationReport {
  const log = options?.reporter || (() => {})
  const errors: string[] = []
  const metrics = {
    schemasChecked: 0,
    fixturesChecked: 0,
  }

  log('-> 1. Validating catalogs against JSON Schemas (Draft 2020-12)...')
  const ajv = new (Ajv2020 as unknown as new (opts: any) => any)({ allErrors: true, strict: true, allowUnionTypes: true });
  (addFormats as unknown as (ajv: any) => void)(ajv)

  const schemas = getAllSchemas()
  for (const { schema } of schemas) {
    ajv.addSchema(schema)
  }

  const catalogNames: BloggerCatalogName[] = [
    'directives',
    'operators',
    'types',
    'widgets',
    'settings',
    'globals',
    'messages',
    'scopes',
    'diagnostics',
    'inclusions',
  ]

  for (const name of catalogNames) {
    const data = getCatalog(name)
    const schemaFile = schemas.find(s => s.name === name)
    if (!schemaFile) {
      errors.push(`Missing schema for catalog: ${name}`)
      continue
    }

    const validate = ajv.getSchema(schemaFile.schema.$id) || ajv.compile(schemaFile.schema)
    const valid = validate(data)
    if (!valid) {
      for (const err of validate.errors || []) {
        errors.push(`${name}.json: ${err.instancePath || '/'} ${err.message} - ${JSON.stringify(err.params)}`)
      }
    }
    else {
      metrics.schemasChecked++
      log(`  [PASS] ${name}.json matches schema.`)
    }
  }

  log('-> 2. Validating catalogs referential integrity...')
  const operatorsCatalog = getOperators()
  const operators = operatorsCatalog.operators || {}
  const hierarchy = operatorsCatalog.precedence_hierarchy || []

  // 2.1 Operators hierarchy and precedence level
  for (const [opKey, opDef] of Object.entries(operators)) {
    const lvl = hierarchy.find(h => h.level === opDef.precedence_level)
    if (!lvl || !lvl.operators.includes(opKey)) {
      errors.push(`Operator '${opKey}' is defined with precedence_level ${opDef.precedence_level} but missing in precedence_hierarchy level ${opDef.precedence_level}.`)
    }
  }

  // 2.2 Operator aliases collision & uniqueness
  const allOpKeys = new Set(Object.keys(operators))
  const grammarAliases = new Map<string, string>()
  const docAliases = new Map<string, string>()
  for (const [opKey, opDef] of Object.entries(operators)) {
    for (const ga of opDef.grammar_aliases || []) {
      if (allOpKeys.has(ga) && ga !== opKey) {
        errors.push(`Operator grammar alias '${ga}' in '${opKey}' collides with primary operator '${ga}'.`)
      }
      const existing = grammarAliases.get(ga)
      if (existing && existing !== opKey) {
        errors.push(`Duplicate grammar alias '${ga}' defined across '${opKey}' and '${existing}'.`)
      }
      grammarAliases.set(ga, opKey)
    }
    for (const da of opDef.doc_aliases || []) {
      const existing = docAliases.get(da)
      if (existing && existing !== opKey) {
        errors.push(`Duplicate doc alias '${da}' defined across '${opKey}' and '${existing}'.`)
      }
      docAliases.set(da, opKey)
    }
  }

  // 2.3 Type referential integrity across catalogs
  const typesCatalog = getTypes()
  const knownTypes = new Set(Object.keys(typesCatalog.types || {}))

  function isKnownType(type?: string): boolean {
    if (!type) {
      return true
    }
    if (knownTypes.has(type)) {
      return true
    }
    if (type.startsWith('array[') && type.endsWith(']')) {
      return isKnownType(type.slice(6, -1))
    }
    return false
  }

  for (const [typeKey, typeDef] of Object.entries(typesCatalog.types || {})) {
    if (typeDef.parent_type && !isKnownType(typeDef.parent_type)) {
      errors.push(`Type '${typeKey}' specifies unknown parent_type '${typeDef.parent_type}'.`)
    }
    for (const [modKey, modDef] of Object.entries(typeDef.modifiers || {})) {
      if (modDef.output_type && !isKnownType(modDef.output_type)) {
        errors.push(`Modifier '${typeKey}.${modKey}' specifies unknown output_type '${modDef.output_type}'.`)
      }
    }
  }

  const globalsCatalog = getGlobals()
  for (const [objKey, objDef] of Object.entries(globalsCatalog.objects || {})) {
    if (objDef.item_type && !isKnownType(objDef.item_type)) {
      errors.push(`Global object '${objKey}' specifies unknown item_type '${objDef.item_type}'.`)
    }
    for (const [propKey, propDef] of Object.entries(objDef.canonical || {})) {
      if (!isKnownType(propDef.type)) {
        errors.push(`Global property '${objKey}.${propKey}' specifies unknown type '${propDef.type}'.`)
      }
      if (propDef.item_type && !isKnownType(propDef.item_type)) {
        errors.push(`Global property '${objKey}.${propKey}' specifies unknown item_type '${propDef.item_type}'.`)
      }
    }
  }

  const widgetsCatalog = getWidgets()
  const knownWidgets = new Set(Object.keys(widgetsCatalog.widgets || {}))
  for (const [widgetKey, widgetDef] of Object.entries(widgetsCatalog.widgets || {})) {
    for (const [propKey, propDef] of Object.entries(widgetDef.canonical || {})) {
      if (!isKnownType(propDef.type)) {
        errors.push(`Widget property '${widgetKey}.${propKey}' specifies unknown type '${propDef.type}'.`)
      }
      if (propDef.item_type && !isKnownType(propDef.item_type)) {
        errors.push(`Widget property '${widgetKey}.${propKey}' specifies unknown item_type '${propDef.item_type}'.`)
      }
    }
  }

  const settingsCatalog = getSettings()
  for (const [widgetKey, widgetDef] of Object.entries(settingsCatalog.widgets || {})) {
    if (!knownWidgets.has(widgetKey)) {
      errors.push(`Settings catalog references unknown widget '${widgetKey}'.`)
    }
    for (const [settingKey, settingDef] of Object.entries(widgetDef.canonical || {})) {
      if (!isKnownType(settingDef.type)) {
        errors.push(`Widget setting '${widgetKey}.${settingKey}' specifies unknown type '${settingDef.type}'.`)
      }
    }
  }

  const directivesCatalog = getDirectives()
  const knownDirectives = new Set(Object.keys(directivesCatalog.directives || {}))
  for (const [dirKey, dirDef] of Object.entries(directivesCatalog.directives || {})) {
    for (const [attrKey, attrDef] of Object.entries(dirDef.attributes || {})) {
      if (attrDef.type && !isKnownType(attrDef.type)) {
        errors.push(`Directive attribute '${dirKey}[${attrKey}]' specifies unknown type '${attrDef.type}'.`)
      }
    }
  }

  const scopesCatalog = getScopes()
  for (const [scopeKey, scopeDef] of Object.entries(scopesCatalog.scopes || {})) {
    if (scopeDef.boundary_tag) {
      const tags = Array.isArray(scopeDef.boundary_tag) ? scopeDef.boundary_tag : [scopeDef.boundary_tag]
      for (const tag of tags) {
        if (!knownDirectives.has(tag)) {
          errors.push(`Scope '${scopeKey}' specifies unknown boundary directive '${tag}'.`)
        }
      }
    }
  }
  for (const precScope of scopesCatalog.resolution_precedence || []) {
    if (!scopesCatalog.scopes || !scopesCatalog.scopes[precScope]) {
      errors.push(`Scope resolution precedence references unknown scope '${precScope}'.`)
    }
  }

  const inclusionsCatalog = getInclusions()
  for (const [incKey, incDef] of Object.entries(inclusionsCatalog.inclusions || {})) {
    for (const targetWidget of incDef.target_widgets || []) {
      if (!knownWidgets.has(targetWidget)) {
        errors.push(`Inclusion '${incKey}' references unknown target widget '${targetWidget}'.`)
      }
    }
  }

  if (errors.length === 0) {
    log('  [PASS] Catalogs referential integrity validated.')
  }

  const freshness = verifyArtifactsFreshness({ checkDts: options?.checkDtsFreshness ?? true })

  log('-> 3. Validating TypeScript definitions freshness...')
  const checkFreshness = options?.checkDtsFreshness ?? true
  if (checkFreshness) {
    const dtsItem = freshness.items.find(i => i.name === 'dist/index.d.ts')
    if (dtsItem && !dtsItem.valid) {
      errors.push(dtsItem.error || 'dist/index.d.ts is out of date. Run `pnpm run build` to synchronize.')
    }
    else if (dtsItem?.valid) {
      log('  [PASS] dist/index.d.ts is up to date.')
    }
  }
  else {
    log('  [SKIP] dist/index.d.ts check skipped via options.')
  }

  log('-> 4. Validating fixtures manifest...')
  const manifestItem = freshness.items.find(i => i.name === 'fixtures/index.json')
  if (manifestItem && !manifestItem.valid) {
    errors.push(manifestItem.error || 'fixtures/index.json is missing or out of sync. Run `pnpm run build` to synchronize.')
  }
  else if (manifestItem?.valid) {
    metrics.fixturesChecked = manifestItem.count || 0
    log(`  [PASS] fixtures/index.json verified (${metrics.fixturesChecked} fixtures).`)
  }

  return {
    valid: errors.length === 0,
    errors,
    metrics,
  }
}
