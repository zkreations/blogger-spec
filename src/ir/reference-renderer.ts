/**
 * Canonical Reference Compiler & HTML Renderer for Blogger Intermediate Representation (BIR).
 * Provides hermetic, zero-runtime-dependency evaluation of BIR documents into HTML strings.
 */
import type { BloggerCompileIROptions } from './compiler.js'
import type { BirIncludable, BirNode, BloggerIRDocument } from './types.js'
import { getSpecCatalog } from '../catalogs/index.js'
import { expandServerInclusion } from '../inclusion-expander.js'
import { evaluateExpression, isEqual } from '../parser/index.js'
import { isTruthy } from '../type-system.js'
import { compileToIR } from './compiler.js'
import { lowerTemplate } from './lowering.js'
import { DomMutationPipeline } from './renderer/dom-mutation-pipeline.js'
import { HTML_VOID_ELEMENTS } from './renderer/html-serializer.js'
import {
  injectCookieNotice,
  injectSkinVariables,
  renderSkinStyles,
} from './renderer/platform-singletons.js'
import {
  bindIncludeScope,
  bindLoopScope,
  bindWidgetScope,
  bindWithScope,
} from './renderer/scope-binder.js'

export interface BloggerReferenceRendererOptions extends BloggerCompileIROptions {
  /**
   * If true, self-closing void tags are rendered with a trailing slash (<img />).
   * Defaults to true (compatible with XML and modern HTML5).
   */
  readonly selfClosingVoid?: boolean

  /**
   * Whether to emit synthetic section and widget wrapper containers.
   * Defaults to true in full compile, and false in compileFragment.
   */
  readonly emitWrappers?: boolean

  /**
   * Whether to rewrite protocol-relative URLs (//) to https:// for local previewability.
   * Defaults to false (preserving exact Blogger markup).
   */
  readonly normalizeProtocolRelativeUrls?: boolean

  /**
   * Maximum call depth for <b:include> subroutine invocations to prevent RangeError from infinite loops.
   * Defaults to 43 (canonical Blogger Core recursion ceiling; fails on frame 44).
   */
  readonly maxIncludeDepth?: number
}

/**
 * Canonical Reference Implementation and hermetic HTML renderer for Blogger Intermediate Representation (BIR).
 * Serves as an empirical testing oracle and local evaluation engine for blogger-spec.
 */
export class BloggerReferenceRenderer {
  private currentIr?: BloggerIRDocument
  private currentOptions?: BloggerReferenceRendererOptions
  private readonly pipeline = new DomMutationPipeline()
  private includeDepth = 0

  constructor(private readonly defaultOptions: BloggerReferenceRendererOptions = {}) {}

  /**
   * Compiles and renders a Blogger XML template or pre-compiled BIR document into HTML.
   */
  compile(
    input: string | BloggerIRDocument,
    context: Record<string, unknown> = {},
    options?: BloggerReferenceRendererOptions,
  ): string {
    const mergedOptions = { ...this.defaultOptions, ...options }
    const ir = typeof input === 'string' ? compileToIR(input, mergedOptions) : input
    this.currentIr = ir
    this.currentOptions = mergedOptions
    this.includeDepth = 0
    this.pipeline.clear()

    const effectiveContext = injectSkinVariables(ir.skin, context)
    const rawHtml = this.renderNodes(ir.root, effectiveContext)

    return injectCookieNotice(rawHtml, effectiveContext)
  }

  /**
   * Alias for compile, executing full BIR rendering into an HTML string.
   */
  render(
    input: string | BloggerIRDocument,
    context: Record<string, unknown> = {},
    options?: BloggerReferenceRendererOptions,
  ): string {
    return this.compile(input, context, options)
  }

  /**
   * Convenience alias for rendering a template fragment without wrapping containers.
   */
  compileFragment(
    input: string | BloggerIRDocument,
    context: Record<string, unknown> = {},
    options?: BloggerReferenceRendererOptions,
  ): string {
    return this.compile(input, context, { emitWrappers: false, ...options })
  }

  private renderNodes(nodes: readonly BirNode[], ctx: Record<string, unknown>): string {
    let out = ''
    for (const node of nodes) {
      out += this.renderNode(node, ctx)
    }
    return out
  }

