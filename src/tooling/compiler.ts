/* eslint-disable no-console */
import type { BloggerFixturesManifest } from '../types.js'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import {
  getDiagnostics,
  getDirectives,
  getGlobals,
  getOperators,
  MemoryCatalogStore,
  setDefaultCatalogStore,
} from '../catalogs/index.js'
import { getWorkspacePaths } from '../paths.js'

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

function toPascalCase(name: string): string {
  const cleaned = name.replace(/^b:/, '').replace(/[^a-z0-9]/gi, ' ')
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')
}

function sanitizePropName(name: string): string {
  if (/^[A-Z_$][\w$]*$/i.test(name)) {
    return name
  }
  return JSON.stringify(name)
}

export function generateDts(): string {
  const directivesData = getDirectives()
  const operatorsData = getOperators()
  const globalsData = getGlobals()
  const diagnosticsData = getDiagnostics()

  const lines: string[] = [
    '/**',
    ' * blogger-spec — Canonical Blogger XML Template & Expression Language Type Definitions.',
    ' * Automatically generated from master JSON catalogs.',
    ' * DO NOT EDIT MANUALLY.',
    ' */',
    '',
    'export * from \'./types.js\';',
    'export * from \'./ast.js\';',
    'export * from \'./catalogs/index.js\';',
    'export * from \'./helpers.js\';',
    'export * from \'./quota.js\';',
    'export * from \'./type-system.js\';',
    '',
    '// --- Subtypes & Aliases ---',
    'export type BloggerUrl = string;',
    'export type BloggerImage = string;',
    'export type BloggerDate = string;',
    'export type BloggerLocale = string;',
    'export type BloggerMessage = string;',
    'export type BloggerExpression = string;',
    '',
  ]

  const directives = directivesData.directives || {}
  const dirNames = Object.keys(directives).sort()
  lines.push(`export type BloggerDirectiveName = ${dirNames.map(d => `'${d}'`).join(' | ')};`)
  lines.push('')

  for (const dName of dirNames) {
    const dInfo = directives[dName]
    const pascal = toPascalCase(dName)
    lines.push(`/** Attributes for directive \`<${dName}>\` */`)
    lines.push(`export interface Blogger${pascal}DirectiveAttributes {`)
    const attrs = dInfo.attributes || {}
    for (const aName of Object.keys(attrs).sort()) {
      const aInfo = attrs[aName]
      const opt = aInfo.required ? '' : '?'
      let tsType = 'any'
      if (aInfo.type === 'string')
        tsType = 'string'
      else if (aInfo.type === 'number')
        tsType = 'number'
      else if (aInfo.type === 'boolean')
        tsType = 'boolean'
      else if (aInfo.type === 'expression')
        tsType = 'BloggerExpression'

      if (Array.isArray(aInfo.allowed_values) && aInfo.allowed_values.length > 0) {
        tsType = aInfo.allowed_values.map((v: any) => JSON.stringify(v)).join(' | ')
      }

      if (aInfo.description) {
        lines.push(`  /** ${aInfo.description.replace(/\n/g, ' ')} */`)
      }
      lines.push(`  ${sanitizePropName(aName)}${opt}: ${tsType};`)

      if (aInfo.expr) {
        lines.push(`  /** Dynamic expression for \`${aName}\` */`)
        lines.push(`  ${sanitizePropName(`expr:${aName}`)}?: BloggerExpression;`)
      }
    }
    lines.push('  [key: string]: any;')
    lines.push('}')
    lines.push('')
  }

  const rules = diagnosticsData.rules || {}
  const ruleCodes = Object.keys(rules).sort()
  lines.push(`export type BloggerDiagnosticCode = ${ruleCodes.map(c => `'${c}'`).join(' | ')};`)
  lines.push('')

  const operators = operatorsData.operators || {}
  const opNames = Object.keys(operators).sort()
  lines.push(`export type BloggerOperatorName = ${opNames.map(o => JSON.stringify(o)).join(' | ')};`)
  lines.push('')

  const globals = globalsData.objects || {}
  for (const gName of Object.keys(globals).sort()) {
    const cleanName = gName.replace(/^data:/, '')
    const pascal = toPascalCase(cleanName)
    lines.push(`/** Schema for global object \`${gName}\` */`)
    lines.push(`export interface Blogger${pascal}Global {`)
    const props = globals[gName]?.canonical || {}
    for (const pName of Object.keys(props).sort()) {
      lines.push(`  ${sanitizePropName(pName)}?: any;`)
    }
    lines.push('  [key: string]: any;')
    lines.push('}')
    lines.push('')
  }

  return lines.join('\n')
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
  const categories = ['expressions', 'templates', 'diagnostics']

  for (const cat of categories) {
    const catDir = join(paths.fixtures, cat)
    if (!existsSync(catDir))
      continue
    const files = readdirSync(catDir).filter((f: string) => f.endsWith('.json'))
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
  for (const f of allFixtures) {
    for (const c of f.covers || []) {
      coversSet.add(c)
    }
  }

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString().split('T')[0],
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

export function generateEmbeddedCatalogs(): string {
  const paths = getWorkspacePaths()
  const catalogsDir = paths.catalogs
  const schemasDir = paths.schemas

  const catalogNames = [
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

  const catalogs: Record<string, any> = {}
  for (const name of catalogNames) {
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

  return [
    '/**',
    ' * blogger-spec — Canonical In-Memory Embedded Catalogs & Schemas.',
    ' * Automatically generated from master JSON catalogs.',
    ' * DO NOT EDIT MANUALLY.',
    ' */',
    '',
    'import type { BloggerCatalogMap } from \'../types.js\'',
    '',
    `export const embeddedCatalogs: BloggerCatalogMap = ${JSON.stringify(catalogs, null, 2)} as unknown as BloggerCatalogMap;`,
    '',
    `export const embeddedSchemas: Record<string, any> = ${JSON.stringify(schemas, null, 2)};`,
    '',
  ].join('\n')
}

export function buildEmbeddedCatalogs(): void {
  const paths = getWorkspacePaths()
  const targetPath = join(paths.root, 'src/catalogs/embedded.generated.ts')
  const content = generateEmbeddedCatalogs()
  writeFileSync(targetPath, content, 'utf-8')

  const catalogNames = [
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
  const catalogs: Record<string, any> = {}
  for (const name of catalogNames) {
    const filePath = join(paths.catalogs, `${name}.json`)
    if (existsSync(filePath)) {
      catalogs[name] = JSON.parse(readFileSync(filePath, 'utf-8'))
    }
  }
  const schemas: Record<string, any> = {}
  if (existsSync(paths.schemas)) {
    const schemaFiles = readdirSync(paths.schemas).filter(f => f.endsWith('.schema.json'))
    for (const f of schemaFiles) {
      schemas[f] = JSON.parse(readFileSync(join(paths.schemas, f), 'utf-8'))
    }
  }
  setDefaultCatalogStore(new MemoryCatalogStore(catalogs as any, schemas))
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
    join(paths.root, 'src/helpers.ts'),
    join(paths.root, 'src/ast.ts'),
    join(paths.root, 'src/quota.ts'),
    join(paths.root, 'src/type-system.ts'),
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

export function buildAll(): void {
  const paths = getWorkspacePaths()
  buildEmbeddedCatalogs()
  buildFixturesManifest()
  compileTypescript()
  buildDts()

  const requiredArtifacts = [
    join(paths.dist, 'index.js'),
    join(paths.dist, 'index.d.ts'),
    join(paths.dist, 'runner.js'),
    join(paths.dist, 'runner.d.ts'),
    join(paths.dist, 'helpers.js'),
    join(paths.dist, 'helpers.d.ts'),
    join(paths.dist, 'ast.js'),
    join(paths.dist, 'ast.d.ts'),
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
      console.log('-> Generating embedded catalogs...')
      buildEmbeddedCatalogs()
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
      const currentDts = readFileSync(paths.dts, 'utf-8')
      const freshDts = generateDts()
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
      const valid = count === freshManifest.fixtures?.length && count > 0
      items.push({
        name: 'fixtures/index.json',
        valid,
        count,
        error: valid ? undefined : `fixtures/index.json is out of date (${count} vs ${freshManifest.fixtures?.length} fixtures).`,
      })
    }
    catch (err: any) {
      items.push({ name: 'fixtures/index.json', valid: false, error: err.message })
    }
  }

  const embeddedPath = join(paths.root, 'src/catalogs/embedded.generated.ts')
  if (!existsSync(embeddedPath)) {
    items.push({ name: 'src/catalogs/embedded.generated.ts', valid: false, error: 'File does not exist.' })
  }
  else {
    const currentEmbedded = readFileSync(embeddedPath, 'utf-8')
    const freshEmbedded = generateEmbeddedCatalogs()
    const valid = currentEmbedded === freshEmbedded
    items.push({
      name: 'src/catalogs/embedded.generated.ts',
      valid,
      error: valid ? undefined : 'src/catalogs/embedded.generated.ts is out of date.',
    })
  }

  return {
    allValid: items.every(i => i.valid),
    items,
  }
}
