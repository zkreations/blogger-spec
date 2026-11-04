import { describe, expect, it } from 'vitest'
import { getSpecCatalog } from '../src/catalogs/index.js'
import {
  findIncludableInSymbolTable,
  lowerDefaultMarkup,
  lowerDefaultMarkups,
  lowerIncludableDirective,
  lowerIncludeDirective,
  lowerSectionDirective,
  lowerWidgetDirective,
  renderIncludeDirective,
  renderSectionContainer,
  renderWidgetContainer,
} from '../src/ir/directives/index.js'
import { ensureExpression, toBirAttrValue } from '../src/ir/lowering.js'
import { DomMutationPipeline } from '../src/ir/renderer/dom-mutation-pipeline.js'
import { parseTemplate } from '../src/parser/template-parser.js'

describe('directives modularization: subroutines and containers', () => {
  const catalog = getSpecCatalog()

  function createMockLowerContext(overrides: Record<string, any> = {}) {
    const ctx: any = {
      catalog,
      defaultmarkups: [],
      defaultWidgetVersion: 2,
      ensureExpression: (val: any) => ensureExpression(val, catalog),
      filterContainerChildren: (nodes: readonly any[]) => nodes.filter(n => !(n.type === 'Text' && /^\s*$/.test(n.value))),
      isWhitespaceOnly: (n: any) => n.type === 'Text' && /^\s*$/.test(n.value),
      layoutVersion: 3,
      lowerNodes: (nodes: readonly any[]) => nodes.map(n => ({ kind: 'text', value: n.value ?? '' })),
      symbolTable: {},
      toBirAttrValue: (attr: any) => toBirAttrValue(attr, catalog),
      ...overrides,
    }
    return ctx
  }

  describe('b:includable and symbolTable tiers', () => {
    it('registers local_widget includables in symbolTable', () => {
      const doc = parseTemplate('<b:includable id="main" var="post"><div>Hello</div></b:includable>', { catalog })
      const node = doc.children[0] as any
      const ctx = createMockLowerContext({ currentWidgetId: 'Blog1' })

      lowerIncludableDirective(node, ctx)

      expect(ctx.symbolTable['widget:Blog1:main']).toBeDefined()
      expect(ctx.symbolTable['widget:Blog1:main'].tier).toBe('local_widget')
      expect(ctx.symbolTable['widget:Blog1:main'].params).toEqual(['post'])
    })

    it('registers gadget_specific and shared_common in defaultmarkups', () => {
      const doc = parseTemplate('<b:defaultmarkup type="Blog"><b:includable id="postTitle"><h1>Title</h1></b:includable></b:defaultmarkup>', { catalog })
      const node = doc.children[0] as any
      const ctx = createMockLowerContext()

      lowerDefaultMarkup(node, ctx)

      expect(ctx.symbolTable['gadget:Blog:postTitle']).toBeDefined()
      expect(ctx.symbolTable['gadget:Blog:postTitle'].tier).toBe('gadget_specific')
    })

    it('lowers b:defaultmarkups container holding multiple defaultmarkup tags', () => {
      const doc = parseTemplate(
        `<b:defaultmarkups>
          <b:defaultmarkup type="Common"><b:includable id="sharedCommon"><div>Common</div></b:includable></b:defaultmarkup>
          <b:defaultmarkup type="Blog"><b:includable id="blogSpecific"><div>Blog</div></b:includable></b:defaultmarkup>
        </b:defaultmarkups>`,
        { catalog },
      )
      const node = doc.children[0] as any
      const ctx = createMockLowerContext()

      lowerDefaultMarkups(node, ctx)

      expect(ctx.symbolTable['common:sharedCommon']).toBeDefined()
      expect(ctx.symbolTable['gadget:Blog:blogSpecific']).toBeDefined()
    })

    it('supports comma-separated types in defaultmarkup', () => {
      const doc = parseTemplate('<b:defaultmarkup type="Common,Blog"><b:includable id="sharedSnippet"><div>Snippet</div></b:includable></b:defaultmarkup>', { catalog })
      const node = doc.children[0] as any
      const ctx = createMockLowerContext()

      lowerDefaultMarkup(node, ctx)

      expect(ctx.symbolTable['common:sharedSnippet']).toBeDefined()
      expect(ctx.symbolTable['gadget:Blog:sharedSnippet']).toBeDefined()
    })

    it('prohibits super.* namespace inside widget or defaultmarkup', () => {
      const doc = parseTemplate('<b:includable id="super.title"><div>Hack</div></b:includable>', { catalog })
      const node = doc.children[0] as any
      const ctx = createMockLowerContext({ currentWidgetId: 'Blog1' })

      lowerIncludableDirective(node, ctx)

      expect(Object.keys(ctx.symbolTable)).toHaveLength(0)
    })
  })

  describe('b:include and recursion limits', () => {
    it('lowers b:include directive with target and args', () => {
      const doc = parseTemplate('<b:include name="sub" data="data:post" custom="value"/>', { catalog })
      const node = doc.children[0] as any
      const ctx = createMockLowerContext()

      const bir = lowerIncludeDirective(node, ctx)
      expect(bir.kind).toBe('include')
      expect(bir.target).toBe('sub')
      expect(bir.args.data).toBeDefined()
      expect(bir.args.custom).toBeDefined()
    })
    it('finds includable in 5-tier symbol table using findIncludableInSymbolTable', () => {
      const symTable: any = {
        'all:universalItem': { id: 'universalItem', tier: 'universal_widget', params: [], body: [] },
        'common:commonItem': { id: 'commonItem', tier: 'shared_common', params: [], body: [] },
        'gadget:Blog:gadgetItem': { id: 'gadgetItem', tier: 'gadget_specific', params: [], body: [] },
        'widget:Blog1:localItem': { id: 'localItem', tier: 'local_widget', params: [], body: [] },
      }

      // Local widget wins
      expect(findIncludableInSymbolTable('localItem', symTable, 'Blog1', 'Blog')?.tier).toBe('local_widget')
      // Gadget specific
      expect(findIncludableInSymbolTable('gadgetItem', symTable, 'Blog2', 'Blog')?.tier).toBe('gadget_specific')
      // Universal widget
      expect(findIncludableInSymbolTable('universalItem', symTable, 'Header1', 'Header')?.tier).toBe('universal_widget')
      // Common item
      expect(findIncludableInSymbolTable('commonItem', symTable)?.tier).toBe('shared_common')
      // Non-existent
      expect(findIncludableInSymbolTable('missing', symTable, 'Blog1', 'Blog')).toBeUndefined()
    })

    it('enforces canonical recursion limit on deep include cycles', () => {
      const includeNode: any = {
        args: {},
        kind: 'include',
        target: 'recursiveLoop',
      }
      const subroutine: any = {
        body: [includeNode],
        id: 'recursiveLoop',
        params: [],
        tier: 'local_widget',
      }
      let depth = 43

      const renderCtx: any = {
        catalog,
        findIncludable: () => subroutine,
        get includeDepth() { return depth },
        set includeDepth(v: number) { depth = v },
        maxIncludeDepth: 43,
        renderNodes: (nodes: readonly any[], c: any) => {
          return renderIncludeDirective(nodes[0], c, renderCtx)
        },
      }

      const output = renderIncludeDirective(includeNode, {}, renderCtx)
      expect(output).toBe('<!-- recursion depth limit exceeded (recursiveLoop) -->')
    })

    it('respects cond attribute on b:include', () => {
      const includeNode: any = {
        args: {
          cond: { kind: 'static', value: 'false' },
        },
        kind: 'include',
        target: 'testTarget',
      }
      const renderCtx: any = {
        findIncludable: () => ({ body: [{ kind: 'text', value: 'rendered' }] }),
        renderNodes: () => 'rendered',
      }
      expect(renderIncludeDirective(includeNode, {}, renderCtx)).toBe('')
    })
  })

  describe('b:section container', () => {
    it('lowers section container and tags suppressed attributes in v3', () => {
      const doc = parseTemplate('<b:section id="main" class="main-sec" maxwidgets="1"><span>Hello</span></b:section>', { catalog })
      const node = doc.children[0] as any
      const ctx = createMockLowerContext({ layoutVersion: 3 })

      const bir = lowerSectionDirective(node, ctx)
      expect(bir.kind).toBe('container')
      expect(bir.role).toBe('section')
      expect(bir.id).toBe('main')
      expect(bir.className).toBe('main-sec')
      expect(bir.suppressedInV3).toBe(true)
    })

    it('renders section wrapper with default div and class handling', () => {
      const pipeline = new DomMutationPipeline()
      const bir: any = {
        children: [{ kind: 'text', value: 'Content' }],
        className: 'sidebar',
        id: 'sidebar',
        kind: 'container',
        role: 'section',
      }
      const renderCtx: any = {
        emitWrappers: true,
        pipeline,
        renderNodes: () => 'Content',
      }

      const html = renderSectionContainer(bir, {}, renderCtx)
      expect(html).toBe('<div class="sidebar section" id="sidebar">Content</div>')
    })

    it('renders section wrapper with no-items class when empty', () => {
      const pipeline = new DomMutationPipeline()
      const bir: any = {
        children: [],
        className: 'empty-sec',
        id: 'empty-sec',
        kind: 'container',
        role: 'section',
      }
      const renderCtx: any = {
        emitWrappers: true,
        pipeline,
        renderNodes: () => '',
      }

      const html = renderSectionContainer(bir, {}, renderCtx)
      expect(html).toBe('<div class="empty-sec no-items section" id="empty-sec"></div>')
    })
  })

  describe('b:widget container', () => {
    it('lowers widget container, hydrates widget-settings and captures includables', () => {
      const doc = parseTemplate(
        `<b:widget id="Blog1" type="Blog" version="2" title="My Blog">
          <b:widget-settings>
            <b:widget-setting name="showAuthor">true</b:widget-setting>
          </b:widget-settings>
          <b:includable id="main"><div>Blog Main</div></b:includable>
        </b:widget>`,
        { catalog },
      )
      const node = doc.children[0] as any
      const ctx = createMockLowerContext()

      const bir = lowerWidgetDirective(node, ctx)
      expect(bir.kind).toBe('container')
      expect(bir.role).toBe('widget')
      expect(bir.id).toBe('Blog1')
      expect(bir.widgetType).toBe('Blog')
      expect(bir.version).toBe(2)
      expect(bir.settings?.showAuthor).toBe(true)
      expect(ctx.symbolTable['widget:Blog1:main']).toBeDefined()
    })

    it('renders widget wrapper executing main includable and scoping widget context', () => {
      const pipeline = new DomMutationPipeline()
      const bir: any = {
        id: 'Header1',
        kind: 'container',
        role: 'widget',
        title: 'Header Title',
        version: 2,
        widgetType: 'Header',
      }
      const mainSub: any = {
        body: [{ kind: 'text', value: '<h1>Header Content</h1>' }],
        id: 'main',
        params: [],
        tier: 'local_widget',
      }

      const renderCtx: any = {
        emitWrappers: true,
        findIncludable: (target: string) => target === 'main' ? mainSub : undefined,
        pipeline,
        renderNodes: () => '<h1>Header Content</h1>',
      }

      const html = renderWidgetContainer(bir, {}, renderCtx)
      expect(html).toContain('id="Header1"')
      expect(html).toContain('class="widget Header"')
      expect(html).toContain('<h1>Header Content</h1>')
    })
  })
})
