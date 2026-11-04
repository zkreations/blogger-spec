import type { FlowBirNode, FlowDirectiveHandler } from './types.js'
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

const FLOW_HANDLERS_BY_TAG = new Map<string, FlowDirectiveHandler<any>>([
  ['b:if', bIfHandler],
  ['b:switch', bSwitchHandler],
  ['b:loop', bLoopHandler],
  ['b:with', bWithHandler],
])

const FLOW_HANDLERS_BY_KIND = new Map<string, FlowDirectiveHandler<any>>([
  ['if', bIfHandler],
  ['switch', bSwitchHandler],
  ['loop', bLoopHandler],
  ['with', bWithHandler],
])

const DOM_HANDLERS_BY_TAG = new Map<string, any>([
  ['b:tag', bTagHandler],
  ['b:attr', bAttrHandler],
  ['b:class', bClassHandler],
])

const OUTPUT_HANDLERS_BY_TAG = new Map<string, any>([
  ['b:eval', bEvalHandler],
  ['b:message', bMessageHandler],
  ['b:comment', bCommentHandler],
])

export function isFlowDirective(tagName: string): boolean {
  return FLOW_HANDLERS_BY_TAG.has(tagName)
}

export function getFlowDirectiveHandler(tagName: string): FlowDirectiveHandler<any> | undefined {
  return FLOW_HANDLERS_BY_TAG.get(tagName)
}

export function isFlowBirKind(kind: string): kind is FlowBirNode['kind'] {
  return FLOW_HANDLERS_BY_KIND.has(kind)
}

export function getFlowRenderer(kind: string): FlowDirectiveHandler<any> | undefined {
  return FLOW_HANDLERS_BY_KIND.get(kind)
}

export function isDomDirective(tagName: string): boolean {
  return DOM_HANDLERS_BY_TAG.has(tagName)
}

export function getDomDirectiveHandler(tagName: string): any {
  return DOM_HANDLERS_BY_TAG.get(tagName)
}

export function isOutputDirective(tagName: string): boolean {
  return OUTPUT_HANDLERS_BY_TAG.has(tagName)
}

export function getOutputDirectiveHandler(tagName: string): any {
  return OUTPUT_HANDLERS_BY_TAG.get(tagName)
}
