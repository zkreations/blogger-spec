/* eslint-disable no-console */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { parseTemplate } from '../parser/template-parser.js'
import { getWorkspacePaths } from '../paths.js'

const HAMLET_RAW_URL = 'https://raw.githubusercontent.com/zkreations/hamlet/refs/heads/main/dist/hamlet.xml'

export async function syncSamples(): Promise<boolean> {
  console.log(`-> Fetching latest Hamlet template from: ${HAMLET_RAW_URL}`)

  try {
    const response = await fetch(HAMLET_RAW_URL)
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`)
    }

    const xml = await response.text()
    if (!xml || xml.length < 1000) {
      throw new Error(`Received unexpectedly small response (${xml.length} bytes)`)
    }

    console.log(`-> Validating template syntax with parseTemplate (${xml.length} bytes)...`)
    const doc = parseTemplate(xml)
    if (doc.type !== 'Document' || doc.children.length === 0) {
      throw new Error('Parsed document does not contain valid AST children')
    }

    const targetPath = join(getWorkspacePaths().fixtures, 'templates', 'samples', 'hamlet.xml')
    writeFileSync(targetPath, xml, 'utf-8')
    console.log(`[SUCCESS] Synchronized canonical Hamlet template to: ${targetPath}`)
    return true
  }
  catch (error) {
    console.error(`[ERROR] Failed to synchronize Hamlet template:`, error)
    return false
  }
}

if (process.argv[1]?.endsWith('sync-samples.ts')) {
  void syncSamples().then((success) => {
    if (!success) {
      process.exit(1)
    }
  })
}
