import { readFileSync } from 'node:fs'
import Ajv2020 from 'ajv/dist/2020.js'
import { describe, expect, it } from 'vitest'
import { lowerTemplate } from '../src/ir/index.js'

const schema = JSON.parse(readFileSync(new URL('../catalogs/schemas/bir.schema.json', import.meta.url), 'utf8'))
const ajv = new (Ajv2020 as unknown as new (opts: any) => any)({ strict: false, allErrors: true })
const validateBir = ajv.compile(schema)

describe('bir lowering engine (phase 2)', () => {
  it('desugars void element hosting mutations and b:whitespace="remove"', () => {
    const xml = `<img src='avatar.jpg'>
  <b:attr name='b:whitespace' value='remove'/>
  <b:class name='avatar'/>
  <b:class cond='data:view.isHomepage' name='avatar--featured'/>
  <b:attr name='alt' value='User avatar'/>
</img>`
    const ir = lowerTemplate(xml)

    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)
    expect(ir.root).toHaveLength(1)

    const img = ir.root[0] as any
    expect(img.kind).toBe('element')
    expect(img.tag).toBe('img')
    expect(img.isVoid).toBe(true)
    expect(img.children).toHaveLength(0)

    // Attributes (b:whitespace suppressed)
    expect(img.attributes).toEqual([
      { name: 'src', value: { kind: 'static', value: 'avatar.jpg' } },
      { name: 'alt', value: { kind: 'static', value: 'User avatar' } },
    ])

    // Classes
    expect(img.classes).toHaveLength(2)
    expect(img.classes[0].name).toEqual({ kind: 'static', value: 'avatar' })
    expect(img.classes[0].cond).toBeUndefined()
    expect(img.classes[1].name).toEqual({ kind: 'static', value: 'avatar--featured' })
    expect(img.classes[1].cond.type).toBe('DataPath')
  })

  it('hoists conditional mutations across b:if inside a void element', () => {
    const xml = `<img src='photo.png'>
  <b:attr name='b:whitespace' value='remove'/>
  <b:if cond='data:view.isPost'>
    <b:class name='in-post'/>
  </b:if>
</img>`
    const ir = lowerTemplate(xml)
    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)

    const img = ir.root[0] as any
    expect(img.isVoid).toBe(true)
    expect(img.children).toHaveLength(0)
    expect(img.classes).toHaveLength(1)
    expect(img.classes[0].name).toEqual({ kind: 'static', value: 'in-post' })
    expect(img.classes[0].cond.type).toBe('DataPath')
    expect(img.classes[0].cond.raw).toBe('data:view.isPost')
  })

  it('lowers non-void elements and preserves children while hoisting direct mutations', () => {
    const xml = `<div class='card' expr:id='data:post.id'>
  <b:class name='elevated'/>
  <b:attr name='data-custom' value='active'/>
  <p>Card Body</p>
</div>`
    const ir = lowerTemplate(xml)
    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)

    const div = ir.root[0] as any
    expect(div.kind).toBe('element')
    expect(div.tag).toBe('div')
    expect(div.isVoid).toBe(false)

    // Classes: static 'card' + hoisted 'elevated'
    expect(div.classes).toEqual([
      { name: { kind: 'static', value: 'card' } },
      { name: { kind: 'static', value: 'elevated' } },
    ])

    // Attributes: expr:id + data-custom
    expect(div.attributes).toHaveLength(2)
    expect(div.attributes[0].name).toBe('id')
    expect(div.attributes[0].value.kind).toBe('expr')
    expect(div.attributes[1].name).toBe('data-custom')
    expect(div.attributes[1].value).toEqual({ kind: 'static', value: 'active' })

    // Children: <p>Card Body</p>
    expect(div.children).toHaveLength(1)
    expect(div.children[0].kind).toBe('element')
    expect(div.children[0].tag).toBe('p')
  })

  it('desugars sequential b:if / b:elseif / b:else into structured branches', () => {
    const xml = `<b:if cond='data:view.isHomepage'>
  <h1>Home</h1>
<b:elseif cond='data:view.isPost'/>
  <h2>Post</h2>
<b:else/>
  <p>Other</p>
</b:if>`
    const ir = lowerTemplate(xml)
    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)

    const ifNode = ir.root[0] as any
    expect(ifNode.kind).toBe('if')
    expect(ifNode.branches).toHaveLength(3)

    // Branch 1: if
    expect(ifNode.branches[0].test.type).toBe('DataPath')
    expect(ifNode.branches[0].test.raw).toBe('data:view.isHomepage')
    expect(ifNode.branches[0].children[0].kind).toBe('element')
    expect(ifNode.branches[0].children[0].tag).toBe('h1')

    // Branch 2: elseif
    expect(ifNode.branches[1].test.type).toBe('DataPath')
    expect(ifNode.branches[1].test.raw).toBe('data:view.isPost')
    expect(ifNode.branches[1].children[0].kind).toBe('element')
    expect(ifNode.branches[1].children[0].tag).toBe('h2')

    // Branch 3: else (no test)
    expect(ifNode.branches[2].test).toBeUndefined()
    expect(ifNode.branches[2].children[0].kind).toBe('element')
    expect(ifNode.branches[2].children[0].tag).toBe('p')
  })

  it('desugars b:loop with variables and reverse flag', () => {
    const xml = `<b:loop values='data:posts' var='post' index='idx' reverse='true'>
  <article expr:data-idx='data:idx'><data:post.title/></article>
</b:loop>`
    const ir = lowerTemplate(xml)
    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)

    const loop = ir.root[0] as any
    expect(loop.kind).toBe('loop')
    expect(loop.var).toBe('post')
    expect(loop.index).toBe('idx')
    expect(loop.reverse).toBe(true)
    expect(loop.values.type).toBe('DataPath')

    expect(loop.children).toHaveLength(1)
    const art = loop.children[0]
    expect(art.kind).toBe('element')
    expect(art.tag).toBe('article')
    expect(art.children[0].kind).toBe('output')
  })

  it('desugars b:with and multi-variable bindings', () => {
    const xml = `<b:with var='author' value='data:post.author.name' var2='count' value2='5'>
  <span><data:author/></span>
</b:with>`
    const ir = lowerTemplate(xml)
    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)

    const withNode = ir.root[0] as any
    expect(withNode.kind).toBe('with')
    expect(withNode.bindings).toHaveLength(2)
    expect(withNode.bindings[0].var).toBe('author')
    expect(withNode.bindings[0].value.type).toBe('DataPath')
    expect(withNode.bindings[1].var).toBe('count')
    expect(withNode.bindings[1].value.type).toBe('Literal')
  })

  it('desugars b:switch with b:case and b:default', () => {
    const xml = `<b:switch var='data:view.type'>
  <b:case value='item'/>
    <p>Item View</p>
  <b:case value='archive'/>
    <p>Archive View</p>
  <b:default/>
    <p>Default View</p>
</b:switch>`
    const ir = lowerTemplate(xml)
    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)

    const sw = ir.root[0] as any
    expect(sw.kind).toBe('switch')
    expect(sw.on.type).toBe('DataPath')
    expect(sw.cases).toHaveLength(3)

    expect(sw.cases[0].match.value).toBe('item')
    expect(sw.cases[0].children[0].tag).toBe('p')
    expect(sw.cases[1].match.value).toBe('archive')
    expect(sw.cases[2].match).toBeUndefined()
  })

  it('lowers dynamic b:tag with cond and mutations', () => {
    const xml = `<b:tag name='section' cond='data:view.isPost' class='post-section'>
  <b:class name='elevated'/>
  <p>Inside section</p>
</b:tag>`
    const ir = lowerTemplate(xml)
    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)

    const tagNode = ir.root[0] as any
    expect(tagNode.kind).toBe('tag')
    expect(tagNode.tag).toEqual({ kind: 'static', value: 'section' })
    expect(tagNode.cond.type).toBe('DataPath')
    expect(tagNode.classes).toEqual([
      { name: { kind: 'static', value: 'post-section' } },
      { name: { kind: 'static', value: 'elevated' } },
    ])
    expect(tagNode.children).toHaveLength(1)
  })

  it('desugars b:eval and <data:...> tags into output nodes', () => {
    const xml = `<div>
  <b:eval expr='data:blog.title ?: "Default"'/>
  <data:blog.pageTitle/>
</div>`
    const ir = lowerTemplate(xml)
    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)

    const div = ir.root[0] as any
    expect(div.children).toHaveLength(2)
    expect(div.children[0].kind).toBe('output')
    expect(div.children[0].expr.type).toBe('ConditionalExpression')
    expect(div.children[1].kind).toBe('output')
    expect(div.children[1].expr.type).toBe('DataPath')
  })

  it('extracts includables from widgets into symbolTable', () => {
    const xml = `<b:section id='main'>
  <b:widget id='Blog1' type='Blog'>
    <b:includable id='main'>
      <h1>Main</h1>
      <b:include name='post' data='data:post'/>
    </b:includable>
    <b:includable id='post' var='p'>
      <article><data:p.title/></article>
    </b:includable>
  </b:widget>
</b:section>`
    const ir = lowerTemplate(xml)
    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)

    expect(ir.symbolTable['Blog1:main']).toBeDefined()
    expect(ir.symbolTable['Blog1:post']).toBeDefined()
    expect(ir.symbolTable.post.params).toEqual(['p'])
    const article = ir.symbolTable.post.body[0] as any
    expect(article.tag).toBe('article')

    const sec = ir.root[0] as any
    expect(sec.kind).toBe('container')
    expect(sec.role).toBe('section')
    const widget = sec.children[0]
    expect(widget.kind).toBe('container')
    expect(widget.role).toBe('widget')
    expect(widget.children).toHaveLength(0) // Includables are extracted into symbolTable
  })

  it('serializes to JSON and deserializes cleanly matching bir.schema.json', () => {
    const xml = `<img src='avatar.jpg'>
  <b:attr name='b:whitespace' value='remove'/>
  <b:class name='avatar'/>
</img>`
    const ir = lowerTemplate(xml)
    const jsonStr = JSON.stringify(ir, null, 2)
    const parsed = JSON.parse(jsonStr)
    expect(validateBir(parsed), JSON.stringify(validateBir.errors)).toBe(true)
  })

  it('preserves b:attr and b:class as mutations inside an includable', () => {
    const xml = `<b:defaultmarkups>
  <b:defaultmarkup type='Common'>
    <b:includable id='widget-title'>
      <b:attr name='id' value=''/>
      <b:class expr:name='data:widget.instanceId'/>
    </b:includable>
  </b:defaultmarkup>
</b:defaultmarkups>`
    const ir = lowerTemplate(xml)
    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)
    const wt = ir.symbolTable['widget-title']
    expect(wt).toBeDefined()
    expect(wt.body).toHaveLength(2)
    expect(wt.body[0].kind).toBe('attrMutation')
    expect(wt.body[1].kind).toBe('classMutation')
  })
})
