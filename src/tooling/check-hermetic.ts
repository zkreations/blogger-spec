/* eslint-disable no-console */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import process from 'node:process'
import { getWorkspacePaths } from '../paths.js'

interface Violation {
  file: string
  line: number
  rule: string
  detail: string
}

const FORBIDDEN_PATTERNS: { regex: RegExp, rule: string, allowlist?: string[] }[] = [
  {
    regex: /['"`](?:\.{1,2}\/)?(?:audit|plans)\//g,
    rule: 'Legacy unversioned directory references ("audit/" or "plans/") are forbidden in tracked code.',
  },
  {
    regex: /['"`][A-Z]:\\/g,
    rule: 'Hardcoded Windows drive letter paths are forbidden; use platform-agnostic paths.',
  },
  {
    regex: /['"`]\/(?:Users|home)\//g,
    rule: 'Hardcoded absolute user paths (/Users/ or /home/) are forbidden.',
  },
  {
    regex: /join\(\s*process\.cwd\(\)\s*,\s*['"`]fixtures/g,
    rule: 'Use getWorkspacePaths().fixtures instead of join(process.cwd(), "fixtures").',
  },
]

function scanDirectory(dir: string, baseDir: string, violations: Violation[]) {
  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const relPath = relative(baseDir, fullPath).replace(/\\/g, '/')

    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      scanDirectory(fullPath, baseDir, violations)
      continue
    }

    if (relPath.endsWith('check-hermetic.ts')) {
      continue
    }

    if (!fullPath.endsWith('.ts') && !fullPath.endsWith('.js') && !fullPath.endsWith('.json')) {
      continue
    }

    const content = readFileSync(fullPath, 'utf-8')
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i]!

      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.allowlist && pattern.allowlist.some(allowed => relPath.endsWith(allowed))) {
          continue
        }

        pattern.regex.lastIndex = 0
        if (pattern.regex.test(lineText)) {
          violations.push({
            file: relPath,
            line: i + 1,
            rule: pattern.rule,
            detail: lineText.trim(),
          })
        }
      }
    }
  }
}

export function runHermeticCheck(): boolean {
  const paths = getWorkspacePaths()
  const violations: Violation[] = []

  scanDirectory(paths.src, paths.root, violations)
  scanDirectory(join(paths.root, 'tests'), paths.root, violations)

  if (violations.length > 0) {
    console.error(`\n❌ Found ${violations.length} hermeticity violations in source and tests:\n`)
    for (const v of violations) {
      console.error(`  - ${v.file}:${v.line}`)
      console.error(`    Rule: ${v.rule}`)
      console.error(`    Code: ${v.detail}\n`)
    }
    return false
  }

  console.log('✅ Hermetic check passed: all tests and sources are isolated and reproducible.')
  return true
}

if (process.argv[1]?.endsWith('check-hermetic.ts')) {
  const passed = runHermeticCheck()
  if (!passed) {
    process.exit(1)
  }
}
