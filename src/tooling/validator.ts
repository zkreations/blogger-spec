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
  fixturesManifestPath?: string
}

function resolveBoundRuntimeData(
  bound: string,
  dataCanonical: Record<string, any>,
  globalsCatalog: any,
): boolean {
  const clean = bound.replace(/^data:/, '')
  const parts = clean.split('.')

  if (parts[0] === 'widgets') {
    const instanceId = parts[1] || ''
    const widgetType = instanceId.replace(/\d+$/, '')
    const descriptor = globalsCatalog.objects?.['data:widgets']?.canonical?.[widgetType]
    if (!descriptor) {
      return false
    }
    if (parts.length === 2) {
      return true
    }
    const prop = parts[2]
    const itemProps = descriptor.item_properties?.[prop]
    if (!itemProps) {
      return false
    }
    if (parts.length === 3 || parts.length === 4) {
      return true
    }
    if (parts.length === 5) {
      return Boolean(itemProps.item_properties?.[parts[4]])
    }
    return false
  }

  const root = parts[0]!.replace(/\[\d+\]/, '')

  if (root === 'post' || root === 'posts') {
    const postContainer = dataCanonical.posts || dataCanonical.post
    if (!postContainer) {
      return false
    }
    if (parts.length === 1) {
      return true
    }
    let targetProp = parts[parts.length - 1]
    if (root === 'posts' && parts[1] === 'first' && parts.length === 3) {
      targetProp = parts[2]
    }
    const itemProps = postContainer.item_properties || postContainer.properties || {}
    return Boolean(itemProps[targetProp])
  }

  if (dataCanonical[root]) {
    let curr = dataCanonical[root]
    for (let i = 1; i < parts.length; i++) {
      const seg = parts[i]!.replace(/\[\d+\]/, '')
      const next = curr.properties?.[seg] || curr.item_properties?.[seg]
      if (!next) {
        return false
      }
      curr = next
    }
    return true
  }

  const globalObj = globalsCatalog.objects?.[`data:${root}`] || globalsCatalog.objects?.[root]
  if (globalObj) {
    let curr = globalObj
    for (let i = 1; i < parts.length; i++) {
      const seg = parts[i]!.replace(/\[\d+\]/, '')
      const next = curr.canonical?.[seg] || curr.properties?.[seg] || curr.item_properties?.[seg]
      if (!next) {
        return false
      }
      curr = next
    }
    return true
  }

  return false
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
  ajv.addKeyword('x-generated-required')

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
  const SHARED_SCHEMAS = new Set(['common', 'fixture'])
  for (const schema of schemas) {
    if (!catalogNames.includes(schema.name as BloggerCatalogName) && !SHARED_SCHEMAS.has(schema.name)) {
      errors.push(`Schema '${schema.name}.schema.json' has no matching canonical catalog.`)
    }
  }

  log('-> 2. Validating catalogs referential integrity...')
  const diagnosticsCatalog = store.getCatalog('diagnostics')
  const knownDiagnosticCodes = new Set<string>(
    Object.entries(diagnosticsCatalog.rules || {}).map(([key, rule]) => (rule as any).code ?? key),
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

  for (const [codeKey, rule] of Object.entries(diagnosticsCatalog.rules || {})) {
    if ((rule as any).code && codeKey !== (rule as any).code) {
      errors.push(`Diagnostic rule key '${codeKey}' does not match rule.code '${(rule as any).code}'.`)
    }
  }

  const operatorsCatalog = store.getCatalog('operators')
  const operators = operatorsCatalog.operators || {}
  const hierarchy = operatorsCatalog.domain_metadata?.precedence_hierarchy || []

  // 2.1 Operators hierarchy, precedence level and associativity
  for (const [opKey, opDef] of Object.entries(operators)) {
    const lvl = hierarchy.find((h: any) => h.level === opDef.precedence_level)
    if (!lvl || !lvl.operators.includes(opKey)) {
      errors.push(`Operator '${opKey}' is defined with precedence_level ${opDef.precedence_level} but missing in precedence_hierarchy level ${opDef.precedence_level}.`)
    }
    if (lvl && opDef.associativity && lvl.associativity !== opDef.associativity) {
      errors.push(`Operator '${opKey}' specifies associativity '${opDef.associativity}', but precedence level ${lvl.level} specifies '${lvl.associativity}'.`)
    }
  }

  // 2.2 Operator families bidirectional referential integrity
  const families = (operatorsCatalog.domain_metadata?.families || {}) as Record<string, { operators?: string[] }>
  for (const [famKey, famDef] of Object.entries(families)) {
    for (const op of famDef.operators || []) {
      const opDef = operators[op]
      if (!opDef) {
        errors.push(`Family '${famKey}' references unknown operator '${op}'.`)
      }
      else if (opDef.family !== famKey && !(opDef.secondary_families || []).includes(famKey)) {
        errors.push(`Operator '${op}' listed in family '${famKey}' does not declare '${famKey}' as family or secondary_family.`)
      }
    }
  }
  for (const [opKey, opDef] of Object.entries(operators)) {
    if (!families[opDef.family]) {
      errors.push(`Operator '${opKey}' references unknown family '${opDef.family}'.`)
    }
    for (const secFam of opDef.secondary_families || []) {
      if (!families[secFam]) {
        errors.push(`Operator '${opKey}' references unknown secondary family '${secFam}'.`)
      }
      else if (!families[secFam]?.operators?.includes(opKey)) {
        errors.push(`Operator '${opKey}' specifies secondary family '${secFam}', but is missing in family's operators list.`)
      }
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
    const dataCanonical = widgetDef.data?.canonical || (widgetDef as any).canonical || {}
    for (const [propKey, propDef] of Object.entries(dataCanonical)) {
      if (!isKnownType((propDef as any).type)) {
        errors.push(`Widget property '${widgetKey}.${propKey}' specifies unknown type '${(propDef as any).type}'.`)
      }
      if ((propDef as any).item_type && !isKnownType((propDef as any).item_type)) {
        errors.push(`Widget property '${widgetKey}.${propKey}' specifies unknown item_type '${(propDef as any).item_type}'.`)
      }
    }

    const settingsCanonical = widgetDef.settings?.canonical || {}
    for (const [settingKey, settingDef] of Object.entries(settingsCanonical)) {
      if (!isKnownType((settingDef as any).type)) {
        errors.push(`Widget setting '${widgetKey}.${settingKey}' specifies unknown type '${(settingDef as any).type}'.`)
      }
      const bound = (settingDef as any).bound_runtime_data
      if (bound && typeof bound === 'string') {
        if (!resolveBoundRuntimeData(bound, dataCanonical, globalsCatalog)) {
          errors.push(`Widget setting '${widgetKey}.${settingKey}' declares unresolved bound_runtime_data '${bound}'.`)
        }
      }
    }
  }

  const directivesCatalog = store.getCatalog('directives')
  const knownDirectives = new Set(Object.keys(directivesCatalog.directives || {}))
  const grammarGroups = directivesCatalog.domain_metadata?.grammar_groups || {}
  const knownGrammarGroups = new Set(Object.keys(grammarGroups))
  for (const [dirKey, dirDef] of Object.entries(directivesCatalog.directives || {})) {
    for (const [attrKey, attrDef] of Object.entries(dirDef.attributes || {})) {
      if (attrDef.type && !isKnownType(attrDef.type)) {
        errors.push(`Directive attribute '${dirKey}[${attrKey}]' specifies unknown type '${attrDef.type}'.`)
      }
    }
    const grammar = dirDef.grammar || {}
    for (const p of grammar.valid_parents || []) {
      if (p.startsWith('@') && !knownGrammarGroups.has(p)) {
        errors.push(`Directive '<${dirKey}>' references unknown grammar group '${p}' in valid_parents.`)
      }
    }
    for (const c of grammar.valid_children || []) {
      if (c.startsWith('@') && !knownGrammarGroups.has(c)) {
        errors.push(`Directive '<${dirKey}>' references unknown grammar group '${c}' in valid_children.`)
      }
    }
    const exc = grammar.invalid_nesting_policy?.on_invalid_child?.exceptions || {}
    for (const excKey of Object.keys(exc)) {
      if (!knownDirectives.has(excKey) && !knownGrammarGroups.has(excKey)) {
        errors.push(`Directive '<${dirKey}>' defines nesting exception for unknown target '${excKey}'.`)
      }
    }
  }

  // 2.3b Theme Designer Skin variables bijective cross-validation
  const skinTypesInTypes = new Map<string, string>()
  for (const [typeKey, typeDef] of Object.entries(typesCatalog.types || {})) {
    if (typeKey.startsWith('skin:')) {
      const tagAttr = (typeDef as any).skin_metadata?.tag_attribute_value
      if (tagAttr) {
        skinTypesInTypes.set(tagAttr, typeKey)
      }
    }
  }

  const variableTypeAttrs = (directivesCatalog.directives?.Variable as any)?.type_attributes || {}
  for (const varAttrKey of Object.keys(variableTypeAttrs)) {
    if (!skinTypesInTypes.has(varAttrKey)) {
      errors.push(`Directive '<Variable>' declares type_attribute '${varAttrKey}' without matching 'skin:${varAttrKey}' type in types.json.`)
    }
  }
  for (const [tagAttr, skinTypeKey] of skinTypesInTypes.entries()) {
    if (!variableTypeAttrs[tagAttr]) {
      errors.push(`Type '${skinTypeKey}' declares tag_attribute_value '${tagAttr}' missing from '<Variable>' type_attributes in directives.json.`)
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
  const scopeResolution = scopesCatalog.domain_metadata?.resolution_precedence || []
  for (const precScope of scopeResolution) {
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
  const manifestPath = options?.fixturesManifestPath || getWorkspacePaths().fixturesManifest
  const manifestItem = options?.fixturesManifestPath
    ? { name: 'fixtures/index.json', valid: true, count: 1, error: undefined }
    : freshness.items.find(i => i.name === 'fixtures/index.json')
  if (manifestItem && !manifestItem.valid) {
    errors.push(manifestItem.error || 'fixtures/index.json is missing or out of sync. Run `pnpm run build` to synchronize.')
  }
  else if (manifestItem?.valid) {
    metrics.fixturesChecked = manifestItem.count || 0
    log(`  [PASS] fixtures manifest verified (${metrics.fixturesChecked} fixtures).`)
    const fixtureValidate = ajv.getSchema('fixture.schema.json#/$defs/fixture')
      || ajv.compile({ $ref: 'fixture.schema.json#/$defs/fixture' })
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
      fixtures?: Array<{
        id: string
        covers?: string[]
        expected?: {
          outcome?: string
          diagnosticCodes?: string[]
        }
      }>
    }

    const knownModifiers = new Set<string>()
    for (const typeDef of Object.values(typesCatalog.types || {})) {
      for (const modKey of Object.keys((typeDef as any).modifiers || {})) {
        knownModifiers.add(modKey)
      }
    }
    const knownSubsystems = new Set([
      'arithmetic',
      'collections_and_lambdas',
      'conditional_rendering',
      'helpers_and_transforms',
      'includable_inheritance',
      'locale_modifiers',
      'logical_and_comparisons',
      'loop_rendering',
      'loop_shadowing',
      'message_rendering',
      'subtype_modifiers',
      'widget_rendering',
      'with_nesting',
    ])
    const knownSemantics = new Set([
      'coercion-canonical-string',
      'coercion-equality',
      'coercion-literal',
      'coercion-literal-dominance',
      'coercion-nullish',
      'coercion-runtime-fallback',
      'coercion-runtime-numeric',
      'coercion-strict-types',
    ])
    const validCoverPrefixes = new Set(['tag', 'operator', 'rule', 'type', 'modifier', 'subsystem', 'semantics'])

    for (const fixture of manifest.fixtures || []) {
      if (!fixtureValidate(fixture)) {
        for (const err of fixtureValidate.errors || []) {
          errors.push(`Fixture '${fixture.id}': ${err.instancePath || '/'} ${err.message}`)
        }
      }
      if (fixture.expected?.outcome === 'rejected'
        && (!fixture.expected.diagnosticCodes || fixture.expected.diagnosticCodes.length === 0)) {
        errors.push(`Fixture '${fixture.id}' with outcome 'rejected' must define at least one diagnostic code.`)
      }
      for (const diagCode of fixture.expected?.diagnosticCodes || []) {
        if (!knownDiagnosticCodes.has(diagCode)) {
          errors.push(`Fixture '${fixture.id}' references unknown diagnostic code '${diagCode}'.`)
        }
      }
      for (const cover of fixture.covers || []) {
        const colonIdx = cover.indexOf(':')
        if (colonIdx === -1) {
          errors.push(`Fixture '${fixture.id}' declares cover '${cover}' without required prefix.`)
          continue
        }
        const prefix = cover.slice(0, colonIdx)
        const target = cover.slice(colonIdx + 1)
        if (!validCoverPrefixes.has(prefix)) {
          errors.push(`Fixture '${fixture.id}' declares cover '${cover}' with unknown prefix '${prefix}'.`)
          continue
        }
        if (prefix === 'tag' && !knownDirectives.has(target)) {
          errors.push(`Fixture '${fixture.id}' covers unknown tag '${target}'.`)
        }
        else if (prefix === 'operator' && !allOpKeys.has(target)) {
          errors.push(`Fixture '${fixture.id}' covers unknown operator '${target}'.`)
        }
        else if (prefix === 'rule' && !knownDiagnosticCodes.has(target)) {
          errors.push(`Fixture '${fixture.id}' covers unknown diagnostic rule '${target}'.`)
        }
        else if (prefix === 'type' && !knownTypes.has(target)) {
          errors.push(`Fixture '${fixture.id}' covers unknown type '${target}'.`)
        }
        else if (prefix === 'modifier' && !knownModifiers.has(target)) {
          errors.push(`Fixture '${fixture.id}' covers unknown modifier '${target}'.`)
        }
        else if (prefix === 'subsystem' && !knownSubsystems.has(target)) {
          errors.push(`Fixture '${fixture.id}' covers unknown subsystem '${target}'.`)
        }
        else if (prefix === 'semantics' && !knownSemantics.has(target)) {
          errors.push(`Fixture '${fixture.id}' covers unknown semantics '${target}'.`)
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    metrics,
  }
}