  private renderNode(node: BirNode, ctx: Record<string, unknown>): string {
    const normalizeUrls = this.currentOptions?.normalizeProtocolRelativeUrls ?? false

    switch (node.kind) {
      case 'text':
      case 'cdata':
        return node.value

      case 'comment':
        return `<!--${node.value}-->`

      case 'output': {
        const val = evaluateExpression(node.expr, ctx as Record<string, any>)
        return (val === null || val === undefined) ? '' : String(val)
      }

      case 'element': {
        const isHtml = node.tag.toLowerCase() === 'html'
        const filteredAttrs = isHtml
          ? node.attributes.filter(a => !a.name.startsWith('b:'))
          : node.attributes

        const target = this.pipeline.createTarget(filteredAttrs, node.classes, ctx, normalizeUrls)
        this.pipeline.pushTarget(target)

        let childrenHtml = ''
        if (!node.isVoid || (!node.selfClosing && !node.whitespaceRemove)) {
          childrenHtml = this.renderNodes(node.children, ctx)

          if (node.tag.toLowerCase() === 'head' && this.currentIr?.skin) {
            childrenHtml += renderSkinStyles(this.currentIr.skin, ctx)
          }
        }

        this.pipeline.popTarget()
        const attrStr = this.pipeline.serializeAttributes(target, normalizeUrls)

        const isVoid = node.isVoid && HTML_VOID_ELEMENTS.has(node.tag.toLowerCase())
        if (isVoid && (node.selfClosing || node.whitespaceRemove)) {
          const selfClosing = this.currentOptions?.selfClosingVoid !== false
          return selfClosing ? `<${node.tag}${attrStr}/>` : `<${node.tag}${attrStr}>`
        }
        const markup = `<${node.tag}${attrStr}>${childrenHtml}</${node.tag}>`
        return isHtml ? `<!DOCTYPE html>\n${markup}` : markup
      }

      case 'tag': {
        if (node.cond !== undefined && !isTruthy(evaluateExpression(node.cond, ctx as Record<string, any>))) {
          return this.renderNodes(node.children, ctx)
        }
        const tagName = node.tag.kind === 'static'
          ? node.tag.value
          : String(evaluateExpression(node.tag.expr, ctx as Record<string, any>) ?? '')
        if (!tagName) {
          return this.renderNodes(node.children, ctx)
        }
        const isVoid = HTML_VOID_ELEMENTS.has(tagName.toLowerCase())
        const target = this.pipeline.createTarget(node.attributes, node.classes, ctx, normalizeUrls)
        this.pipeline.pushTarget(target)

        const innerHtml = this.renderNodes(node.children, ctx)

        this.pipeline.popTarget()
        const attrStr = this.pipeline.serializeAttributes(target, normalizeUrls)

        if (isVoid && node.whitespaceRemove && !innerHtml.trim()) {
          const selfClosing = this.currentOptions?.selfClosingVoid !== false
          return selfClosing ? `<${tagName}${attrStr}/>` : `<${tagName}${attrStr}>`
        }
        return `<${tagName}${attrStr}>${innerHtml}</${tagName}>`
      }

      case 'if': {
        for (const branch of node.branches) {
          if (!branch.test || isTruthy(evaluateExpression(branch.test, ctx as Record<string, any>))) {
            return this.renderNodes(branch.children, ctx)
          }
        }
        return ''
      }

      case 'loop': {
        const list = evaluateExpression(node.values, ctx as Record<string, any>)
        if (!Array.isArray(list)) {
          return ''
        }
        const items = node.reverse ? [...list].reverse() : list
        let out = ''
        items.forEach((item, index) => {
          const loopCtx = bindLoopScope(item, index, node.var, node.index, ctx)
          out += this.renderNodes(node.children, loopCtx)
        })
        return out
      }

      case 'with': {
        const withCtx = bindWithScope(node.bindings, ctx)
        return this.renderNodes(node.children, withCtx)
      }

      case 'switch': {
        const val = evaluateExpression(node.on, ctx as Record<string, any>)
        let defaultCase: readonly BirNode[] | undefined
        for (const c of node.cases) {
          if (c.match) {
            const matchVal = evaluateExpression(c.match, ctx as Record<string, any>)
            if (isEqual(val, matchVal)) {
              return this.renderNodes(c.children, ctx)
            }
          }
          else {
            defaultCase = c.children
          }
        }
        return defaultCase ? this.renderNodes(defaultCase, ctx) : ''
      }

      case 'include': {
        const target = node.target ?? (node.dynamicTarget ? String(evaluateExpression(node.dynamicTarget, ctx as Record<string, any>) ?? '') : undefined)
        if (!target) {
          return ''
        }
        if (!node.dynamicTarget && node.resolution?.tier === 'unresolved') {
          return node.resolution.failureComment ?? '<!-- unresolved -->'
        }
        const maxDepth = this.currentOptions?.maxIncludeDepth ?? 43
        if (this.includeDepth >= maxDepth) {
          return `<!-- recursion depth limit exceeded (${target}) -->`
        }
        const widgetId = (ctx.widget as any)?.id
        const widgetType = (ctx.widget as any)?.type
        const subroutine = this.findIncludable(target, widgetId, widgetType)
        if (!subroutine) {
          return node.resolution?.failureComment ?? '<!-- unresolved -->'
        }
        this.includeDepth++
        try {
          const subCtx = bindIncludeScope(subroutine, node.args, ctx)
          return this.renderNodes(subroutine.body, subCtx)
        }
        finally {
          this.includeDepth--
        }
      }

      case 'container': {
        const emitWrappers = this.currentOptions?.emitWrappers !== false
        if (node.role === 'section') {
          const sectionId = node.id ?? 'section'
          const tag = node.tag ?? 'div'
          const baseClass = node.className ? `${node.className} section` : 'section'
          const innerHtml = this.renderNodes(node.children, ctx)
          const finalClass = innerHtml.trim() ? baseClass : `${baseClass} no-items`
          return emitWrappers ? `<${tag} class="${finalClass}" id="${sectionId}">${innerHtml}</${tag}>` : innerHtml
        }
        if (node.role === 'widget') {
          const widgetId = node.id ?? ''
          const widgetType = node.widgetType ?? ''
          const sectionId = node.sectionId ?? 'content'

          const { widgetCtx, wrapperTarget } = bindWidgetScope(widgetId, widgetType, sectionId, node.title, ctx)
          this.pipeline.pushTarget(wrapperTarget)

          const mainSub = this.findIncludable('main', widgetId, widgetType)

          let bodyHtml = ''
          if (mainSub) {
            bodyHtml += this.renderNodes(mainSub.body, widgetCtx)
          }
          if (node.children.length > 0) {
            bodyHtml += this.renderNodes(node.children, widgetCtx)
          }

          this.pipeline.popTarget()
          const attrStr = this.pipeline.serializeAttributes(wrapperTarget, normalizeUrls)

          return emitWrappers ? `<div${attrStr}>${bodyHtml}</div>` : bodyHtml
        }
        return this.renderNodes(node.children, ctx)
      }

      case 'attrMutation': {
        if (node.cond !== undefined && !isTruthy(evaluateExpression(node.cond, ctx as Record<string, any>))) {
          return ''
        }
        const name = this.pipeline.resolveAttrValue(node.name, ctx, normalizeUrls)
        if (!name) {
          return ''
        }
        const val = this.pipeline.resolveAttrValue(node.value, ctx, normalizeUrls, true)
        this.pipeline.applyAttrMutation(name, val)
        return ''
      }

      case 'classMutation': {
        if (node.cond !== undefined && !isTruthy(evaluateExpression(node.cond, ctx as Record<string, any>))) {
          return ''
        }
        const name = this.pipeline.resolveAttrValue(node.name, ctx, normalizeUrls)
        if (name) {
          this.pipeline.applyClassMutation(name)
        }
        return ''
      }

      default:
        return ''
    }
  }

