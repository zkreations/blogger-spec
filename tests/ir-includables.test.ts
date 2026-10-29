import { readFileSync } from 'node:fs'
import Ajv2020 from 'ajv/dist/2020.js'
import { describe, expect, it } from 'vitest'
import { lowerTemplate } from '../src/ir/index.js'

const schema = JSON.parse(readFileSync(new URL('../catalogs/schemas/bir.schema.json', import.meta.url), 'utf8'))
const ajv = new (Ajv2020 as unknown as new (opts: any) => any)({ strict: false, allErrors: true })
const validateBir = ajv.compile(schema)

describe('bir includables symbol table and resolution (phase 3)', () => {
  it('resolves Tier 1: local_widget includables within the calling widget', () => {
    const xml = `<b:section id='header'>
  <b:widget id='Header1' type='Header'>
    <b:includable id='main'>
      <b:include name='title'/>
    </b:includable>
    <b:includable id='title'>
      <h1>My Blog</h1>
    </b:includable>
  </b:widget>
</b:section>`
    const ir = lowerTemplate(xml)
    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)

    expect(ir.symbolTable['Header1:main']).toBeDefined()
    expect(ir.symbolTable['Header1:title']).toBeDefined()
    expect(ir.symbolTable.title.tier).toBe('local_widget')
    expect(ir.symbolTable.title.ownerWidgetId).toBe('Header1')

    const mainIncludable = ir.symbolTable['Header1:main']
    const includeNode = mainIncludable.body[0] as any
    expect(includeNode.kind).toBe('include')
    expect(includeNode.target).toBe('title')
    expect(includeNode.resolution).toEqual({
      tier: 'local_widget',
      resolved: true,
    })
  })

  it('resolves Tier 2: gadget_specific includables with last_block_wins collision handling', () => {
    const xml = `<b:defaultmarkups>
  <b:defaultmarkup type='Blog'>
    <b:includable id='post'>
      <h1>Old Blog Post</h1>
    </b:includable>
  </b:defaultmarkup>
  <b:defaultmarkup type='Blog'>
    <b:includable id='post'>
      <h2>New Blog Post</h2>
    </b:includable>
  </b:defaultmarkup>
</b:defaultmarkups>
<b:section id='main'>
  <b:widget id='Blog1' type='Blog'>
    <b:includable id='main'>
      <b:include name='post' data='data:post'/>
    </b:includable>
  </b:widget>
</b:section>`
    const ir = lowerTemplate(xml)
    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)

    // Verify last_block_wins in symbol table
    const postIncludable = ir.symbolTable['default:Blog:post']
    expect(postIncludable).toBeDefined()
    expect(postIncludable.tier).toBe('gadget_specific')
    expect(postIncludable.ownerWidgetId).toBe('Blog')
    const h2Tag = (postIncludable.body[0] as any).tag
    expect(h2Tag).toBe('h2')

    // Verify calling widget resolution
    const mainBody = ir.symbolTable['Blog1:main'].body
    const inc = mainBody[0] as any
    expect(inc.target).toBe('post')
    expect(inc.resolution.tier).toBe('gadget_specific')
    expect(inc.resolution.resolved).toBe(true)
    expect(inc.args.data.kind).toBe('expr')
  })

  it('resolves Tier 3: universal_widget includables (type="All")', () => {
    const xml = `<b:defaultmarkups>
  <b:defaultmarkup type='All'>
    <b:includable id='universalAlert'>
      <div class='alert'><p>Alert</p></div>
    </b:includable>
  </b:defaultmarkup>
</b:defaultmarkups>
<b:section id='sec'>
  <b:widget id='ContactForm1' type='ContactForm'>
    <b:includable id='main'>
      <b:include name='universalAlert'/>
    </b:includable>
  </b:widget>
</b:section>`
    const ir = lowerTemplate(xml)
    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)

    expect(ir.symbolTable['all:universalAlert']).toBeDefined()
    expect(ir.symbolTable['all:universalAlert'].tier).toBe('universal_widget')

    const inc = ir.symbolTable['ContactForm1:main'].body[0] as any
    expect(inc.target).toBe('universalAlert')
    expect(inc.resolution).toEqual({
      tier: 'universal_widget',
      resolved: true,
    })
  })

  it('resolves Tier 4: shared_common includables (type="Common")', () => {
    const xml = `<b:defaultmarkups>
  <b:defaultmarkup type='Common'>
    <b:includable id='sharedButton'>
      <button class='btn'>Click</button>
    </b:includable>
  </b:defaultmarkup>
</b:defaultmarkups>
<b:section id='sec'>
  <b:widget id='Text1' type='Text'>
    <b:includable id='main'>
      <b:include name='sharedButton'/>
    </b:includable>
  </b:widget>
</b:section>`
    const ir = lowerTemplate(xml)
    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)

    expect(ir.symbolTable['common:sharedButton']).toBeDefined()
    expect(ir.symbolTable['common:sharedButton'].tier).toBe('shared_common')

    const inc = ir.symbolTable['Text1:main'].body[0] as any
    expect(inc.target).toBe('sharedButton')
    expect(inc.resolution).toEqual({
      tier: 'shared_common',
      resolved: true,
    })
  })

  it('resolves Tier 5: platform_server inclusions and synthesizes offline stubs in symbolTable', () => {
    const xml = `<b:section id='main'>
  <b:widget id='Blog1' type='Blog'>
    <b:includable id='main'>
      <b:include name='commentForm'/>
    </b:includable>
  </b:widget>
</b:section>`
    const ir = lowerTemplate(xml)
    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)

    const inc = ir.symbolTable['Blog1:main'].body[0] as any
    expect(inc.target).toBe('commentForm')
    expect(inc.resolution.tier).toBe('platform_server')
    expect(inc.resolution.resolved).toBe(true)

    // Platform server stub synthesized in symbolTable
    expect(ir.symbolTable.commentForm).toBeDefined()
    expect(ir.symbolTable.commentForm.tier).toBe('platform_server')
    expect(ir.symbolTable.commentForm.body.length).toBeGreaterThan(0)
  })

  it('resolves Tier 6: unresolved includable with canonical failure comment', () => {
    const xml = `<b:section id='main'>
  <b:widget id='Sidebar1' type='HTML'>
    <b:includable id='main'>
      <b:include name='nonExistentSubroutine'/>
    </b:includable>
  </b:widget>
</b:section>`
    const ir = lowerTemplate(xml)
    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)

    const inc = ir.symbolTable['Sidebar1:main'].body[0] as any
    expect(inc.target).toBe('nonExistentSubroutine')
    expect(inc.resolution.tier).toBe('unresolved')
    expect(inc.resolution.resolved).toBe(false)
    expect(inc.resolution.failureComment).toContain('Failed to render gadget \'Sidebar1\'')
  })

  it('supports dynamic dispatch via expr:name without crashing', () => {
    const xml = `<b:section id='main'>
  <b:widget id='Blog1' type='Blog'>
    <b:includable id='main'>
      <b:include expr:name='data:widget.snippet' data='post'/>
    </b:includable>
  </b:widget>
</b:section>`
    const ir = lowerTemplate(xml)
    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)

    const inc = ir.symbolTable['Blog1:main'].body[0] as any
    expect(inc.target).toBeUndefined()
    expect(inc.dynamicTarget).toBeDefined()
    expect(inc.dynamicTarget.type).toBe('DataPath')
    expect(inc.dynamicTarget.raw).toBe('data:widget.snippet')
    expect(inc.resolution.resolved).toBe(false)
    expect(inc.args.data.kind).toBe('expr')
  })

  it('pre-compiles argument expressions and static parameters in b:include args', () => {
    const xml = `<b:section id='main'>
  <b:widget id='Blog1' type='Blog'>
    <b:includable id='main'>
      <b:include name='badge' var='post' count='42' expr:color='data:theme.accentColor'/>
    </b:includable>
    <b:includable id='badge' var='item'>
      <span class='badge'><data:item.title/></span>
    </b:includable>
  </b:widget>
</b:section>`
    const ir = lowerTemplate(xml)
    expect(validateBir(ir), JSON.stringify(validateBir.errors)).toBe(true)

    const inc = ir.symbolTable['Blog1:main'].body[0] as any
    expect(inc.args.var.kind).toBe('expr')
    expect(inc.args.var.expr.type).toBe('Identifier')
    expect(inc.args.var.expr.name).toBe('post')

    expect(inc.args.count).toEqual({
      kind: 'static',
      value: '42',
    })
    expect(inc.args.color.kind).toBe('expr')
    expect(inc.args.color.expr.raw).toBe('data:theme.accentColor')
  })
})
