import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface BloggerWorkspacePaths {
  root: string
  src: string
  catalogs: string
  schemas: string
  fixtures: string
  fixturesManifest: string
  contexts: string
  dist: string
  dts: string
}

let customRootDir: string | null = null

export function setCustomWorkspaceRoot(rootPath: string | null): void {
  customRootDir = rootPath
}

export function resolveWorkspaceRoot(): string {
  if (customRootDir) {
    return customRootDir
  }

  // When executed from src/node or dist/node, root is two levels up
  const candidateTwoLevelsUp = join(__dirname, '../..')
  if (existsSync(join(candidateTwoLevelsUp, 'catalogs'))) {
    return candidateTwoLevelsUp
  }

  // Fallback for one level up
  const candidateOneLevelUp = join(__dirname, '..')
  if (existsSync(join(candidateOneLevelUp, 'catalogs'))) {
    return candidateOneLevelUp
  }

  const candidateCwd = process.cwd()
  if (existsSync(join(candidateCwd, 'catalogs'))) {
    return candidateCwd
  }

  return candidateTwoLevelsUp
}

export function getWorkspacePaths(overrideRoot?: string): BloggerWorkspacePaths {
  const root = overrideRoot || resolveWorkspaceRoot()
  const catalogs = join(root, 'catalogs')
  const fixtures = join(root, 'fixtures')
  const dist = join(root, 'dist')

  return {
    root,
    src: join(root, 'src'),
    catalogs,
    schemas: join(catalogs, 'schemas'),
    fixtures,
    fixturesManifest: join(fixtures, 'index.json'),
    contexts: join(fixtures, 'contexts'),
    dist,
    dts: join(dist, 'index.d.ts'),
  }
}
