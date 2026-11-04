import type { FlowBirNode, FlowDirectiveHandler } from './types.js'
import {
  bIfHandler,
  bLoopHandler,
  bSwitchHandler,
  bWithHandler,
} from './flow/index.js'

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

