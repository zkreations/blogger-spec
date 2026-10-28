import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BloggerDivisionByZeroError,
  createDefaultEngineAdapter,
  evaluateExpression,
  runConformance,
} from '../src/index.js'
import { getWorkspacePaths } from '../src/paths.js'

describe('runtime expression evaluator (Plan 06)', () => {
  it('conforms 100% to all official and observed expression fixtures', () => {
    const dir = join(getWorkspacePaths().fixtures, 'expressions')
    expect(existsSync(dir)).toBe(true)

    const files = readdirSync(dir).filter(f => f.endsWith('.json'))
    expect(files.length).toBeGreaterThan(0)

    let totalCount = 0
    const failures: string[] = []

    for (const file of files) {
      const data = JSON.parse(readFileSync(join(dir, file), 'utf-8'))
      for (const f of data.fixtures || []) {
        totalCount++
        try {
          const actual = evaluateExpression(f.input.source, f.input.context || {})
          const isMatch = JSON.stringify(actual) === JSON.stringify(f.expected.value)
          if (!isMatch) {
            failures.push(
              `[${f.id}] '${f.input.source}': Expected ${JSON.stringify(f.expected.value)}, got ${JSON.stringify(actual)}`,
            )
          }
        }
        catch (err: any) {
          failures.push(`[${f.id}] '${f.input.source}': Threw exception: ${err.message}`)
        }
      }
    }

    expect(failures).toEqual([])
    expect(totalCount).toBeGreaterThanOrEqual(160)
  })

  it('provides null-safety on deep property navigation', () => {
    const res = evaluateExpression('data:nonExistentObject.deepProperty.leaf ?: "FALLBACK"', {})
    expect(res).toBe('FALLBACK')

    const nullObj = evaluateExpression('data:emptyObj.nested.leaf', { emptyObj: null })
    expect(nullObj).toBeUndefined()
  })

  it('performs arithmetic coercion on runtime data strings', () => {
    // String literal forces text concatenation
    expect(evaluateExpression('15 + "25"', {})).toBe('1525')

    // Variable numeric string performs arithmetic addition (Plan 06 empirical certainty)
    expect(evaluateExpression('15 + data:strNum', { strNum: '25' })).toBe(40)
  })

  it('evaluates string substring containment via in operator', () => {
    expect(evaluateExpression('"google" in "google.com"', {})).toBe(true)
    expect(evaluateExpression('"blogger" in "wordpress.com"', {})).toBe(false)
    expect(evaluateExpression('"google.com" contains "google"', {})).toBe(true)
  })

  it('aborts on division by zero by throwing BloggerDivisionByZeroError', () => {
    expect(() => evaluateExpression('10 / 0', {})).toThrowError(BloggerDivisionByZeroError)
    expect(() => evaluateExpression('10 % 0', {})).toThrowError(BloggerDivisionByZeroError)
    expect(() => evaluateExpression('/(100, 0)', {})).toThrowError(BloggerDivisionByZeroError)
  })

  it('returns external host URLs unmodified in resizeImage', () => {
    const extUrl = 'https://example.com/photo.jpg'
    expect(evaluateExpression(`resizeImage("${extUrl}", 300)`, {})).toBe(extUrl)
  })

  it('integrates with runConformance harness using createDefaultEngineAdapter', () => {
    const adapter = createDefaultEngineAdapter()
    expect(adapter.evaluateExpression).toBeDefined()

    const report = runConformance(adapter, {
      filter: {
        kind: 'expression',
      },
    })

    expect(report.total).toBe(176)
    expect(report.failed).toBe(0)
    expect(report.passed).toBe(164)
  })
})