  private findIncludable(targetId: string, widgetId?: string, widgetType?: string): BirIncludable | undefined {
    if (!this.currentIr) {
      return undefined
    }

    // 0. Prefijo explícito o inclusión de servidor (super.* o all-head-content)
    if (targetId in this.currentIr.symbolTable) {
      if (targetId.includes(':') || targetId.startsWith('super.') || this.currentIr.symbolTable[targetId]?.tier === 'platform_server') {
        return this.currentIr.symbolTable[targetId]
      }
    }

    // 1. Tier 1: local_widget (privado al widget contenedor)
    if (widgetId && `${widgetId}:${targetId}` in this.currentIr.symbolTable) {
      return this.currentIr.symbolTable[`${widgetId}:${targetId}`]
    }

    // 2. Tier 2: gadget_specific (<b:defaultmarkup type='WidgetType'>)
    if (widgetType && `default:${widgetType}:${targetId}` in this.currentIr.symbolTable) {
      return this.currentIr.symbolTable[`default:${widgetType}:${targetId}`]
    }

    // 3. Tier 3: universal_widget (<b:defaultmarkup type='All'>)
    if (`all:${targetId}` in this.currentIr.symbolTable) {
      return this.currentIr.symbolTable[`all:${targetId}`]
    }

    // 4. Tier 4: shared_common (<b:defaultmarkup type='Common'>)
    if (`common:${targetId}` in this.currentIr.symbolTable) {
      return this.currentIr.symbolTable[`common:${targetId}`]
    }

    // 5. Tier 5: platform_server fallback (e.g. all-head-content or super.*)
    const spec = getSpecCatalog()
    const isSuper = targetId.startsWith('super.')
    const baseName = isSuper ? targetId.slice('super.'.length) : targetId
    if (spec.isServerInclusion(baseName) || isSuper) {
      const serverResult = expandServerInclusion(targetId, { catalog: spec, useLocalStub: true })
      const markup = serverResult?.markup || ''
      let body: readonly BirNode[] = []
      if (markup) {
        try {
          const subIr = lowerTemplate(`<b:includable id='_stub'>${markup}</b:includable>`, { catalog: spec })
          body = subIr.symbolTable._stub?.body ?? subIr.root
        }
        catch {
          body = [{ kind: 'text', value: markup }]
        }
      }
      const includable: BirIncludable = {
        id: targetId,
        tier: 'platform_server',
        params: [],
        body,
      }
      ;(this.currentIr.symbolTable as Record<string, BirIncludable>)[targetId] = includable
      return includable
    }

    // 6. Fallback a clave directa
    return this.currentIr.symbolTable[targetId]
  }
}
