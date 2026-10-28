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
  dist: string
  dts: string
  workbench: string
}

let customRootDir: string | null = null

export function setCustomWorkspaceRoot(rootPath: string | null): void {
  customRootDir = rootPath
}

export function resolveWorkspaceRoot(): string {
  if (customRootDir) {
    return customRootDir
  }

  const candidate1 = join(__dirname, '..')
  if (existsSync(join(candidate1, 'catalogs'))) {
    return candidate1
  }

  const candidate2 = process.cwd()
  if (existsSync(join(candidate2, 'catalogs'))) {
    return candidate2
  }

  return candidate1
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
    dist,
    dts: join(dist, 'index.d.ts'),
    workbench: join(root, '.workbench'),
  }
}
