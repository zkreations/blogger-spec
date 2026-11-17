/* eslint-disable no-console */
import type { BloggerFixturesManifest } from '../types.js'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CATALOG_NAMES } from '../catalogs/constants.js'
import { getWorkspacePaths } from '../node/paths.js'
import { generateCanonicalSchemaTypes } from './schema-types-generator.js'

export interface BloggerVerificationFreshnessItem {
  name: string
  valid: boolean
  count?: number
  error?: string
}

export interface BloggerVerificationFreshnessReport {
  allValid: boolean
  items: BloggerVerificationFreshnessItem[]
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
    if (cat === 'contexts' || cat === 'feeds')
      continue
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
    ' * @bloggerspec/spec — Canonical In-Memory Embedded Catalogs & Schemas.',
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

export function generateEmbeddedContexts(): string {
  const paths = getWorkspacePaths()
  const contextsDir = join(paths.fixtures, 'contexts')

  const contexts: Record<string, any> = {}
  if (existsSync(contextsDir)) {
    const contextFiles = readdirSync(contextsDir).filter(f => f.endsWith('.json')).sort()
    for (const f of contextFiles) {
      const viewId = f.replace(/\.json$/, '')
      contexts[viewId] = JSON.parse(readFileSync(join(contextsDir, f), 'utf-8'))
    }
  }

  return [
    '/**',
    ' * @bloggerspec/spec — Canonical In-Memory Embedded Mock Contexts.',
    ' * Automatically generated from fixture context JSONs.',
    ' * DO NOT EDIT MANUALLY.',
    ' */',
    '',
    'import type { BloggerViewId } from \'../types.js\'',
    '',
    `export const embeddedContexts: Record<BloggerViewId, Record<string, any>> = ${JSON.stringify(contexts, null, 2)} as unknown as Record<BloggerViewId, Record<string, any>>;`,
    '',
  ].join('\n')
}

export function generateEmbeddedBarrel(): string {
  return [
    '/**',
    ' * @bloggerspec/spec — Embedded Artifacts Barrel.',
    ' * DO NOT EDIT MANUALLY.',
    ' */',
    '',
    'export * from \'./embedded-catalogs.generated.js\'',
    'export * from \'./embedded-contexts.generated.js\'',
    '',
  ].join('\n')
}

export function buildEmbeddedCatalogs(): void {
  const paths = getWorkspacePaths()
  const targetDir = join(paths.root, 'src/generated')
  mkdirSync(targetDir, { recursive: true })
  writeFileSync(join(targetDir, 'embedded-catalogs.generated.ts'), generateEmbeddedCatalogs(), 'utf-8')
  writeFileSync(join(targetDir, 'embedded-contexts.generated.ts'), generateEmbeddedContexts(), 'utf-8')
  writeFileSync(join(targetDir, 'embedded.generated.ts'), generateEmbeddedBarrel(), 'utf-8')
}

export function cleanDist(): void {
  const paths = getWorkspacePaths()
  if (existsSync(paths.dist)) {
    rmSync(paths.dist, { recursive: true, force: true })
  }
}

export function buildCodegen(): void {
  buildEmbeddedCatalogs()
  buildDomainTypes()
  buildFixturesManifest()
}

export function buildAll(): void {
  buildCodegen()
}

export function compile(target?: string): void {
  console.log('=== @bloggerspec/spec Codegen Pipeline ===')
  const t = (target || 'codegen').toLowerCase().replace(/^--target=/, '')

  switch (t) {
    case 'catalogs':
    case 'embedded':
      console.log('-> Generating embedded catalogs, contexts and domain types...')
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
    case 'codegen':
    case 'all':
    default:
      console.log('-> Generating embedded catalogs, contexts, domain types & fixtures manifest...')
      buildCodegen()
      break
  }

  console.log('\n[SUCCESS] @bloggerspec/spec codegen completed successfully!')
}

export const buildSpec = compile

export function verifyArtifactsFreshness(options?: { checkDts?: boolean }): BloggerVerificationFreshnessReport {
  const paths = getWorkspacePaths()
  const items: BloggerVerificationFreshnessItem[] = []

  if (options?.checkDts ?? true) {
    const requiredDist = [
      paths.dts,
      join(paths.dist, 'index.js'),
      join(paths.dist, 'ir/index.d.ts'),
      join(paths.dist, 'context/index.d.ts'),
      join(paths.dist, 'node.d.ts'),
    ]
    const missing = requiredDist.filter(f => !existsSync(f))
    if (missing.length > 0) {
      items.push({
        name: 'dist/index.d.ts',
        valid: false,
        error: `Missing compiled distribution artifact(s): ${missing.join(', ')}. Run \`pnpm run build\`.`,
      })
    }
    else {
      const dtsContent = readFileSync(paths.dts, 'utf-8')
      const valid = dtsContent.trim().length > 0
      items.push({
        name: 'dist/index.d.ts',
        valid,
        error: valid ? undefined : 'dist/index.d.ts is empty.',
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
        error: valid ? undefined : 'fixtures/index.json is out of date. Run `pnpm run build` to synchronize.',
      })
    }
    catch (err: any) {
      items.push({ name: 'fixtures/index.json', valid: false, error: err.message })
    }
  }

  const embeddedChecks: Array<{ rel: string, gen: () => string }> = [
    { rel: 'src/generated/embedded.generated.ts', gen: generateEmbeddedBarrel },
    { rel: 'src/generated/embedded-catalogs.generated.ts', gen: generateEmbeddedCatalogs },
    { rel: 'src/generated/embedded-contexts.generated.ts', gen: generateEmbeddedContexts },
  ]

  let embeddedAllValid = true
  const embeddedErrors: string[] = []
  for (const check of embeddedChecks) {
    const fullPath = join(paths.root, check.rel)
    if (!existsSync(fullPath)) {
      embeddedAllValid = false
      embeddedErrors.push(`${check.rel} does not exist.`)
      continue
    }
    const current = readFileSync(fullPath, 'utf-8').replace(/\r\n/g, '\n')
    const fresh = check.gen().replace(/\r\n/g, '\n')
    if (current !== fresh) {
      embeddedAllValid = false
      embeddedErrors.push(`${check.rel} is out of date.`)
    }
  }

  items.push({
    name: 'src/generated/embedded.generated.ts',
    valid: embeddedAllValid,
    error: embeddedAllValid ? undefined : embeddedErrors.join(' '),
  })

  const typesGeneratedPath = join(paths.root, 'src/generated/types.generated.ts')
  if (!existsSync(typesGeneratedPath)) {
    items.push({ name: 'src/generated/types.generated.ts', valid: false, error: 'File does not exist.' })
  }
  else {
    const currentTypes = readFileSync(typesGeneratedPath, 'utf-8').replace(/\r\n/g, '\n')
    const freshTypes = generateDomainTypes().replace(/\r\n/g, '\n')
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
