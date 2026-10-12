import type { BloggerCatalogName } from '../types.js'
import addFormats from 'ajv-formats'
import Ajv2020 from 'ajv/dist/2020.js'
import { getAllSchemas, getCatalog, getOperators } from '../catalogs/index.js'
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
  for (const [opKey, opDef] of Object.entries(operators)) {
    const lvl = hierarchy.find(h => h.level === opDef.precedence_level)
    if (!lvl || !lvl.operators.includes(opKey)) {
      errors.push(`Operator '${opKey}' is defined with precedence_level ${opDef.precedence_level} but missing in precedence_hierarchy level ${opDef.precedence_level}.`)
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
