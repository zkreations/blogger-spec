import type { BloggerFixture, BloggerFixturesManifest } from '../src/types.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { evaluateExpression, parseExpression, parseTemplate, validateTemplateExpressions } from '../src/index.js'
import { getWorkspacePaths } from '../src/paths.js'
import { runConformance } from '../src/runner.js'

describe('production template fragments suite (Priority 1)', () => {
  const prodFragmentsPath = join(getWorkspacePaths().fixtures, 'templates', 'prod_fragments.json')
  const suiteData = JSON.parse(readFileSync(prodFragmentsPath, 'utf-8')) as {
    subsystem: string
    fixtures: BloggerFixture[]
  }

  it('loads production fragments suite adhering to subsystem contract', () => {
    expect(suiteData.subsystem).toBe('prod_fragments')
    expect(Array.isArray(suiteData.fixtures)).toBe(true)
    expect(suiteData.fixtures.length).toBe(5)

    for (const fixture of suiteData.fixtures) {
      expect(fixture.id).toMatch(/^templates\/prod_fragments\//)
      expect(fixture.evidence).toBe('official')
      expect(fixture.verified_at).toBe('2026-10-28')
      expect(fixture.covers).toContain('subsystem:prod_fragments')
      expect(fixture.expected.outcome).toBe('html')
      expect(fixture.expected.canonicalDom).toBe(true)
    }
  })

  it('parses all production fragments into valid AST without syntax diagnostics', () => {
    for (const fixture of suiteData.fixtures) {
      const doc = parseTemplate(fixture.input.source)
      expect(doc.diagnostics ?? []).toEqual([])
      expect(doc.children.length).toBeGreaterThan(0)

      const diags = validateTemplateExpressions(fixture.input.source)
      const errorDiags = diags.filter(d => d.severity === 'error')
      expect(errorDiags).toEqual([])
    }
  })

  it('evaluates dynamic expressions inside production fragments with realistic contexts', () => {
    const postCardFixture = suiteData.fixtures.find(f => f.id === 'templates/prod_fragments/post_card')!
    const context = postCardFixture.input.context as Record<string, any>

    const exprNode = parseExpression('resizeImage(data:post.featuredImage, 300, "1:1")')
    const evaluated = evaluateExpression(exprNode, context)
    expect(String(evaluated)).toBe('https://blogger.googleusercontent.com/img/a/AVvXsEjxyz=w300-h300-p-k-no-nu')

    const bylineFixture = suiteData.fixtures.find(f => f.id === 'templates/prod_fragments/byline_render')!
    const bylineContext = bylineFixture.input.context as Record<string, any>
    const bylineCondition = parseExpression('data:show.comments and data:post.numberOfComments > 0')
    expect(evaluateExpression(bylineCondition, bylineContext)).toBe(true)
  })

  it('integrates seamlessly with the conformance test runner harness', () => {
    const report = runConformance(
      {
        renderTemplate: (source) => {
          const matched = suiteData.fixtures.find(f => f.input.source === source)
          return matched?.expected.html || ''
        },
      },
      {
        fixtures: suiteData.fixtures,
      },
    )

    expect(report.total).toBe(5)
    expect(report.passed).toBe(5)
    expect(report.failed).toBe(0)
  })

  it('verifies that prod_fragments are indexed in the global fixtures manifest', () => {
    const manifest = JSON.parse(readFileSync(getWorkspacePaths().fixturesManifest, 'utf-8')) as BloggerFixturesManifest
    const manifestProdFixtures = manifest.fixtures.filter(f => f.id.startsWith('templates/prod_fragments/'))
    expect(manifestProdFixtures.length).toBe(5)
  })
})
