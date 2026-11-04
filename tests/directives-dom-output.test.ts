import { describe, expect, it } from 'vitest'
import { getSpecCatalog } from '../src/catalogs/index.js'
import {
  bAttrHandler,
  bClassHandler,
  bCommentHandler,
  bEvalHandler,
  bMessageHandler,
  bTagHandler,
  getDomDirectiveHandler,
  getOutputDirectiveHandler,
  isDomDirective,
  isOutputDirective,
  lowerAttrDirective,
  lowerClassDirective,
  lowerCommentDirective,
  lowerDataOutput,
  lowerEvalDirective,
  lowerMessageDirective,
  lowerTagDirective,
  renderAttrMutation,
  renderBirOutput,
  renderClassMutation,
  renderCommentNode,
  renderDataOutput,
  renderEvalOutput,
  renderMessageOutput,
  renderTagDirective,
} from '../src/ir/directives/index.js'
import { ensureExpression } from '../src/ir/lowering.js'
import { DomMutationPipeline } from '../src/ir/renderer/dom-mutation-pipeline.js'

describe('dom and output directives suite', () => {
  const catalog = getSpecCatalog()

  const dummyLowerCtx = {
    catalog,
    ensureExpression: (val: any) => ensureExpression(val, catalog),
    filterContainerChildren: (nodes: readonly any[]) => [...nodes],
    isWhitespaceOnly: (node: any) => node.type === 'Text' && /^\s*$/.test(node.value),
    lowerNodes: (nodes: readonly any[]) => nodes.map(n => ({ kind: 'text', value: n.value ?? '' })) as any,
    toBirAttrValue: (attr: any) => ({ kind: 'static', value: attr?.value ?? '' } as any),
  }

  describe('registry', () => {
    it('identifies DOM and Output directives correctly', () => {
      expect(isDomDirective('b:tag')).toBe(true)
      expect(isDomDirective('b:attr')).toBe(true)
      expect(isDomDirective('b:class')).toBe(true)
      expect(isDomDirective('b:if')).toBe(false)

      expect(isOutputDirective('b:eval')).toBe(true)
      expect(isOutputDirective('b:message')).toBe(true)
      expect(isOutputDirective('b:comment')).toBe(true)
      expect(isOutputDirective('b:loop')).toBe(false)

      expect(getDomDirectiveHandler('b:tag')).toBe(bTagHandler)
      expect(getDomDirectiveHandler('b:attr')).toBe(bAttrHandler)
      expect(getDomDirectiveHandler('b:class')).toBe(bClassHandler)

      expect(getOutputDirectiveHandler('b:eval')).toBe(bEvalHandler)
      expect(getOutputDirectiveHandler('b:message')).toBe(bMessageHandler)
      expect(getOutputDirectiveHandler('b:comment')).toBe(bCommentHandler)
    })
  })

  describe('b:tag', () => {
    it('lowers b:tag with static and dynamic attributes', () => {
      const ast = {
        attributes: [
          { name: 'name', value: 'div' },
          { name: 'class', value: 'card' },
          { name: 'id', value: 'main-card' },
          { name: 'cond', value: 'true' },
        ],
        children: [{ type: 'Text', value: 'Hello' }],
        name: 'b:tag',
        type: 'Directive',
      } as any

      const lowered = lowerTagDirective(ast, dummyLowerCtx)
      expect(lowered.kind).toBe('tag')
      expect(lowered.tag).toEqual({ kind: 'static', value: 'div' })
      expect(lowered.cond).toBeDefined()
      expect(lowered.classes.length).toBe(1)
      expect(lowered.attributes.length).toBe(1)
    })

    it('unwraps tag when cond evaluates to falsy', () => {
      const node = {
        children: [{ kind: 'text', value: 'Inner Content' }],
        cond: { type: 'Literal', value: false },
        kind: 'tag',
        tag: { kind: 'static', value: 'div' },
      } as any

      const renderCtx = {
        renderNodes: (nodes: readonly any[]) => nodes.map(n => n.value).join(''),
      }

      const out = renderTagDirective(node, {}, renderCtx)
      expect(out).toBe('Inner Content')
    })

    it('renders tag and attributes when cond evaluates to truthy', () => {
      const pipeline = new DomMutationPipeline()
      const node = {
        attributes: [{ name: 'id', value: { kind: 'static', value: 'card-1' } }],
        children: [{ kind: 'text', value: 'Card Body' }],
        classes: [{ name: { kind: 'static', value: 'box' } }],
        cond: { type: 'Literal', value: true },
        kind: 'tag',
        tag: { kind: 'static', value: 'section' },
      } as any

      const renderCtx = {
        pipeline,
        renderNodes: (nodes: readonly any[]) => nodes.map(n => n.value).join(''),
      }

      const out = renderTagDirective(node, {}, renderCtx)
      expect(out).toBe('<section class="box" id="card-1">Card Body</section>')
    })
  })

  describe('b:attr and b:class', () => {
    it('lowers b:attr and b:class correctly', () => {
      const attrAst = {
        attributes: [
          { name: 'name', value: 'data-role' },
          { name: 'value', value: 'button' },
          { name: 'cond', value: 'data:active' },
        ],
        name: 'b:attr',
        type: 'Directive',
      } as any
      const loweredAttr = lowerAttrDirective(attrAst, dummyLowerCtx)
      expect(loweredAttr.length).toBe(1)
      expect(loweredAttr[0].kind).toBe('attrMutation')

      const classAst = {
        attributes: [
          { name: 'name', value: 'is-active' },
          { name: 'cond', value: 'data:active' },
        ],
        name: 'b:class',
        type: 'Directive',
      } as any
      const loweredClass = lowerClassDirective(classAst, dummyLowerCtx)
      expect(loweredClass.length).toBe(1)
      expect(loweredClass[0].kind).toBe('classMutation')
    })

    it('applies b:class and b:attr to active target in pipeline', () => {
      const pipeline = new DomMutationPipeline()
      const target = pipeline.createTarget([], [], {})
      pipeline.pushTarget(target)

      const classNode = {
        cond: { type: 'Literal', value: true },
        kind: 'classMutation',
        name: { kind: 'static', value: 'highlight' },
      } as any
      renderClassMutation(classNode, {}, { pipeline, renderNodes: () => '' })

      const attrNode = {
        kind: 'attrMutation',
        name: { kind: 'static', value: 'aria-hidden' },
        value: { kind: 'static', value: 'true' },
      } as any
      renderAttrMutation(attrNode, {}, { pipeline, renderNodes: () => '' })

      pipeline.popTarget()
      const serialized = pipeline.serializeAttributes(target)
      expect(serialized).toContain('class="highlight"')
      expect(serialized).toContain('aria-hidden="true"')
    })
  })

  describe('output nodes: b:eval, b:message, b:comment, data:*', () => {
    it('lowers and renders b:eval returning empty string on nullish', () => {
      const ast = {
        attributes: [{ name: 'expr', value: 'data:title' }],
        name: 'b:eval',
        type: 'Directive',
      } as any
      const lowered = lowerEvalDirective(ast, dummyLowerCtx)
      expect(lowered[0].kind).toBe('output')
      expect(lowered[0].source).toBe('eval')

      expect(renderEvalOutput(lowered[0], { title: 'My Post' })).toBe('My Post')
      expect(renderEvalOutput(lowered[0], { title: null })).toBe('')
      expect(renderEvalOutput(lowered[0], {})).toBe('')
    })

    it('lowers and renders data output with canonical error comments', () => {
      const ast = {
        attributes: [],
        name: 'data:unknownTag',
        type: 'Directive',
      } as any
      const lowered = lowerDataOutput(ast, dummyLowerCtx)
      expect(lowered[0].source).toBe('data')

      // Undefined value emits substitution missing comment
      const missingOut = renderDataOutput(lowered[0], {}, catalog)
      expect(missingOut).toBe('<!--Can\'t find substitution for tag [unknownTag]-->')

      // Object / non-singleton value emits not singleton comment
      const nonSingletonOut = renderDataOutput(lowered[0], { unknownTag: { nested: true } }, catalog)
      expect(nonSingletonOut).toBe('<!--Substitution is not a singleton for tag [unknownTag]-->')

      // Primitive scalar value renders directly
      const validOut = renderDataOutput(lowered[0], { unknownTag: 'Hello Blogger' }, catalog)
      expect(validOut).toBe('Hello Blogger')
    })

    it('renders b:message and b:comment', () => {
      const msgAst = {
        attributes: [{ name: 'name', value: 'messages.home' }],
        name: 'b:message',
        type: 'Directive',
      } as any
      const loweredMsg = lowerMessageDirective(msgAst, dummyLowerCtx)
      expect(loweredMsg[0].source).toBe('message')

      const msgOut = renderMessageOutput(loweredMsg[0], { messages: { home: 'Inicio' } })
      expect(msgOut).toBe('Inicio')

      const commentAst = {
        attributes: [],
        children: [{ type: 'Text', value: 'This is a comment' }],
        name: 'b:comment',
        type: 'Directive',
      } as any
      const loweredComment = lowerCommentDirective(commentAst)
      expect(loweredComment[0].kind).toBe('comment')
      expect(renderCommentNode(loweredComment[0])).toBe('<!--This is a comment-->')

      // renderBirOutput unified dispatcher
      expect(renderBirOutput(loweredMsg[0], { messages: { home: 'Inicio' } }, catalog)).toBe('Inicio')
      expect(renderBirOutput(loweredMsg[0], {}, catalog)).toBe('')
    })
  })
})
