import { describe, expect, it } from 'vitest'
import { validateTemplateStructure } from '../src/parser/index.js'

const ok = `b:css='false' b:js='false' b:defaultwidgetversion='2' b:layoutsVersion='3'`

function rootCodes(xml: string): string[] {
  return validateTemplateStructure(xml)
    .filter(d => d.code === 'BX1061' || d.code === 'BX1062')
    .map(d => `${d.code}:${d.attribute}`)
}

describe('root <html> attributes (BX1061/BX1062)', () => {
  it('accepts the 4 required attributes plus dynamic/optional ones', () => {
    expect(rootCodes(`<html ${ok} b:responsive='true' expr:dir='data:blog.languageDirection' expr:lang='data:blog.locale'><head></head></html>`)).toEqual([])
  })

  it('reports each missing attribute with BX1061, never for b:responsive', () => {
    expect(rootCodes(`<html b:css='false' b:js='false'><head></head></html>`))
      .toEqual(['BX1061:b:defaultwidgetversion', 'BX1061:b:layoutsVersion'])
  })

  it('reports BX1062 with suggested replacement for wrong values', () => {
    const diags = validateTemplateStructure(`<html b:css='true' b:js='false' b:defaultwidgetversion='2' b:layoutsVersion='3'></html>`)
      .filter(d => d.code === 'BX1062')
    expect(diags).toHaveLength(1)
    expect(diags[0]!.severity).toBe('warning')
    expect(diags[0]!.suggestedReplacement).toBe(`b:css='false'`)
  })

  it('ignores fragments without <html>', () => {
    expect(rootCodes(`<b:if cond='true'>x</b:if>`)).toEqual([])
  })
})
