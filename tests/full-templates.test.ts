import type { BloggerFixture } from '../src/types.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createDefaultEngineAdapter,
  normalizeHtmlString,
  parseTemplate,
  runConformance,
} from '../src/index.js'
import { getWorkspacePaths } from '../src/paths.js'

describe('full templates conformance suite', () => {
  const fullTemplatesPath = join(getWorkspacePaths().fixtures, 'templates', 'full_templates.json')
  const suiteData = JSON.parse(readFileSync(fullTemplatesPath, 'utf-8')) as {
    subsystem: string
    fixtures: BloggerFixture[]
  }

  it('defines at least 6 canonical full template fixtures covering the required views', () => {
    expect(suiteData.fixtures.length).toBeGreaterThanOrEqual(6)
    const ids = suiteData.fixtures.map(f => f.id)
    expect(ids).toContain('templates/full_templates/homepage')
    expect(ids).toContain('templates/full_templates/post')
    expect(ids).toContain('templates/full_templates/static_page')
    expect(ids).toContain('templates/full_templates/search')
    expect(ids).toContain('templates/full_templates/archive')
    expect(ids).toContain('templates/full_templates/error_404')
  })

  it('parses all full template fixtures with parseTemplate into valid ASTs', () => {
    for (const fixture of suiteData.fixtures) {
      const doc = parseTemplate(fixture.input.source)
      expect(doc.type).toBe('Document')
      expect(doc.children.length).toBeGreaterThan(0)
      expect(doc.doctype).toBe('<!DOCTYPE html>')
    }
  })

  describe('normalizeHtmlString', () => {
    it('normalizes whitespace between tags and collapses repeated spaces', () => {
      const input = '<div>   <span>  Hello   World  </span>   </div>'
      const expected = '<div><span>Hello World</span></div>'
      expect(normalizeHtmlString(input)).toBe(expected)
    })

    it('normalizes self-closing slashes on HTML void elements', () => {
      const withSlash = '<img alt="Test" src="https://example.com/test.png"/>'
      const withoutSlash = '<img alt="Test" src="https://example.com/test.png">'
      expect(normalizeHtmlString(withSlash)).toBe(normalizeHtmlString(withoutSlash))
    })

    it('sorts HTML element attributes alphabetically and standardizes quotes', () => {
      const attrOrder1 = '<div id="main" class="container" data-test="true">Content</div>'
      const attrOrder2 = '<div class=\'container\' data-test=\'true\' id=\'main\'>Content</div>'
      expect(normalizeHtmlString(attrOrder1)).toBe(normalizeHtmlString(attrOrder2))
      expect(normalizeHtmlString(attrOrder1)).toBe(
        '<div class="container" data-test="true" id="main">Content</div>',
      )
    })
  })

  describe('runConformance with canonical renderer adapter', () => {
    it('achieves 100% pass rate on full template suite with conforming adapter', () => {
      const adapter = createDefaultEngineAdapter()
      const report = runConformance(adapter, {
        fixtures: suiteData.fixtures,
      })

      if (report.failed > 0) {
        const failures = report.results.filter(r => !r.passed)
        console.error('Full template failures:', JSON.stringify(failures, null, 2))
      }

      expect(report.total).toBe(suiteData.fixtures.length)
      expect(report.passed).toBe(suiteData.fixtures.length)
      expect(report.failed).toBe(0)
      expect(report.skipped).toBe(0)
    })
  })
})
