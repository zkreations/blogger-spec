/**
 * Canonical Reference Compiler & HTML Renderer for Blogger Intermediate Representation (BIR).
 * Provides hermetic, zero-runtime-dependency evaluation of BIR documents into HTML strings.
 */
import type { SpecCatalog } from '../catalogs/index.js'
import type { BloggerCompileIROptions } from './compiler.js'
import type { BirIncludable, BirNode, BloggerIRDocument } from './types.js'
import { getSpecCatalog } from '../catalogs/index.js'
import { expandServerInclusion } from '../inclusion-expander.js'
import { evaluateExpression } from '../parser/index.js'
import { isTruthy } from '../type-system.js'
import { formatGadgetAbortComment } from '../types.js'
import { compileToIR } from './compiler.js'
import {
  getFlowRenderer,
  renderAttrMutation,
  renderBirOutput,
  renderClassMutation,
  renderCommentNode,
  renderTagDirective,
} from './directives/index.js'
import { lowerTemplate } from './lowering.js'
import { DomMutationPipeline } from './renderer/dom-mutation-pipeline.js'
import { escapeAttr, HTML_VOID_ELEMENTS } from './renderer/html-serializer.js'
import {
  injectCookieNotice,
  injectSkinVariables,
  renderSkinNode,
} from './renderer/platform-singletons.js'
import {
  bindIncludeScope,
  bindWidgetScope,
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
  private currentCatalog: SpecCatalog = getSpecCatalog()
  private readonly pipeline = new DomMutationPipeline()
  private readonly serverSubroutineCache = new Map<string, BirIncludable>()
  private includeDepth = 0

  constructor(private readonly defaultOptions: BloggerReferenceRendererOptions = {}) {
    this.currentCatalog = defaultOptions.catalog ?? getSpecCatalog()
  }

  /**
   * Compiles and renders a Blogger XML template or pre-compiled BIR document into HTML.
   */
  compile(
    input: string | BloggerIRDocument,
    context: Record<string, unknown> = {},
    options?: BloggerReferenceRendererOptions,
  ): string {
    const mergedOptions = { ...this.defaultOptions, ...options }
    const catalog = mergedOptions.catalog ?? getSpecCatalog()
    this.currentCatalog = catalog
    const ir = typeof input === 'string' ? compileToIR(input, mergedOptions) : input
    this.currentIr = ir
    this.currentOptions = mergedOptions
    this.includeDepth = 0
    this.pipeline.clear()
    this.serverSubroutineCache.clear()

    const effectiveContext = injectSkinVariables(ir.skin, context)
    const rawHtml = this.renderNodes(ir.root, effectiveContext)

    return injectCookieNotice(rawHtml, effectiveContext, catalog)
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
        return renderCommentNode(node)

      case 'skin':
        return renderSkinNode(node.role, this.currentIr?.skin, ctx, this.currentCatalog)

      case 'output':
        return renderBirOutput(node, ctx as Record<string, any>, this.currentCatalog)

      case 'element': {
        const isHtml = node.tag.toLowerCase() === 'html'
        const filteredAttrs = isHtml
          ? node.attributes.filter(a => !a.name.startsWith('b:'))
          : node.attributes

        const target = this.pipeline.createTarget(filteredAttrs, node.classes, ctx, normalizeUrls)
        this.pipeline.pushTarget(target)

        const childrenHtml = this.renderNodes(node.children, ctx)

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

      case 'tag':
        return renderTagDirective(node, ctx as Record<string, any>, {
          normalizeUrls,
          pipeline: this.pipeline,
          renderNodes: (nodes, c) => this.renderNodes(nodes, c),
          selfClosingVoid: this.currentOptions?.selfClosingVoid !== false,
        })

      case 'if':
      case 'loop':
      case 'with':
      case 'switch': {
        const handler = getFlowRenderer(node.kind)
        if (handler) {
          return handler.render(node as any, ctx as Record<string, any>, {
            renderNodes: (nodes, c) => this.renderNodes(nodes, c),
          })
        }
        return ''
      }

      case 'include': {
        if (node.args.cond) {
          const condVal = node.args.cond.kind === 'static'
            ? (node.args.cond.value === 'true' || node.args.cond.value === 'yes')
            : evaluateExpression(node.args.cond.expr, ctx as Record<string, any>)
          if (!isTruthy(condVal)) {
            return ''
          }
        }
        const target = node.target ?? (node.dynamicTarget ? String(evaluateExpression(node.dynamicTarget, ctx as Record<string, any>) ?? '') : undefined)
        if (!target) {
          return ''
        }
        const catalog = this.currentOptions?.catalog ?? getSpecCatalog()
        const maxDepth = this.currentOptions?.maxIncludeDepth ?? catalog.getIncludeRecursionLimit()
        if (this.includeDepth >= maxDepth) {
          return `<!-- recursion depth limit exceeded (${target}) -->`
        }
        const widgetId = (ctx.widget as any)?.id
        const widgetType = (ctx.widget as any)?.type
        const subroutine = this.findIncludable(target, widgetId, widgetType)
        if (!subroutine) {
          return node.resolution?.failureComment ?? formatGadgetAbortComment(widgetId || 'Widget')
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
          if (node.cond !== undefined && !isTruthy(evaluateExpression(node.cond, ctx as Record<string, any>))) {
            return ''
          }
          const sectionId = node.id ?? 'section'
          const tag = (node.tag ? this.pipeline.resolveAttrValue(node.tag, ctx, normalizeUrls) : undefined) || 'div'
          const nameVal = node.name ? this.pipeline.resolveAttrValue(node.name, ctx, normalizeUrls) : undefined
          const nameAttr = nameVal ? ` name="${escapeAttr(nameVal)}"` : ''
          const innerHtml = node.suppressedInV3 ? '' : this.renderNodes(node.children, ctx)
          const baseClass = node.className ? `${node.className} section` : 'section'
          const emptyClass = node.className ? `${node.className} no-items section` : 'no-items section'
          const finalClass = innerHtml.trim() ? baseClass : emptyClass
          return emitWrappers ? `<${tag} class="${finalClass}" id="${sectionId}"${nameAttr}>${innerHtml}</${tag}>` : innerHtml
        }
        if (node.role === 'widget') {
          if (node.visible === false) {
            return ''
          }
          if (node.cond !== undefined && !isTruthy(evaluateExpression(node.cond, ctx as Record<string, any>))) {
            return ''
          }
          const widgetId = node.id ?? ''
          const widgetType = node.widgetType ?? ''
          const sectionId = node.sectionId ?? 'content'

          const { widgetCtx, wrapperTarget } = bindWidgetScope(
            widgetId,
            widgetType,
            sectionId,
            node.title,
            ctx,
            node.version ?? 2,
            node.settings,
          )
          this.pipeline.pushTarget(wrapperTarget)

          const mainSub = this.findIncludable('main', widgetId, widgetType)

          let bodyHtml = ''
          if (mainSub) {
            const mainCtx = mainSub.params.length > 0
              ? bindIncludeScope(mainSub, {}, widgetCtx, true)
              : widgetCtx
            bodyHtml += this.renderNodes(mainSub.body, mainCtx)
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

      case 'attrMutation':
        return renderAttrMutation(node, ctx as Record<string, any>, {
          normalizeUrls,
          pipeline: this.pipeline,
          renderNodes: (nodes, c) => this.renderNodes(nodes, c),
        })

      case 'classMutation':
        return renderClassMutation(node, ctx as Record<string, any>, {
          normalizeUrls,
          pipeline: this.pipeline,
          renderNodes: (nodes, c) => this.renderNodes(nodes, c),
        })

      default:
        return ''
    }
  }

  private findIncludable(targetId: string, widgetId?: string, widgetType?: string): BirIncludable | undefined {
    if (!this.currentIr) {
      return undefined
    }

    const sym = this.currentIr.symbolTable
    const isSuper = targetId.startsWith('super.')

    if (!isSuper) {
      const inWidgetScope = Boolean(widgetId || widgetType)

      if (widgetId && `widget:${widgetId}:${targetId}` in sym) {
        return sym[`widget:${widgetId}:${targetId}`]
      }

      if (widgetType && `gadget:${widgetType}:${targetId}` in sym) {
        return sym[`gadget:${widgetType}:${targetId}`]
      }

      if (inWidgetScope && `all:${targetId}` in sym) {
        return sym[`all:${targetId}`]
      }

      if (`common:${targetId}` in sym) {
        return sym[`common:${targetId}`]
      }
    }

    if (`server:${targetId}` in sym) {
      return sym[`server:${targetId}`]
    }

    const cached = this.serverSubroutineCache.get(targetId)
    if (cached) {
      return cached
    }

    const catalog = this.currentOptions?.catalog ?? getSpecCatalog()
    const baseName = isSuper ? targetId.slice('super.'.length) : targetId
    if (catalog.isServerInclusion(baseName) || isSuper) {
      const serverResult = expandServerInclusion(targetId, { catalog, useLocalStub: true })
      const markup = serverResult?.markup || ''
      const incDef = catalog.getInclusion(baseName)
      const varMatch = incDef?.server_markup ? /^<b:includable\b[^>]+\bvar=['"]([^'"]+)['"]/i.exec(incDef.server_markup.trim()) : null
      const params = varMatch?.[1] ? [varMatch[1]] : []
      let body: readonly BirNode[] = []
      if (markup) {
        try {
          const subIr = lowerTemplate(`<b:includable id='_stub'>${markup}</b:includable>`, { catalog })
          body = subIr.symbolTable['common:_stub']?.body ?? subIr.root
        }
        catch {
          body = [{ kind: 'text', value: markup }]
        }
      }
      const includable: BirIncludable = {
        id: targetId,
        tier: 'platform_server',
        params,
        body,
      }
      this.serverSubroutineCache.set(targetId, includable)
      return includable
    }

    return undefined
  }
}
