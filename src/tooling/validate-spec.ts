/* eslint-disable no-console */
import process from 'node:process'
import { validateSpec } from './validator.js'

export { validateSpec } from './validator.js'

export function runCliValidation(): boolean {
  console.log('=== blogger-spec Validation Suite ===')
  const report = validateSpec({
    reporter: (msg: string) => console.log(msg),
  })

  if (!report.valid) {
    console.error(`\n[FAIL] Found ${report.errors.length} validation error(s):`)
    for (const err of report.errors) {
      console.error(`  - ${err}`)
    }
    return false
  }

  console.log('\n[SUCCESS] blogger-spec passed all schema and consistency checks 100%!')
  return true
}

if (process.argv[1] && (process.argv[1].endsWith('validate-spec.ts') || process.argv[1].endsWith('validate-spec.js'))) {
  const passed = runCliValidation()
  if (!passed) {
    process.exit(1)
  }
}
