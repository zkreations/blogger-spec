import type { BirNode } from '../types.js'
import type {
  BirDirectiveHandler,
  DirectiveLowerContext,
  DirectiveRenderContext,
  FlowBirNode,
  FlowDirectiveHandler,
} from './types.js'
import {
  bAttrHandler,
  bClassHandler,
  bTagHandler,
} from './dom/index.js'
import {
  bIfHandler,
  bLoopHandler,
  bSwitchHandler,
  bWithHandler,
} from './flow/index.js'
import {
  bCommentHandler,
  bEvalHandler,
  bMessageHandler,
} from './output/index.js'
import {
  bIncludeHandler,
} from './subroutines/index.js'

export class DirectiveRegistry {
  private static readonly handlersByTag = new Map<string, BirDirectiveHandler<any, any>>([
    // Flow
    ['b:if', bIfHandler],
    ['b:switch', bSwitchHandler],
    ['b:loop', bLoopHandler],
    ['b:with', bWithHandler],
    // DOM
    ['b:tag', bTagHandler],
    ['b:attr', bAttrHandler],
    ['b:class', bClassHandler],
    // Output
    ['b:eval', bEvalHandler],
    ['b:message', bMessageHandler],
    ['b:comment', bCommentHandler],
    // Subroutines
    ['b:include', bIncludeHandler],
  ])

  private static readonly handlersByKind = new Map<string, BirDirectiveHandler<any, any>>([
    ['if', bIfHandler],
    ['switch', bSwitchHandler],
    ['loop', bLoopHandler],
    ['with', bWithHandler],
    ['tag', bTagHandler],
    ['attrMutation', bAttrHandler],
    ['classMutation', bClassHandler],
    ['comment', bCommentHandler],
    ['include', bIncludeHandler],
  ])

  static isDirective(tagName: string): boolean {
    return this.handlersByTag.has(tagName)
  }

  static getLowerer(tagName: string): ((node: any, ctx: DirectiveLowerContext) => BirNode | BirNode[]) | undefined {
    const handler = this.handlersByTag.get(tagName)
    return handler ? (node, ctx) => handler.lower(node, ctx) : undefined
  }

  static getRenderer(kind: string): ((node: any, ctx: Record<string, any>, renderCtx: DirectiveRenderContext) => string) | undefined {
    const handler = this.handlersByKind.get(kind)
    return handler ? (n, c, r) => handler.render(n, c, r) : undefined
  }

  static getHandler(tagName: string): BirDirectiveHandler<any, any> | undefined {
    return this.handlersByTag.get(tagName)
  }

  static getHandlerByKind(kind: string): BirDirectiveHandler<any, any> | undefined {
    return this.handlersByKind.get(kind)
  }
}

export function isFlowDirective(tagName: string): boolean {
  return DirectiveRegistry.isDirective(tagName) && ['b:if', 'b:switch', 'b:loop', 'b:with'].includes(tagName)
}

export function getFlowDirectiveHandler(tagName: string): FlowDirectiveHandler<any> | undefined {
  return DirectiveRegistry.getHandler(tagName) as FlowDirectiveHandler<any> | undefined
}

export function isFlowBirKind(kind: string): kind is FlowBirNode['kind'] {
  return ['if', 'switch', 'loop', 'with'].includes(kind)
}

export function getFlowRenderer(kind: string): FlowDirectiveHandler<any> | undefined {
  return DirectiveRegistry.getHandlerByKind(kind) as FlowDirectiveHandler<any> | undefined
}

export function isDomDirective(tagName: string): boolean {
  return ['b:tag', 'b:attr', 'b:class'].includes(tagName)
}

export function getDomDirectiveHandler(tagName: string): any {
  return DirectiveRegistry.getHandler(tagName)
}

export function isOutputDirective(tagName: string): boolean {
  return ['b:eval', 'b:message', 'b:comment'].includes(tagName)
}

export function getOutputDirectiveHandler(tagName: string): any {
  return DirectiveRegistry.getHandler(tagName)
}
