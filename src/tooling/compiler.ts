/* eslint-disable no-console */
import type { BloggerFixturesManifest } from '../types.js'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { CATALOG_NAMES } from '../catalogs/constants.js'
import { getWorkspacePaths } from '../paths.js'
import { generateCanonicalSchemaTypes } from './schema-types-generator.js'

export interface VerificationFreshnessItem {
  name: string
  valid: boolean
  count?: number
  error?: string
}

export interface VerificationFreshnessReport {
  allValid: boolean
  items: VerificationFreshnessItem[]
}

export function generateDts(): string {
  return [
    'import { getAllCatalogs, getCatalog, getDiagnostics, getDirectives, getGlobals, getInclusions, getMessages, getOperators, getScopes, getSettings, getTypes, getWidgets } from \'./catalogs/index.js\';',
    'export declare let directives: import("./types.js").BloggerDirectivesCatalog;',
    'export declare let operators: import("./types.js").BloggerOperatorsCatalog;',
    'export declare let types: import("./types.js").BloggerTypesCatalog;',
    'export declare let widgets: import("./types.js").BloggerWidgetsCatalog;',
    'export declare let settings: import("./types.js").BloggerSettingsCatalog;',
    'export declare let globals: import("./types.js").BloggerGlobalsCatalog;',
    'export declare let messages: import("./types.js").BloggerMessagesCatalog;',
    'export declare let scopes: import("./types.js").BloggerScopesCatalog;',
    'export declare let diagnostics: import("./types.js").BloggerDiagnosticsCatalog;',
    'export declare let inclusions: import("./types.js").BloggerInclusionsCatalog;',
    'export { getAllCatalogs, getCatalog, getDiagnostics, getDirectives, getGlobals, getInclusions, getMessages, getOperators, getScopes, getSettings, getTypes, getWidgets, };',
    'export * from \'./ast.js\';',
    'export * from \'./catalogs/index.js\';',
    'export * from \'./data-path.js\';',
    'export * from \'./parser/index.js\';',
    'export * from \'./quota.js\';',
    'export * from \'./scope.js\';',
    'export * from \'./type-system.js\';',
    'export * from \'./types.js\';',
    'export * from \'./version.js\';',
    '',
  ].join('\n')
}

export function buildDts(): void {
  const paths = getWorkspacePaths()
  mkdirSync(paths.dist, { recursive: true })
  const content = generateDts()
  writeFileSync(paths.dts, content, 'utf-8')
}

