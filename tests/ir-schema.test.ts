import { readFileSync } from 'node:fs'
import Ajv2020 from 'ajv/dist/2020.js'
import { describe, expect, it } from 'vitest'
import { parseTemplate } from '../src/index.js'

const schema = JSON.parse(readFileSync(new URL('../catalogs/schemas/bir.schema.json', import.meta.url), 'utf8'))

function validator() {
  const ajv = new (Ajv2020 as unknown as new (opts: any) => any)({ strict: false, allErrors: true })
  return ajv.compile(schema)
}

describe('void elements with mutation children', () => {
  it('parses paired void tag hosting b:attr and b:class', () => {
    const doc = parseTemplate(`<img src='a.jpg'>
  <b:attr name='b:whitespace' value='remove'/>
  <b:class name='foo'/>
</img>`)
    const img: any = doc.children[0]
    expect(img.name).toBe('img')
    expect(img.children.filter((c: any) => c.type === 'Directive')).toHaveLength(2)
  })

  it('still rejects an unterminated void tag', () => {
    expect(() => parseTemplate(`<div><img src='a.jpg'><p>x</p></div>`)).toThrow()
  })
})

describe('bir.schema.json', () => {
  const validate = validator()
  const doc = {
    birVersion: '1',
    layoutVersion: 'v3',
    root: [
      {
        kind: 'element',
        tag: 'img',
        isVoid: true,
        attributes: [{ name: 'src', value: { kind: 'static', value: 'a.jpg' } }],
        classes: [{ name: { kind: 'static', value: 'foo' } }],
        children: [],
      },
      {
        kind: 'if',
        branches: [{ test: { type: 'Literal', value: true }, children: [{ kind: 'text', value: 'x' }] }],
      },
      { kind: 'include', target: 'badge', resolution: { tier: 'local_widget', resolved: true }, args: {} },
    ],
    symbolTable: {
      badge: { id: 'badge', tier: 'local_widget', params: ['item'], body: [] },
    },
    skin: { variables: [], css: [] },
  }

  it('accepts a valid IR document', () => {
    expect(validate(doc), JSON.stringify(validate.errors)).toBe(true)
  })

  it('rejects void elements that keep children', () => {
    const bad = structuredClone(doc)
    ;(bad.root[0] as any).children = [{ kind: 'text', value: 'x' }]
    expect(validate(bad)).toBe(false)
  })

  it('rejects unknown node kinds and missing symbolTable', () => {
    const bad = structuredClone(doc) as any
    bad.root.push({ kind: 'bogus' })
    expect(validate(bad)).toBe(false)
    const noSym = structuredClone(doc) as any
    delete noSym.symbolTable
    expect(validate(noSym)).toBe(false)
  })
})
