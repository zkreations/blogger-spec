import type { CatalogStore } from '../catalogs/store.js'
import type { BloggerCatalogName } from '../types.js'
import { readFileSync } from 'node:fs'
import addFormats from 'ajv-formats'
import Ajv2020 from 'ajv/dist/2020.js'
import { FsCatalogStore } from '../catalogs/fs-store.js'
import { CATALOG_NAMES } from '../catalogs/store.js'
import { getWorkspacePaths } from '../paths.js'
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
  store?: CatalogStore
}

export function validateSpec(options?: ValidateSpecOptions): SpecValidationReport {
  const store = options?.store || new FsCatalogStore()
  const log = options?.reporter || (() => {})
  const errors: string[] = []
  const metrics = {
    schemasChecked: 0,
    fixturesChecked: 0,
  }

  log('-> 1. Validating catalogs against JSON Schemas (Draft 2020-12)...')
  const ajv = new (Ajv2020 as unknown as new (opts: any) => any)({ allErrors: true, strict: true, allowUnionTypes: true });
  (addFormats as unknown as (ajv: any) => void)(ajv)

  const schemas = store.getAllSchemas()
  for (const { schema } of schemas) {
    ajv.addSchema(schema)
  }

  const catalogNames: BloggerCatalogName[] = [...CATALOG_NAMES]

  for (const name of catalogNames) {
    const data = store.getCatalog(name)
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

  const schemaNames = new Set(schemas.map(schema => schema.name))
  for (const name of catalogNames) {
    if (!schemaNames.has(name)) {
      errors.push(`Catalog '${name}.json' has no matching schema.`)
    }
  }
  for (const schema of schemas) {
    if (!catalogNames.includes(schema.name as BloggerCatalogName)) {
      errors.push(`Schema '${schema.name}.schema.json' has no matching canonical catalog.`)
    }
  }

  log('-> 2. Validating catalogs referential integrity...')
  const diagnosticsCatalog = store.getCatalog('diagnostics')
  const knownDiagnosticCodes = new Set<string>(
    Object.values(diagnosticsCatalog.rules || {}).map(rule => rule.code),
  )
  const knownCatalogReferences = new Set(catalogNames.map(name => `${name}.json`))

  function validateDeclarativeReferences(value: unknown, location: string): void {
    if (Array.isArray(value)) {
      value.forEach((item, index) => validateDeclarativeReferences(item, `${location}[${index}]`))
      return
    }
    if (!value || typeof value !== 'object') {
      return
    }

    for (const [key, child] of Object.entries(value)) {
      const childLocation = `${location}.${key}`
      if (key === 'catalog_ref' && typeof child === 'string' && !knownCatalogReferences.has(child)) {
        errors.push(`Reference '${childLocation}' points to unknown catalog '${child}'.`)
      }
      if (typeof child === 'string' && /^BX\d{4}$/.test(child) && !knownDiagnosticCodes.has(child)) {
        errors.push(`Reference '${childLocation}' points to unknown diagnostic '${child}'.`)
      }
      validateDeclarativeReferences(child, childLocation)
    }
  }

  for (const name of catalogNames) {
    validateDeclarativeReferences(store.getCatalog(name), `${name}.json`)
  }

  const operatorsCatalog = store.getCatalog('operators')
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
  const typesCatalog = store.getCatalog('types')
  const knownTypes = new Set(Object.keys(typesCatalog.types || {}))

  function isKnownType(type?: string): boolean {
    if (!type) {
      return true
    }
    if (type.includes('|')) {
      return type.split('|').every(t => isKnownType(t.trim()))
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
      if (!modDef.syntax || !modDef.example || !modDef.direct_syntax || !modDef.expr_syntax) {
        errors.push(`Modifier '${typeKey}.${modKey}' is missing required syntax or example specification.`)
      }
      if ((modDef as any).allowed_values) {
        if (!Array.isArray((modDef as any).allowed_values) || (modDef as any).allowed_values.length === 0) {
          errors.push(`Modifier '${typeKey}.${modKey}' defines empty or invalid allowed_values.`)
        }
      }
    }
  }

  const globalsCatalog = store.getCatalog('globals')
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

  const widgetsCatalog = store.getCatalog('widgets')
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

  const settingsCatalog = store.getCatalog('settings')
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
  for (const widgetKey of knownWidgets) {
    if (!settingsCatalog.widgets || !settingsCatalog.widgets[widgetKey]) {
      errors.push(`Widget '${widgetKey}' is defined in widgets.json but missing from settings.json.`)
    }
  }

  const directivesCatalog = store.getCatalog('directives')
  const knownDirectives = new Set(Object.keys(directivesCatalog.directives || {}))
  for (const [dirKey, dirDef] of Object.entries(directivesCatalog.directives || {})) {
    for (const [attrKey, attrDef] of Object.entries(dirDef.attributes || {})) {
      if (attrDef.type && !isKnownType(attrDef.type)) {
        errors.push(`Directive attribute '${dirKey}[${attrKey}]' specifies unknown type '${attrDef.type}'.`)
      }
    }
  }

  const scopesCatalog = store.getCatalog('scopes')
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

  const inclusionsCatalog = store.getCatalog('inclusions')
  for (const [incKey, incDef] of Object.entries(inclusionsCatalog.inclusions || {})) {
    for (const targetWidget of incDef.target_widgets || []) {
      if (!knownWidgets.has(targetWidget)) {
        errors.push(`Inclusion '${incKey}' references unknown target widget '${targetWidget}'.`)
      }
    }

    const layoutVersions = directivesCatalog.domain_metadata?.layout_versions
    if (layoutVersions) {
      const supported = new Set(layoutVersions.supported_versions)
      const declared = Object.entries(layoutVersions.versions || {})
      for (const version of supported) {
        if (!layoutVersions.versions?.[String(version)]) {
          errors.push(`Layout version '${version}' is supported but has no definition.`)
        }
      }
      if (!supported.has(layoutVersions.default_version)) {
        errors.push(`Default layout version '${layoutVersions.default_version}' is not supported.`)
      }
      for (const [key, definition] of declared) {
        if (!supported.has(definition.version)) {
          errors.push(`Layout definition '${key}' declares unsupported version '${definition.version}'.`)
        }
        if (String(definition.version) !== key) {
          errors.push(`Layout definition key '${key}' does not match version '${definition.version}'.`)
        }
      }
    }
  }

  // 2.4 Messages referential integrity
  const messagesCatalog = store.getCatalog('messages')
  const messages = messagesCatalog.messages || {}
  const knownMessageKeys = new Set(Object.keys(messages))

  const globalMessages = globalsCatalog.objects?.['data:messages']
  if (globalMessages?.catalog_ref && globalMessages.catalog_ref !== 'messages.json') {
    errors.push(`Global object 'data:messages' specifies invalid catalog_ref '${globalMessages.catalog_ref}'.`)
  }

  function checkMessageReplacements(obj: any, location: string) {
    if (!obj || typeof obj !== 'object') {
      return
    }
    for (const [k, v] of Object.entries(obj)) {
      const loc = `${location}.${k}`
      if (v && typeof v === 'object') {
        const repl = (v as any).replacement
        if (typeof repl === 'string' && repl.startsWith('data:messages.')) {
          const key = repl.replace(/^data:messages\./, '')
          if (key !== '*' && !knownMessageKeys.has(key)) {
            errors.push(`Property '${loc}' specifies replacement to unknown message '${repl}'.`)
          }
        }
        checkMessageReplacements(v, loc)
      }
    }
  }
  checkMessageReplacements(widgetsCatalog.widgets, 'widgets')

  if (errors.length === 0) {
    log('  [PASS] Catalogs referential integrity validated.')
  }

  const freshness = verifyArtifactsFreshness({ checkDts: options?.checkDtsFreshness ?? true })

  log('-> 3. Validating TypeScript definitions and generated artifacts freshness...')
  const checkFreshness = options?.checkDtsFreshness ?? true
  if (checkFreshness) {
    const dtsItem = freshness.items.find(i => i.name === 'dist/index.d.ts')
    if (dtsItem && !dtsItem.valid) {
      errors.push(dtsItem.error || 'dist/index.d.ts is out of date. Run `pnpm run build` to synchronize.')
    }
    else if (dtsItem?.valid) {
      log('  [PASS] dist/index.d.ts is up to date.')
    }

    const embeddedItem = freshness.items.find(i => i.name === 'src/catalogs/embedded.generated.ts')
    if (embeddedItem && !embeddedItem.valid) {
      errors.push(embeddedItem.error || 'src/catalogs/embedded.generated.ts is out of date. Run `pnpm run build` to synchronize.')
    }
    else if (embeddedItem?.valid) {
      log('  [PASS] src/catalogs/embedded.generated.ts is up to date.')
    }

    const typesItem = freshness.items.find(i => i.name === 'src/catalogs/types.generated.ts')
    if (typesItem && !typesItem.valid) {
      errors.push(typesItem.error || 'src/catalogs/types.generated.ts is out of date. Run `pnpm run build` to synchronize.')
    }
    else if (typesItem?.valid) {
      log('  [PASS] src/catalogs/types.generated.ts is up to date.')
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
    const manifest = JSON.parse(readFileSync(getWorkspacePaths().fixturesManifest, 'utf-8')) as {
      fixtures?: Array<{
        id: string
        expected?: {
          outcome?: string
          diagnosticCodes?: string[]
        }
      }>
    }
    for (const fixture of manifest.fixtures || []) {
      if (fixture.expected?.outcome === 'rejected'
        && (!fixture.expected.diagnosticCodes || fixture.expected.diagnosticCodes.length === 0)) {
        errors.push(`Fixture '${fixture.id}' with outcome 'rejected' must define at least one diagnostic code.`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    metrics,
  }
}
