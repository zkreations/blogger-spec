import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  getMockContext,
  parseTemplate,
  validateTemplateExpressions,
  validateTemplateStructure,
} from '../src/index.js'
import { getWorkspacePaths } from '../src/paths.js'

describe('hamlet e2e golden master conformance suite (Phase 5)', () => {
  const hamletXmlPath = join(getWorkspacePaths().fixtures, 'templates/samples/hamlet.xml')
  const hamletCapturesDir = join(getWorkspacePaths().workbench, 'captures/raw/hamlet')
  const manifestPath = join(hamletCapturesDir, 'views_manifest.json')
  const hasCaptures = existsSync(manifestPath)

  it('validates canonical hamlet.xml without fatal structural diagnostics', () => {
    expect(existsSync(hamletXmlPath)).toBe(true)
    const xml = readFileSync(hamletXmlPath, 'utf8')

    const structureDiags = validateTemplateStructure(xml)
    // In raw template files, Theme Designer <Variable> tags provide 'default' before user customization
    const fatalStructureErrors = structureDiags.filter(
      d => d.severity === 'error' && !(d.code === 'BX1022' && d.tagName === 'Variable'),
    )
    expect(fatalStructureErrors.length).toBe(0)

    const exprDiags = validateTemplateExpressions(xml)
    const fatalExprErrors = exprDiags.filter(d => d.severity === 'error')
    expect(fatalExprErrors.length).toBe(0)
  })

  it('parses full hamlet.xml AST containing all 3 sections and 4 widgets', () => {
    const xml = readFileSync(hamletXmlPath, 'utf8')
    const doc = parseTemplate(xml)

    expect(doc.type).toBe('Document')
    expect(doc.doctype).toBe('<!DOCTYPE html>')

    const html = doc.children.find(c => c.type === 'Element' && c.name === 'html') as any
    expect(html).toBeDefined()
    expect(html.attributes.some((a: any) => a.name === 'b:layoutsVersion' && a.value === '3')).toBe(true)

    const sections: string[] = []
    const widgets: string[] = []

    function walk(node: any) {
      if (node.type === 'Directive') {
        if (node.name === 'b:section') {
          const id = node.attributes.find((a: any) => a.name === 'id')?.value
          if (id)
            sections.push(id)
        }
        else if (node.name === 'b:widget') {
          const id = node.attributes.find((a: any) => a.name === 'id')?.value
          if (id)
            widgets.push(id)
        }
      }
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          walk(child)
        }
      }
    }

    walk(doc)
    expect(sections).toEqual(['sidebar', 'header', 'content'])
    expect(widgets).toEqual(['PageList1', 'Label1', 'Header1', 'Blog1'])
  })

  it.runIf(hasCaptures)('certifies 100% body class and structural section conformance across all 11 views', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    expect(Array.isArray(manifest.views)).toBe(true)
    expect(manifest.views.length).toBe(11)

    for (const item of manifest.views) {
      const htmlFile = join(hamletCapturesDir, item.file)
      expect(existsSync(htmlFile), `Capture file ${item.file} must exist`).toBe(true)
      const rawHtml = readFileSync(htmlFile, 'utf8')

      // 1. Extract raw body classes
      const bodyMatch = rawHtml.match(/<body([^>]*)>/i)
      expect(bodyMatch, `body tag in ${item.file} must be found`).toBeDefined()
      const classMatch = bodyMatch![1]?.match(/class=['"]([^'"]*)['"]/i)
      const rawBodyClasses = classMatch ? classMatch[1]!.split(/\s+/).filter(Boolean).sort() : []

      // 2. Evaluate simulated body classes via getMockContext
      const viewId = item.view === 'search_empty' ? 'search_query' : item.view
      const ctx = getMockContext(viewId)

      const evaluatedClasses: string[] = []
      if (ctx.view.isHomepage)
        evaluatedClasses.push('is-home')
      if (ctx.view.isMultipleItems)
        evaluatedClasses.push('is-items')
      if (ctx.view.isPost)
        evaluatedClasses.push('is-post')
      if (ctx.view.isPage)
        evaluatedClasses.push('is-page')
      if (ctx.view.isArchive)
        evaluatedClasses.push('is-archive')
      if (ctx.view.isLabelSearch)
        evaluatedClasses.push('is-label')
      if (ctx.view.isSearch)
        evaluatedClasses.push('is-search')
      if (ctx.view.isError)
        evaluatedClasses.push('is-error')
      if (ctx.view.isPreview)
        evaluatedClasses.push('is-preview')
      if (ctx.view.isSingleItem)
        evaluatedClasses.push('is-single')
      evaluatedClasses.sort()

      // Base classes without dynamic id must match exactly
      const baseRawClasses = rawBodyClasses.filter(c => !c.startsWith('single-id-'))
      expect(
        baseRawClasses,
        `Body base classes for view '${item.view}' in ${item.file} must match evaluated @kind inclusion`,
      ).toEqual(evaluatedClasses)

      // If single item, verify dynamic single-id class presence
      if (ctx.view.isSingleItem) {
        const hasSingleIdClass = rawBodyClasses.some(c => c.startsWith('single-id-'))
        expect(hasSingleIdClass, `Single-id class must be present on ${item.file}`).toBe(true)
      }

      // 3. Verify canonical synthetic section and widget containers
      expect(rawHtml).toContain('id=\'sidebar\'')
      expect(rawHtml).toContain('id=\'header\'')
      expect(rawHtml).toContain('id=\'content\'')
      expect(rawHtml).toContain('PageList1')
      expect(rawHtml).toContain('Label1')
      expect(rawHtml).toContain('Header1')
      expect(rawHtml).toContain('Blog1')
    }
  })

  it.runIf(hasCaptures)('verifies Theme Designer CSS variable substitution against homepage capture', () => {
    const homepageHtmlPath = join(hamletCapturesDir, 'homepage.html')
    const rawHtml = readFileSync(homepageHtmlPath, 'utf8')

    // Style page-skin wrapper
    expect(rawHtml).toContain('<style id=\'page-skin-1\' type=\'text/css\'><!--')

    // Key root variables substituted by Blogger
    expect(rawHtml).toContain('--primary: #14b8a6;')
    expect(rawHtml).toContain('--color-title: #222222;')
    expect(rawHtml).toContain('--bg-sidebar: #ffffff;')
  })
})
