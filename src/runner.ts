import type {
  BloggerEngineAdapter,
  BloggerFixture,
  BloggerFixturesManifest,
  ConformanceCaseResult,
  ConformanceOptions,
  ConformanceReport,
  SpecConsumerAdapter,
} from './types.js'
import { existsSync, readFileSync } from 'node:fs'
import { getWorkspacePaths } from './paths.js'

function resolveDefaultManifest(): BloggerFixturesManifest {
  const paths = getWorkspacePaths()
  if (existsSync(paths.fixturesManifest)) {
    return JSON.parse(readFileSync(paths.fixturesManifest, 'utf-8'))
  }
  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    metrics: { totalFixtures: 0, positiveFixtures: 0, negativeFixtures: 0, coveredSpecEntities: 0 },
    fixtures: [],
  }
}

function normalizeHtmlString(html?: string): string {
  if (!html)
    return ''
  return html
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim()
}

export function runConformance(
  adapter: BloggerEngineAdapter,
  options?: ConformanceOptions,
): ConformanceReport {
  let fixtures: BloggerFixture[] = []

  if (options?.fixtures) {
    if (Array.isArray(options.fixtures)) {
      fixtures = options.fixtures
    }
    else if ('fixtures' in options.fixtures && Array.isArray(options.fixtures.fixtures)) {
      fixtures = options.fixtures.fixtures
    }
  }
  else {
    fixtures = resolveDefaultManifest().fixtures
  }

  if (options?.filter) {
    const { kind, covers, evidence, ids } = options.filter
    fixtures = fixtures.filter((f) => {
      if (kind && f.input.kind !== kind)
        return false
      if (evidence && !evidence.includes(f.evidence))
        return false
      if (ids && !ids.includes(f.id))
        return false
      if (covers && !covers.some(c => f.covers.includes(c)))
        return false
      return true
    })
  }

  const normalizeHtml = options?.normalizeHtml || normalizeHtmlString

  const report: ConformanceReport = {
    total: fixtures.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    results: [],
  }

  for (const fixture of fixtures) {
    const { id, input, expected } = fixture

    if (expected.outcome === 'rejected') {
      if (!adapter.analyze) {
        report.skipped++
        continue
      }
      try {
        const diagnostics = adapter.analyze(input.source, input.kind)
        const actualCodes = new Set((diagnostics || []).map(d => d.code))
        const missingCodes = (expected.diagnosticCodes || []).filter(c => !actualCodes.has(c))

        if (missingCodes.length === 0) {
          report.passed++
          report.results.push({
            id,
            passed: true,
            expected: expected.diagnosticCodes,
            actual: Array.from(actualCodes),
          })
        }
        else {
          report.failed++
          report.results.push({
            id,
            passed: false,
            message: `Missing expected diagnostic code(s): ${missingCodes.join(', ')}`,
            expected: expected.diagnosticCodes,
            actual: Array.from(actualCodes),
          })
        }
      }
      catch (err: any) {
        report.failed++
        report.results.push({
          id,
          passed: false,
          message: `Analyzer threw exception: ${err.message}`,
          expected: expected.diagnosticCodes,
        })
      }
      continue
    }

    if (input.kind === 'expression') {
      if (!adapter.evaluateExpression) {
        report.skipped++
        continue
      }
      try {
        const actualValue = adapter.evaluateExpression(input.source, input.context || {})
        const isMatch = JSON.stringify(actualValue) === JSON.stringify(expected.value)
        if (isMatch) {
          report.passed++
          report.results.push({ id, passed: true, expected: expected.value, actual: actualValue })
        }
        else {
          report.failed++
          report.results.push({
            id,
            passed: false,
            message: `Value mismatch. Expected ${JSON.stringify(expected.value)}, got ${JSON.stringify(actualValue)}`,
            expected: expected.value,
            actual: actualValue,
          })
        }
      }
      catch (err: any) {
        report.failed++
        report.results.push({
          id,
          passed: false,
          message: `Evaluation threw exception: ${err.message}`,
          expected: expected.value,
        })
      }
      continue
    }

    if (input.kind === 'template') {
      if (!adapter.renderTemplate) {
        report.skipped++
        continue
      }
      try {
        const actualHtml = adapter.renderTemplate(input.source, input.context || {})
        const expectedNorm = normalizeHtml(expected.html)
        const actualNorm = normalizeHtml(actualHtml)
        const isMatch = actualNorm === expectedNorm

        if (isMatch) {
          report.passed++
          report.results.push({ id, passed: true, expected: expected.html, actual: actualHtml })
        }
        else {
          report.failed++
          report.results.push({
            id,
            passed: false,
            message: `HTML mismatch. Expected: ${expected.html}, Got: ${actualHtml}`,
            expected: expected.html,
            actual: actualHtml,
          })
        }
      }
      catch (err: any) {
        report.failed++
        report.results.push({
          id,
          passed: false,
          message: `Rendering threw exception: ${err.message}`,
          expected: expected.html,
        })
      }
      continue
    }

    report.skipped++
  }

  return report
}

export const runSpecConformance = runConformance

export type {
  BloggerEngineAdapter,
  ConformanceCaseResult,
  ConformanceOptions,
  ConformanceReport,
  SpecConsumerAdapter,
}
