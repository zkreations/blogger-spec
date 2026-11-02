/* eslint-disable no-console */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { resolveHamletContext } from '../../tests/helpers/hamlet-provider.js'
import { BloggerReferenceRenderer } from '../ir/reference-renderer.js'
import { getWorkspacePaths } from '../paths.js'
import { normalizeHtmlString } from '../runner.js'

export const CANONICAL_VIEWS = [
  'homepage',
  'post',
  'static_page',
  'label_search',
  'archive_yearly',
  'archive_monthly',
  'archive_weekly_daily',
  'post_listing',
  'search_query',
  'error_404',
  'preview',
] as const

export async function syncGoldenViews(): Promise<boolean> {
  console.log('-> Synchronizing Golden Master views for hamlet.xml using Hamlet feed context...')
  try {
    const paths = getWorkspacePaths()
    const hamletXmlPath = join(paths.fixtures, 'templates', 'samples', 'hamlet.xml')
    const hamletXml = readFileSync(hamletXmlPath, 'utf8')
    const goldenDir = join(paths.fixtures, 'templates', 'golden', 'views')

    mkdirSync(goldenDir, { recursive: true })

    const renderer = new BloggerReferenceRenderer({
      emitWrappers: true,
      normalizeProtocolRelativeUrls: true,
    })

    for (const viewId of CANONICAL_VIEWS) {
      const context = await resolveHamletContext(viewId)
      const rawHtml = renderer.render(hamletXml, context)
      const normalizedHtml = normalizeHtmlString(rawHtml)

      const targetFile = join(goldenDir, `${viewId}.html`)
      writeFileSync(targetFile, `${normalizedHtml}\n`, 'utf8')
      console.log(`  [PASS] Generated Golden Master: ${viewId}.html`)
    }

    console.log(`[SUCCESS] Synchronized all ${CANONICAL_VIEWS.length} Golden Master views to: ${goldenDir}`)
    return true
  }
  catch (error) {
    console.error('[ERROR] Failed to synchronize Golden Master views:', error)
    return false
  }
}

if (process.argv[1]?.endsWith('sync-golden-views.ts')) {
  void syncGoldenViews().then((success) => {
    if (!success) {
      process.exit(1)
    }
  })
}
