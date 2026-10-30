import { describe, expect, it } from 'vitest'
import { compileSkinCss, parseThemeDesignerFont } from '../src/skin-compiler.js'

describe('skin compiler & variable substitution engine (Priority 2)', () => {
  it('parses theme designer font strings into composite attributes', () => {
    const font1 = parseThemeDesignerFont('normal normal 14px Arial, sans-serif')
    expect(font1.style).toBe('normal')
    expect(font1.weight).toBe('normal')
    expect(font1.size).toBe('14px')
    expect(font1.family).toBe('Arial, sans-serif')

    const font2 = parseThemeDesignerFont('italic bold 1.25rem "Roboto", sans-serif')
    expect(font2.style).toBe('italic')
    expect(font2.weight).toBe('bold')
    expect(font2.size).toBe('1.25rem')
    expect(font2.family).toBe('"Roboto", sans-serif')

    const empty = parseThemeDesignerFont('')
    expect(empty.raw).toBe('')
    expect(empty.family).toBeUndefined()
  })

  it('substitutes basic color and scalar variables in raw css', () => {
    const skinXml = `
      <b:skin><![CDATA[
        <Group description="Theme Colors">
          <Variable name="body.bg" description="Background color" type="color" default="#f5f5f5" value="#ffffff"/>
          <Variable name="body.color" description="Text color" type="color" default="#333333"/>
        </Group>
        body {
          background-color: $(body.bg);
          color: $(body.color);
        }
      ]]></b:skin>
    `

    const result = compileSkinCss(skinXml, { wrap: 'none' })
    expect(result.css).toContain('background-color: #ffffff;')
    expect(result.css).toContain('color: #333333;')
    expect(result.css).not.toContain('<Variable')
    expect(result.css).not.toContain('<Group')
    expect(result.variables['body.bg']).toBe('#ffffff')
    expect(result.variables.body_bg).toBe('#ffffff')
    expect(result.variables['body.color']).toBe('#333333')
  })

  it('decomposes composite font variables into family, size, style, and weight', () => {
    const skinXml = `
      <Variable name="title.font" type="font" default="normal bold 18px 'Helvetica Neue', Arial, sans-serif"/>
      h1 {
        font: $(title.font);
        font-family: $(title.font.family);
        font-size: $(title.font.size);
        font-weight: $(title.font.weight);
        font-style: $(title.font.style);
      }
    `

    const result = compileSkinCss(skinXml, { wrap: false })
    expect(result.css).toContain('font: normal bold 18px \'Helvetica Neue\', Arial, sans-serif;')
    expect(result.css).toContain('font-family: \'Helvetica Neue\', Arial, sans-serif;')
    expect(result.css).toContain('font-size: 18px;')
    expect(result.css).toContain('font-weight: bold;')
    expect(result.css).toContain('font-style: normal;')
  })

  it('applies overrides with highest precedence over value and default', () => {
    const skinXml = `
      <Variable name="site.accent" type="color" default="#ff0000" value="#00ff00"/>
      .button { background: $(site.accent); }
    `

    const result = compileSkinCss(skinXml, {
      overrides: {
        'site.accent': '#0000ff',
      },
      wrap: 'none',
    })

    expect(result.css).toContain('background: #0000ff;')
    expect(result.variables['site.accent']).toBe('#0000ff')
  })

  it('wraps output in canonical style id="page-skin-1" tag by default', () => {
    const skinXml = `
      <b:skin><![CDATA[
        body { margin: 0; }
      ]]></b:skin>
    `

    const result = compileSkinCss(skinXml)
    expect(result.css).toMatch(/^<style id='page-skin-1' type='text\/css'><!--\nbody \{ margin: 0; \}\n--><\/style>$/)
  })

  it('wraps output in template-skin-1 when input is b:template-skin', () => {
    const templateSkinXml = `
      <b:template-skin><![CDATA[
        body.layout-mode { display: block; }
      ]]></b:template-skin>
    `

    const result = compileSkinCss(templateSkinXml)
    expect(result.css).toMatch(/^<style id='template-skin-1' type='text\/css'><!--\nbody\.layout-mode \{ display: block; \}\n--><\/style>$/)
  })

  it('preserves CSS without skin variables unaltered', () => {
    const standardCss = `
      .card { border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    `

    const result = compileSkinCss(standardCss, { wrap: 'none' })
    expect(result.css).toBe('.card { border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }')
    expect(Object.keys(result.symbols).length).toBe(0)
  })

  it('strips entire CSS comments enclosing Theme Designer variables and metadata', () => {
    const skinXml = `
      <b:skin><![CDATA[
        /* Header Comment */
        /*!
          Theme Configuration
          <Variable name="theme.color" type="color" default="#123456" value="#123456"/>
        */
        :root {
          /* Regular comment */
          --color: $(theme.color);
        }
      ]]></b:skin>
    `

    const result = compileSkinCss(skinXml, { wrap: 'none' })
    expect(result.css).toContain('/* Header Comment */')
    expect(result.css).toContain('/* Regular comment */')
    expect(result.css).not.toContain('Theme Configuration')
    expect(result.css).not.toContain('<Variable')
    expect(result.css).toContain('--color: #123456;')
  })
})
