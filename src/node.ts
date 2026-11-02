import type { BloggerFixturesManifest } from './types.js'
import { existsSync, readFileSync } from 'node:fs'
import { getWorkspacePaths } from './paths.js'

export {
  FsCatalogStore,
  getCatalogsDirectory,
  getSchemasDirectory,
} from './catalogs/fs-store.js'

export {
  type BloggerWorkspacePaths,
  getWorkspacePaths,
  resolveWorkspaceRoot,
  setCustomWorkspaceRoot,
} from './paths.js'

export function loadFixturesManifest(overrideRoot?: string): BloggerFixturesManifest {
  const paths = getWorkspacePaths(overrideRoot)
  if (existsSync(paths.fixturesManifest)) {
    return JSON.parse(readFileSync(paths.fixturesManifest, 'utf-8')) as BloggerFixturesManifest
  }
  throw new Error(`Fixtures manifest not found: ${paths.fixturesManifest}`)
}
