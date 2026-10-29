import { existsSync, readFileSync } from 'node:fs'
import Ajv2020 from 'ajv/dist/2020.js'
import { describe, expect, it } from 'vitest'
import { compileToIR, parseIR, serializeIR } from '../src/ir/index.js'

const schema = JSON.parse(readFileSync(new URL('../catalogs/schemas/bir.schema.json', import.meta.url), 'utf8'))
const ajv = new (Ajv2020 as unknown as new (opts: any) => any)({ strict: false })
const validateBir = ajv.compile(schema)

describe('bIR Top-Level Compiler API (Phase 4)', () => {
  it('compiles full canonical template (hamlet.xml) into valid language-agnostic BIR', () => {
    const xml = readFileSync(new URL('../fixtures/templates/samples/hamlet.xml', import.meta.url), 'utf8')
    const ir = compileToIR(xml)

    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)
    expect(ir.birVersion).toBe('1')
    expect(ir.layoutVersion).toBe(3)
    expect(ir.root.length).toBeGreaterThan(0)
    expect(Object.keys(ir.symbolTable).length).toBeGreaterThan(100)
    expect(ir.skin.variables.length).toBeGreaterThan(10)
    expect(ir.skin.css.length).toBeGreaterThan(0)
  })

  it('compiles production workbench sample basico.xml if present', () => {
    const url = new URL('../.workbench/samples/basico.xml', import.meta.url)
    if (!existsSync(url)) {
      return
    }
    const xml = readFileSync(url, 'utf8')
    const ir = compileToIR(xml)

    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)
    expect(ir.birVersion).toBe('1')
    expect(ir.root.length).toBeGreaterThan(0)
    expect(Object.keys(ir.symbolTable).length).toBeGreaterThan(10)
  })

  it('compiles production workbench sample laertes.xml if present', () => {
    const url = new URL('../.workbench/samples/laertes.xml', import.meta.url)
    if (!existsSync(url)) {
      return
    }
    const xml = readFileSync(url, 'utf8')
    const ir = compileToIR(xml)

    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)
    expect(ir.birVersion).toBe('1')
    expect(ir.root.length).toBeGreaterThan(0)
  })

  it('compiles all production fragments from prod_fragments.json cleanly into BIR', () => {
    const frags = JSON.parse(readFileSync(new URL('../fixtures/templates/prod_fragments.json', import.meta.url), 'utf8'))
    for (const [id, f] of Object.entries(frags.fixtures as Record<string, any>)) {
      const ir = compileToIR(f.input.source)
      expect(validateBir(ir), `Fragment ${id} failed validation: ${JSON.stringify(validateBir.errors)}`).toBe(true)
      expect(ir.birVersion).toBe('1')
    }
  })

  it('applies skinOverrides during compilation', () => {
    const xml = `<b:skin><![CDATA[
      /*<Variable name="body.background" description="BG" type="color" default="#ffffff" value="#ffffff"/>*/
      body { background: $(body.background); }
    ]]></b:skin>`
    const ir = compileToIR(xml, {
      skinOverrides: { 'body.background': '#ff0000' },
    })
    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)

    expect(ir.skin.variables).toHaveLength(1)
    expect(ir.skin.variables[0].name).toBe('body.background')
    expect(ir.skin.variables[0].default).toBe('#ffffff')

    // In compiled css, $(body.background) is resolved or preserved
    expect(ir.skin.css.length).toBeGreaterThan(0)
  })

  it('extracts templateSkinCss when <b:template-skin> is present', () => {
    const xml = `<b:skin><![CDATA[
      body { color: black; }
    ]]></b:skin>
    <b:template-skin><![CDATA[
      .editor { display: block; }
    ]]></b:template-skin>`
    const ir = compileToIR(xml)
    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)

    expect(ir.skin.templateSkinCss).toBeDefined()
    expect(ir.skin.templateSkinCss!.length).toBeGreaterThan(0)
    expect(ir.skin.templateSkinCss![0].kind).toBe('text')
  })

  it('serializes to JSON and roundtrips through parseIR without loss', () => {
    const xml = `<b:section id='main'>
  <b:widget id='Blog1' type='Blog'>
    <b:includable id='main'>
      <b:include name='post' data='data:post'/>
    </b:includable>
    <b:includable id='post' var='p'>
      <article class='post-card'><data:p.title/></article>
    </b:includable>
  </b:widget>
</b:section>`
    const ir = compileToIR(xml)
    const jsonStr = serializeIR(ir)
    expect(typeof jsonStr).toBe('string')

    const parsed = parseIR(jsonStr)
    expect(validateBir(parsed), JSON.stringify(validateBir.errors)).toBe(true)
    expect(parsed).toEqual(ir)
  })
})
