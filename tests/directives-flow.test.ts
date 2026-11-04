import { describe, expect, it } from 'vitest'
import { getSpecCatalog } from '../src/catalogs/index.js'
import {
  bIfHandler,
  bLoopHandler,
  bSwitchHandler,
  bWithHandler,
  getFlowDirectiveHandler,
  getFlowRenderer,
  isFlowBirKind,
  isFlowDirective,
  lowerIfDirective,
  lowerLoopDirective,
  lowerSwitchDirective,
  lowerWithDirective,
  renderIfDirective,
  renderLoopDirective,
  renderSwitchDirective,
  renderWithDirective,
} from '../src/ir/directives/index.js'

describe('flow directives suite', () => {
  const catalog = getSpecCatalog()

  const dummyLowerCtx = {
    catalog,
    ensureExpression: (val: any) => {
      if (!val)
        return { type: 'Literal', value: null } as any
      if (typeof val === 'object' && val.type)
        return val
      return { type: 'Identifier', name: String(val) } as any
    },
    filterContainerChildren: (nodes: readonly any[]) => [...nodes],
    isWhitespaceOnly: (node: any) => node.type === 'Text' && /^\s*$/.test(node.value),
    lowerNodes: (nodes: readonly any[]) => nodes.map(n => ({ kind: 'text', value: n.value ?? '' })) as any,
  }

  const dummyRenderCtx = {
    renderNodes: (nodes: readonly any[], _ctx: Record<string, any>) => nodes.map(n => n.value ?? '').join(''),
  }

  describe('registry', () => {
    it('identifies flow directives by tagName and kind', () => {
      expect(isFlowDirective('b:if')).toBe(true)
      expect(isFlowDirective('b:switch')).toBe(true)
      expect(isFlowDirective('b:loop')).toBe(true)
      expect(isFlowDirective('b:with')).toBe(true)
      expect(isFlowDirective('b:tag')).toBe(false)

      expect(isFlowBirKind('if')).toBe(true)
      expect(isFlowBirKind('switch')).toBe(true)
      expect(isFlowBirKind('loop')).toBe(true)
      expect(isFlowBirKind('with')).toBe(true)
      expect(isFlowBirKind('tag' as any)).toBe(false)

      expect(getFlowDirectiveHandler('b:if')).toBe(bIfHandler)
      expect(getFlowRenderer('if')).toBe(bIfHandler)
      expect(getFlowRenderer('loop')).toBe(bLoopHandler)
      expect(getFlowRenderer('with')).toBe(bWithHandler)
      expect(getFlowRenderer('switch')).toBe(bSwitchHandler)
    })
  })

  describe('b:if', () => {
    it('lowers if/elseif/else structure correctly', () => {
      const ast = {
        attributes: [{ name: 'cond', value: 'data:view.isPost' }],
        children: [
          { type: 'Text', value: 'Post View' },
          { attributes: [{ name: 'cond', value: 'data:view.isPage' }], name: 'b:elseif', type: 'Directive' },
          { type: 'Text', value: 'Page View' },
          { attributes: [], name: 'b:else', type: 'Directive' },
          { type: 'Text', value: 'Index View' },
        ],
        name: 'b:if',
        type: 'Directive',
      } as any

      const lowered = lowerIfDirective(ast, dummyLowerCtx)
      expect(lowered.kind).toBe('if')
      expect(lowered.branches.length).toBe(3)
      expect(lowered.branches[0].test).toBeDefined()
      expect(lowered.branches[1].test).toBeDefined()
      expect(lowered.branches[2].test).toBeUndefined()
    })

    it('renders first truthy branch with short-circuiting', () => {
      const node = {
        branches: [
          { children: [{ kind: 'text', value: 'First' }], test: { type: 'Literal', value: false } },
          { children: [{ kind: 'text', value: 'Second' }], test: { type: 'Literal', value: true } },
          { children: [{ kind: 'text', value: 'Third' }], test: { type: 'Literal', value: true } },
        ],
        kind: 'if',
      } as any

      const out = renderIfDirective(node, {}, dummyRenderCtx)
      expect(out).toBe('Second')
    })

    it('renders else branch when all conditions are falsy', () => {
      const node = {
        branches: [
          { children: [{ kind: 'text', value: 'Branch 1' }], test: { type: 'Literal', value: false } },
          { children: [{ kind: 'text', value: 'Default Else' }] },
        ],
        kind: 'if',
      } as any

      const out = bIfHandler.render(node, {}, dummyRenderCtx)
      expect(out).toBe('Default Else')
    })
  })

  describe('b:switch', () => {
    it('lowers switch/case/default correctly', () => {
      const ast = {
        attributes: [{ name: 'var', value: 'data:blog.pageType' }],
        children: [
          { attributes: [{ name: 'value', value: 'item' }], name: 'b:case', type: 'Directive' },
          { type: 'Text', value: 'Item Page' },
          { attributes: [], name: 'b:default', type: 'Directive' },
          { type: 'Text', value: 'Other' },
        ],
        name: 'b:switch',
        type: 'Directive',
      } as any

      const lowered = lowerSwitchDirective(ast, dummyLowerCtx)
      expect(lowered.kind).toBe('switch')
      expect(lowered.cases.length).toBe(2)
      expect(lowered.cases[0].match).toBeDefined()
      expect(lowered.cases[1].match).toBeUndefined()
    })

    it('renders matching case and fallback default', () => {
      const node = {
        cases: [
          { children: [{ kind: 'text', value: 'Matched 10' }], match: { type: 'Literal', value: 10 } },
          { children: [{ kind: 'text', value: 'Matched 20' }], match: { type: 'Literal', value: 20 } },
          { children: [{ kind: 'text', value: 'Fallback' }] },
        ],
        kind: 'switch',
        on: { type: 'Literal', value: 20 },
      } as any

      expect(renderSwitchDirective(node, {}, dummyRenderCtx)).toBe('Matched 20')

      const nodeUnmatched = { ...node, on: { type: 'Literal', value: 99 } }
      expect(bSwitchHandler.render(nodeUnmatched, {}, dummyRenderCtx)).toBe('Fallback')
    })
  })

  describe('b:loop', () => {
    it('lowers loop with variable, index and reverse', () => {
      const ast = {
        attributes: [
          { name: 'values', value: 'data:posts' },
          { name: 'var', value: 'post' },
          { name: 'index', value: 'i' },
          { name: 'reverse', value: 'true' },
        ],
        children: [{ type: 'Text', value: 'content' }],
        name: 'b:loop',
        type: 'Directive',
      } as any

      const lowered = lowerLoopDirective(ast, dummyLowerCtx)
      expect(lowered.kind).toBe('loop')
      expect(lowered.var).toBe('post')
      expect(lowered.index).toBe('i')
      expect(lowered.reverse).toBe(true)
    })

    it('renders loop iterating and binding item and index in reverse', () => {
      const node = {
        children: [{ kind: 'text', value: 'loopItem;' }],
        index: 'idx',
        kind: 'loop',
        reverse: true,
        values: { type: 'Literal', value: ['A', 'B', 'C'] },
        var: 'item',
      } as any

      const renderedCtx = {
        renderNodes: (nodes: readonly any[], ctx: Record<string, any>) => `${ctx.item}:${ctx.idx};`,
      }

      const out = renderLoopDirective(node, {}, renderedCtx)
      expect(out).toBe('C:0;B:1;A:2;')
    })

    it('returns empty string when values is not an array', () => {
      const node = {
        children: [{ kind: 'text', value: 'content' }],
        kind: 'loop',
        values: { type: 'Literal', value: null },
        var: 'item',
      } as any

      expect(bLoopHandler.render(node, {}, dummyRenderCtx)).toBe('')
    })
  })

  describe('b:with', () => {
    it('lowers multi-variable with bindings', () => {
      const ast = {
        attributes: [
          { name: 'var', value: 'v1' },
          { name: 'value', value: 'data:val1' },
          { name: 'var2', value: 'v2' },
          { name: 'value2', value: 'data:val2' },
        ],
        children: [{ type: 'Text', value: 'body' }],
        name: 'b:with',
        type: 'Directive',
      } as any

      const lowered = lowerWithDirective(ast, dummyLowerCtx)
      expect(lowered.kind).toBe('with')
      expect(lowered.bindings.length).toBe(2)
      expect(lowered.bindings[0].var).toBe('v1')
      expect(lowered.bindings[1].var).toBe('v2')
    })

    it('renders with binding shadow scope', () => {
      const node = {
        bindings: [
          { value: { type: 'Literal', value: 'Custom Title' }, var: 'title' },
        ],
        children: [{ kind: 'text', value: 'rendered' }],
        kind: 'with',
      } as any

      const renderedCtx = {
        renderNodes: (_nodes: readonly any[], ctx: Record<string, any>) => `Title is ${ctx.title}`,
      }

      const out = renderWithDirective(node, { title: 'Old Title' }, renderedCtx)
      expect(out).toBe('Title is Custom Title')
      expect(bWithHandler.render(node, { title: 'Old Title' }, renderedCtx)).toBe('Title is Custom Title')
    })
  })
})