export function generateFixturesManifest(): BloggerFixturesManifest {
  const paths = getWorkspacePaths()
  const allFixtures: any[] = []
  const categories = existsSync(paths.fixtures)
    ? readdirSync(paths.fixtures, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .sort()
    : []

  for (const cat of categories) {
    const catDir = join(paths.fixtures, cat)
    if (!existsSync(catDir))
      continue
    const files = readdirSync(catDir).filter((f: string) => f.endsWith('.json')).sort()
    for (const f of files) {
      const data = JSON.parse(readFileSync(join(catDir, f), 'utf-8'))
      if (Array.isArray(data.fixtures)) {
        allFixtures.push(...data.fixtures)
      }
    }
  }

  const positive = allFixtures.filter(f => f.expected.outcome !== 'rejected')
  const negative = allFixtures.filter(f => f.expected.outcome === 'rejected')

  const coversSet = new Set<string>()
  let latestVerifiedAt = '2026-01-01'
  for (const f of allFixtures) {
    for (const c of f.covers || []) {
      coversSet.add(c)
    }
    if (f.verified_at && f.verified_at > latestVerifiedAt) {
      latestVerifiedAt = f.verified_at
    }
  }

  return {
    version: '1.0.0',
    generatedAt: latestVerifiedAt,
    metrics: {
      totalFixtures: allFixtures.length,
      positiveFixtures: positive.length,
      negativeFixtures: negative.length,
      coveredSpecEntities: coversSet.size,
    },
    fixtures: allFixtures,
  }
}

export function buildFixturesManifest(): BloggerFixturesManifest {
  const paths = getWorkspacePaths()
  const manifest = generateFixturesManifest()
  writeFileSync(paths.fixturesManifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8')
  return manifest
}

export function generateDomainTypes(): string {
  return generateCanonicalSchemaTypes()
}

export function buildDomainTypes(): void {
  const paths = getWorkspacePaths()
  const targetDir = join(paths.root, 'src/generated')
  mkdirSync(targetDir, { recursive: true })
  const targetPath = join(targetDir, 'types.generated.ts')
  const content = generateDomainTypes()
  writeFileSync(targetPath, content, 'utf-8')
}

export function generateEmbeddedCatalogs(): string {
  const paths = getWorkspacePaths()
  const catalogsDir = paths.catalogs
  const schemasDir = paths.schemas

  const catalogs: Record<string, any> = {}
  for (const name of CATALOG_NAMES) {
    const filePath = join(catalogsDir, `${name}.json`)
    if (existsSync(filePath)) {
      catalogs[name] = JSON.parse(readFileSync(filePath, 'utf-8'))
    }
  }

  const schemas: Record<string, any> = {}
  if (existsSync(schemasDir)) {
    const schemaFiles = readdirSync(schemasDir).filter(f => f.endsWith('.schema.json'))
    for (const f of schemaFiles) {
      schemas[f] = JSON.parse(readFileSync(join(schemasDir, f), 'utf-8'))
    }
  }

  const individualExports = CATALOG_NAMES.map((name) => {
    const pascal = name.charAt(0).toUpperCase() + name.slice(1)
    return `export const embedded${pascal}Catalog: Blogger${pascal}Catalog = ${JSON.stringify(catalogs[name] || {}, null, 2)} as unknown as Blogger${pascal}Catalog;`
  }).join('\n\n')

  const mapProperties = CATALOG_NAMES.map((name) => {
    const pascal = name.charAt(0).toUpperCase() + name.slice(1)
    return `  ${name}: embedded${pascal}Catalog,`
  }).join('\n')

  return [
    '/**',
    ' * blogger-spec — Canonical In-Memory Embedded Catalogs & Schemas.',
    ' * Automatically generated from master JSON catalogs.',
    ' * DO NOT EDIT MANUALLY.',
    ' */',
    '',
    'import type {',
    '  BloggerCatalogMap,',
    ...CATALOG_NAMES.map(name => `  Blogger${name.charAt(0).toUpperCase() + name.slice(1)}Catalog,`),
    '} from \'../types.js\'',
    '',
    individualExports,
    '',
    'export const embeddedCatalogs: BloggerCatalogMap = {',
    mapProperties,
    '};',
    '',
    `export const embeddedSchemas: Record<string, any> = ${JSON.stringify(schemas, null, 2)};`,
    '',
  ].join('\n')
}

export function buildEmbeddedCatalogs(): void {
  const paths = getWorkspacePaths()
  const targetDir = join(paths.root, 'src/generated')
  mkdirSync(targetDir, { recursive: true })
  const targetPath = join(targetDir, 'embedded.generated.ts')
  const content = generateEmbeddedCatalogs()
  writeFileSync(targetPath, content, 'utf-8')
}

export function compileTypescript(): void {
  const paths = getWorkspacePaths()
  mkdirSync(paths.dist, { recursive: true })
  const configPath = join(paths.root, 'tsconfig.json')
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, paths.root)

  const entryFiles = [
    join(paths.root, 'src/index.ts'),
    join(paths.root, 'src/runner.ts'),
    join(paths.root, 'src/catalogs/index.ts'),
    join(paths.root, 'src/ast.ts'),
    join(paths.root, 'src/quota.ts'),
    join(paths.root, 'src/type-system.ts'),
    join(paths.root, 'src/version.ts'),
    join(paths.root, 'src/parser/index.ts'),
    join(paths.root, 'src/catalogs/fs-store.ts'),
  ]

  const program = ts.createProgram(entryFiles, {
    ...parsedConfig.options,
    rootDir: paths.src,
    outDir: paths.dist,
    declaration: true,
    noEmit: false,
  })

  const emitResult = program.emit()
  const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

  const errors = allDiagnostics.filter(d => d.category === ts.DiagnosticCategory.Error)
  if (errors.length > 0) {
    const errorMessages = errors.map((d) => {
      const message = ts.flattenDiagnosticMessageText(d.messageText, '\n')
      if (d.file && d.start) {
        const { line, character } = d.file.getLineAndCharacterOfPosition(d.start)
        return `${d.file.fileName} (${line + 1},${character + 1}): ${message}`
      }
      return message
    })
    throw new Error(`TypeScript compilation failed with ${errors.length} error(s):\n${errorMessages.join('\n')}`)
  }
}

export function cleanDist(): void {
  const paths = getWorkspacePaths()
  if (existsSync(paths.dist)) {
    rmSync(paths.dist, { recursive: true, force: true })
  }
}

export function buildAll(): void {
  cleanDist()
  const paths = getWorkspacePaths()
  buildEmbeddedCatalogs()
  buildDomainTypes()
  buildFixturesManifest()
  compileTypescript()
  buildDts()

  const requiredArtifacts = [
    join(paths.dist, 'index.js'),
    join(paths.dist, 'index.d.ts'),
    join(paths.dist, 'runner.js'),
    join(paths.dist, 'runner.d.ts'),
    join(paths.dist, 'catalogs/index.js'),
    join(paths.dist, 'catalogs/index.d.ts'),
    join(paths.dist, 'ast.js'),
    join(paths.dist, 'ast.d.ts'),
    join(paths.dist, 'version.js'),
    join(paths.dist, 'version.d.ts'),
    join(paths.dist, 'parser/index.js'),
    join(paths.dist, 'parser/index.d.ts'),
    join(paths.dist, 'catalogs/fs-store.js'),
    join(paths.dist, 'catalogs/fs-store.d.ts'),
    paths.fixturesManifest,
  ]

  for (const art of requiredArtifacts) {
    if (!existsSync(art)) {
      throw new Error(`Missing required distribution artifact: ${art}`)
    }
  }
}

export function compile(target?: string): void {
  console.log('=== blogger-spec Build Pipeline ===')
  const t = (target || 'all').toLowerCase().replace(/^--target=/, '')

  switch (t) {
    case 'catalogs':
    case 'embedded':
      console.log('-> Generating embedded catalogs and domain types...')
      buildEmbeddedCatalogs()
      buildDomainTypes()
      break
    case 'types':
    case 'domain-types':
      console.log('-> Generating domain types...')
      buildDomainTypes()
      break
    case 'fixtures':
    case 'manifest':
      console.log('-> Building fixtures manifest...')
      buildFixturesManifest()
      break
    case 'dts':
      console.log('-> Generating TypeScript declarations...')
      buildDts()
      break
    case 'ts':
    case 'typescript':
      console.log('-> Compiling TypeScript bundle...')
      compileTypescript()
      break
    case 'all':
    default:
      buildAll()
      break
  }

  console.log('\n[SUCCESS] blogger-spec build completed successfully!')
}

export const buildSpec = compile

export function verifyArtifactsFreshness(options?: { checkDts?: boolean }): VerificationFreshnessReport {
  const paths = getWorkspacePaths()
  const items: VerificationFreshnessItem[] = []

  if (options?.checkDts ?? true) {
    if (!existsSync(paths.dts)) {
      items.push({ name: 'dist/index.d.ts', valid: false, error: 'File does not exist.' })
    }
    else {
      const currentDts = readFileSync(paths.dts, 'utf-8').replace(/\r\n/g, '\n')
      const freshDts = generateDts().replace(/\r\n/g, '\n')
      const valid = currentDts === freshDts
      items.push({
        name: 'dist/index.d.ts',
        valid,
        error: valid ? undefined : 'dist/index.d.ts is out of date.',
      })
    }
  }

  if (!existsSync(paths.fixturesManifest)) {
    items.push({ name: 'fixtures/index.json', valid: false, error: 'File does not exist.' })
  }
  else {
    try {
      const currentManifest = JSON.parse(readFileSync(paths.fixturesManifest, 'utf-8'))
      const freshManifest = generateFixturesManifest()
      const count = currentManifest.fixtures?.length || 0
      const fixturesMatch = JSON.stringify(currentManifest.fixtures) === JSON.stringify(freshManifest.fixtures)
      const metricsMatch = JSON.stringify(currentManifest.metrics) === JSON.stringify(freshManifest.metrics)
      const valid = fixturesMatch && metricsMatch && count > 0
      items.push({
        name: 'fixtures/index.json',
        valid,
        count,
        error: valid ? undefined : `fixtures/index.json is out of date. Run \`pnpm run build\` to synchronize.`,
      })
    }
    catch (err: any) {
      items.push({ name: 'fixtures/index.json', valid: false, error: err.message })
    }
  }

  const embeddedPath = join(paths.root, 'src/generated/embedded.generated.ts')
  if (!existsSync(embeddedPath)) {
    items.push({ name: 'src/generated/embedded.generated.ts', valid: false, error: 'File does not exist.' })
  }
  else {
    const currentEmbedded = readFileSync(embeddedPath, 'utf-8')
    const freshEmbedded = generateEmbeddedCatalogs()
    const valid = currentEmbedded === freshEmbedded
    items.push({
      name: 'src/generated/embedded.generated.ts',
      valid,
      error: valid ? undefined : 'src/generated/embedded.generated.ts is out of date.',
    })
  }

  const typesGeneratedPath = join(paths.root, 'src/generated/types.generated.ts')
  if (!existsSync(typesGeneratedPath)) {
    items.push({ name: 'src/generated/types.generated.ts', valid: false, error: 'File does not exist.' })
  }
  else {
    const currentTypes = readFileSync(typesGeneratedPath, 'utf-8')
    const freshTypes = generateDomainTypes()
    const valid = currentTypes === freshTypes
    items.push({
      name: 'src/generated/types.generated.ts',
      valid,
      error: valid ? undefined : 'src/generated/types.generated.ts is out of date.',
    })
  }

  return {
    allValid: items.every(i => i.valid),
    items,
  }
}
