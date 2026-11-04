import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BloggerDivisionByZeroError,
  createDefaultEngineAdapter,
  evaluateExpression,
  inferExpressionType,
  parseExpression,
  runConformance,
  snippet,
  validateExpression,
} from '../src/index.js'
import { getWorkspacePaths, loadFixturesManifest } from '../src/node.js'

describe('runtime expression evaluator', () => {
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
      fixtures: loadFixturesManifest(),
      filter: {
        kind: 'expression',
      },
    })

    expect(report.total).toBe(176)
    expect(report.passed).toBe(176)
    expect(report.failed).toBe(0)
    expect(report.skipped).toBe(0)
  })

  it('evaluates variadic functional operators (+, and, or, ?:) with 3+ operands', () => {
    expect(evaluateExpression('+("Alpha", " ", "Beta", " ", "Gamma")', {})).toBe('Alpha Beta Gamma')
    expect(evaluateExpression('+(1, 2, 3, 4)', {})).toBe(10)
    expect(evaluateExpression('and(true, true, false)', {})).toBe(false)
    expect(evaluateExpression('and(true, true, true)', {})).toBe(true)
    expect(evaluateExpression('or(false, false, true)', {})).toBe(true)
    expect(evaluateExpression('or(false, false, false)', {})).toBe(false)
    expect(evaluateExpression('?:(data:missing1, data:missing2, "fallback")', {})).toBe('fallback')
    expect(evaluateExpression('?:(data:missing1, "first-fallback", "second-fallback")', {})).toBe('first-fallback')
  })

  it('enforces canonical neq operator and rejects non-existent ne, le, and ge aliases', () => {
    expect(evaluateExpression('10 neq 20', {})).toBe(true)
    expect(evaluateExpression('10 neq 10', {})).toBe(false)
    expect(evaluateExpression('neq("a", "b")', {})).toBe(true)

    expect(() => parseExpression('10 ne 20')).toThrow()
    expect(() => parseExpression('10 le 20')).toThrow()
    expect(() => parseExpression('10 ge 20')).toThrow()
    expect(validateExpression('ne(10, 20)').map(d => d.code)).toContain('BX1017')
    expect(validateExpression('le(10, 20)').map(d => d.code)).toContain('BX1017')
    expect(validateExpression('ge(10, 20)').map(d => d.code)).toContain('BX1017')
  })

  it('evaluates select lambda alias identically to map and where identically to filter', () => {
    const ctx = {
      items: [
        { title: 'A', active: true },
        { title: 'B', active: false },
        { title: 'C', active: true },
      ],
    }
    expect(evaluateExpression('data:items select (i => i.title)', ctx)).toEqual(['A', 'B', 'C'])
    expect(evaluateExpression('data:items where (i => i.active)', ctx)).toEqual([
      { title: 'A', active: true },
      { title: 'C', active: true },
    ])

    const blogCtx = { widgetType: 'Blog' }
    const selectAst = parseExpression('data:posts select (p => p.title)')
    expect(inferExpressionType(selectAst, blogCtx)).toBe('array[string]')
    const whereAst = parseExpression('data:posts where (p => p.allowComments)')
    expect(inferExpressionType(whereAst, blogCtx)).toBe('array[object]')
  })

  it('supports 3-operand infix chaining and string modifiers on resizeImage and sourceSet', () => {
    const ctx = {
      img: 'https://blogger.googleusercontent.com/img/a/sample.png',
    }
    expect(evaluateExpression('data:img resizeImage 300 resizeImage "1:1"', ctx)).toEqual(
      evaluateExpression('resizeImage(data:img, 300, "1:1")', ctx),
    )
    expect(String(evaluateExpression('data:img resizeImage 300 resizeImage "1:1"', ctx))).toBe(
      'https://blogger.googleusercontent.com/img/a/sample.png=w300-h300-p-k-no-nu',
    )
    expect(evaluateExpression('resizeImage(data:img, 300, "1:1").jsonEscaped', ctx)).toBe(
      'https://blogger.googleusercontent.com/img/a/sample.png=w300-h300-p-k-no-nu',
    )
    expect(evaluateExpression('resizeImage(data:img, 300, "1:1") == "https://blogger.googleusercontent.com/img/a/sample.png=w300-h300-p-k-no-nu"', ctx)).toBe(true)

    expect(evaluateExpression('data:img sourceSet [300, 600] sourceSet "16:9"', ctx)).toBe(
      evaluateExpression('sourceSet(data:img, [300, 600], "16:9")', ctx),
    )

    const multiSizes = evaluateExpression('resizeImage(data:img, [700, 300, 500], "1:1")', ctx) as any[]
    expect(Array.isArray(multiSizes)).toBe(true)
    expect(multiSizes.map(s => s.size)).toEqual([300, 500, 700])
  })

  it('resolves named property lookups on arrays of named items (e.g. allBylineItems.author)', () => {
    const ctx = {
      allBylineItems: [
        { name: 'author', label: 'By' },
        { name: 'timestamp', label: 'On' },
      ],
    }
    expect(evaluateExpression('data:allBylineItems.author.label', ctx)).toBe('By')
    expect(evaluateExpression('data:allBylineItems.timestamp.label', ctx)).toBe('On')
    expect(evaluateExpression('data:allBylineItems.comments', ctx)).toBeUndefined()
  })

  it('evaluates YouTube image modifiers (.isYouTube, .youtubeMaxResDefaultUrl)', () => {
    const ctx = {
      ytThumb: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      ytWatch: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      normalImg: 'https://blogger.googleusercontent.com/img/a/sample.png',
    }
    expect(evaluateExpression('data:ytThumb.isYouTube', ctx)).toBe(true)
    expect(evaluateExpression('data:ytThumb.youtubeMaxResDefaultUrl', ctx)).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    )
    expect(evaluateExpression('data:ytWatch.youtubeMaxResDefaultUrl', ctx)).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    )
    expect(evaluateExpression('data:normalImg.isYouTube', ctx)).toBe(false)
    expect(evaluateExpression('data:normalImg.youtubeMaxResDefaultUrl', ctx)).toBe(false)
  })

  it('enforces snippet length clamping [50, 1000], link preservation, linebreaks, and Unicode ellipsis', () => {
    const html = '<p>Hello <a href="https://example.com">world</a>!<br/>Second line with <b>bold</b> text and extra words to exceed fifty characters easily in tests.</p>'

    const clampedMin = snippet(html, { length: 10, links: false, linebreaks: false })
    expect(clampedMin.length).toBe(50)
    expect(clampedMin.endsWith('\u2026')).toBe(true)
    expect(clampedMin).not.toContain('<a')
    expect(clampedMin).not.toContain('\n')

    const withLinksAndBreaks = snippet('<p>Visit <a href="https://example.com">Example</a><br/>Now</p>', {
      length: 200,
      links: true,
      linebreaks: true,
    })
    expect(withLinksAndBreaks).toBe('Visit <a href="https://example.com">Example</a>\nNow')
  })

  it('normalizes canonical URLs stripping pagination, mobile params, and legacy archive filenames', () => {
    const ctx = {
      archiveUrl: 'https://example.com/2023_09_21_archive.html?m=1&updated-max=2023-10-01',
      pageUrl: 'https://example.com/2023/09/post.html?m=1',
    }
    expect(evaluateExpression('data:archiveUrl.canonical', ctx)).toBe('https://example.com/2023/09/')
    expect(evaluateExpression('data:pageUrl.canonical', ctx)).toBe('https://example.com/2023/09/post.html')
  })
})
