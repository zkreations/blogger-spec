/* eslint-disable no-console */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { getWorkspacePaths } from '../paths.js'

const BASE_URL = 'https://hamlet.zkreations.com'

const FEEDS_TO_SYNC = [
  {
    name: 'posts',
    url: `${BASE_URL}/feeds/posts/default?alt=json`,
    targetFilename: 'hamlet-posts-sample.json',
  },
  {
    name: 'pages',
    url: `${BASE_URL}/feeds/pages/default?alt=json`,
    targetFilename: 'hamlet-pages-sample.json',
  },
  {
    name: 'comments',
    url: `${BASE_URL}/feeds/comments/default?alt=json`,
    targetFilename: 'hamlet-comments-sample.json',
  },
] as const

export async function syncFeeds(): Promise<boolean> {
  console.log(`=== Syncing Hamlet Feeds from ${BASE_URL} ===\n`)
  const feedsDir = join(getWorkspacePaths().fixtures, 'feeds')

  try {
    for (const item of FEEDS_TO_SYNC) {
      console.log(`-> Fetching ${item.name} feed from: ${item.url}`)
      const res = await fetch(item.url, {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) {
        throw new Error(`Failed to fetch ${item.name}: ${res.status} ${res.statusText}`)
      }
      const data = await res.json()
      const entriesCount = data.feed?.entry?.length ?? 0
      console.log(`   Received ${entriesCount} entries for ${item.name}`)

      const targetPath = join(feedsDir, item.targetFilename)
      const formattedJson = `${JSON.stringify(data, null, 2)}\n`.replace(/\u202F/g, '\\u202f')
      writeFileSync(targetPath, formattedJson, 'utf8')
      console.log(`  [PASS] Saved to: ${targetPath}`)
    }

    console.log(`\n[SUCCESS] Successfully synchronized all Hamlet feeds!`)
    return true
  }
  catch (error) {
    console.error(`\n[ERROR] Failed to synchronize Hamlet feeds:`, error)
    return false
  }
}

if (process.argv[1]?.endsWith('sync-feeds.ts')) {
  void syncFeeds().then((success) => {
    if (!success) {
      process.exit(1)
    }
  })
}
