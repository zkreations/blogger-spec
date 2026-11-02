import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BloggerReferenceRenderer,
  getMockContext,
  parseTemplate,
  validateTemplateExpressions,
  validateTemplateStructure,
} from '../src/index.js'
import { getWorkspacePaths } from '../src/paths.js'

describe('hamlet e2e golden master conformance suite', () => {
  const hamletXmlPath = join(getWorkspacePaths().fixtures, 'templates/samples/hamlet.xml')
  const hamletXml = readFileSync(hamletXmlPath, 'utf8')

  it('validates canonical hamlet.xml without fatal structural diagnostics', () => {
    expect(existsSync(hamletXmlPath)).toBe(true)

    const structureDiags = validateTemplateStructure(hamletXml)
    // In raw template files, Theme Designer <Variable> tags provide 'default' before user customization
    const fatalStructureErrors = structureDiags.filter(
      d => d.severity === 'error' && !(d.code === 'BX1022' && d.tagName === 'Variable'),
    )
    expect(fatalStructureErrors.length).toBe(0)

    const exprDiags = validateTemplateExpressions(hamletXml)
    const fatalExprErrors = exprDiags.filter(d => d.severity === 'error')
    expect(fatalExprErrors.length).toBe(0)
  })

  it('parses full hamlet.xml AST containing all 3 sections and 4 widgets', () => {
    const doc = parseTemplate(hamletXml)

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

  it('certifies 100% body class and structural section conformance across all 11 canonical views hermetically', () => {
    const canonicalViews = [
      'homepage',
      'post',
      'static_page',
      'label_search',
      'archive_yearly',
      'archive_monthly',
      'archive_weekly_daily',
      'post_listing',
      'search_query',
      'error_404',
      'preview',
    ] as const

    const renderer = new BloggerReferenceRenderer({ emitWrappers: true })

    for (const viewId of canonicalViews) {
      const ctx = getMockContext(viewId, viewId === 'post' ? { view: { saa: '85391' } } : undefined)
      const renderedHtml = renderer.render(hamletXml, ctx)

      const bodyMatch = renderedHtml.match(/<body([^>]*)>/i)
      expect(bodyMatch, `body tag for view ${viewId} must be found`).toBeDefined()
      const classMatch = bodyMatch![1]?.match(/class=['"]([^'"]*)['"]/i)
      const rawBodyClasses = classMatch ? classMatch[1]!.split(/\s+/).filter(Boolean) : []

      if (ctx.view.isHomepage)
        expect(rawBodyClasses).toContain('is-home')
      if (ctx.view.isMultipleItems)
        expect(rawBodyClasses).toContain('is-items')
      if (ctx.view.isPost)
        expect(rawBodyClasses).toContain('is-post')
      if (ctx.view.isPage)
        expect(rawBodyClasses).toContain('is-page')
      if (ctx.view.isArchive)
        expect(rawBodyClasses).toContain('is-archive')
      if (ctx.view.isLabelSearch)
        expect(rawBodyClasses).toContain('is-label')
      if (ctx.view.isSearch)
        expect(rawBodyClasses).toContain('is-search')
      if (ctx.view.isError)
        expect(rawBodyClasses).toContain('is-error')
      if (ctx.view.isSingleItem)
        expect(rawBodyClasses).toContain('is-single')

      expect(renderedHtml).toContain('id="sidebar"')
      expect(renderedHtml).toContain('id="header"')
      expect(renderedHtml).toContain('id="content"')
      expect(renderedHtml).toContain('PageList1')
      expect(renderedHtml).toContain('Label1')
      expect(renderedHtml).toContain('Header1')
      expect(renderedHtml).toContain('Blog1')
    }
  })

  it('verifies Theme Designer CSS variable substitution on rendered template', () => {
    const renderer = new BloggerReferenceRenderer()
    const ctx = getMockContext('homepage')
    const html = renderer.render(hamletXml, ctx)

    expect(html).toContain('<style id=\'page-skin-1\' type=\'text/css\'><!--')
    expect(html).toContain('--primary: #14b8a6;')
    expect(html).toContain('--color-title: #222;')
    expect(html).toContain('--bg-sidebar: #fff;')
  })
})
