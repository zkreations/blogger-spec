import type { BirAttrValue, BirIncludable, BirWithBinding } from '../types.js'
import type { MutationTarget } from './dom-mutation-pipeline.js'
import { evaluateExpression } from '../../parser/index.js'

export function bindLoopScope(
  item: unknown,
  index: number,
  nodeVar: string,
  nodeIndex: string | undefined,
  parentCtx: Record<string, unknown>,
): Record<string, unknown> {
  const parentData = (parentCtx.data && typeof parentCtx.data === 'object')
    ? (parentCtx.data as Record<string, any>)
    : {}
  const loopData = { ...parentData, [nodeVar]: item }
  if (nodeIndex) {
    loopData[nodeIndex] = index
  }
  const loopCtx: Record<string, unknown> = {
    ...parentCtx,
    [nodeVar]: item,
    data: loopData,
  }
  if (nodeIndex) {
    loopCtx[nodeIndex] = index
  }
  return loopCtx
}

export function bindWithScope(
  bindings: readonly BirWithBinding[],
  parentCtx: Record<string, unknown>,
): Record<string, unknown> {
  const withCtx: Record<string, unknown> = { ...parentCtx }
  const parentData = (parentCtx.data && typeof parentCtx.data === 'object')
    ? (parentCtx.data as Record<string, any>)
    : {}
  const withData = { ...parentData }
  for (const b of bindings) {
    let val = evaluateExpression(b.value, withCtx as Record<string, any>)
    if (b.isDynamicDereference && typeof val === 'string' && val.startsWith('data:')) {
      const cleanPath = val.slice(5)
      const segments = cleanPath.split('.').map(s => s.trim()).filter(Boolean)
      let resolved: any
      if (segments.length > 0) {
        if (segments[0]! in withData) {
          let curr: any = withData
          for (const seg of segments) {
            if (curr === null || curr === undefined) {
              curr = undefined
              break
            }
            curr = curr[seg]
          }
          resolved = curr
        }
        else if (segments[0]! in withCtx) {
          let curr: any = withCtx
          for (const seg of segments) {
            if (curr === null || curr === undefined) {
              curr = undefined
              break
            }
            curr = curr[seg]
          }
          resolved = curr
        }
      }
      val = resolved
    }
    withCtx[b.var] = val
    withData[b.var] = val
  }
  withCtx.data = withData
  return withCtx
}

export function bindWidgetScope(
  widgetId: string,
  widgetType: string,
  sectionId: string,
  title: string | undefined,
  parentCtx: Record<string, unknown>,
): { widgetCtx: Record<string, unknown>, wrapperTarget: MutationTarget } {
  const rawWidgetData = (parentCtx.widgets as any)?.[widgetId]
    ?? (parentCtx.widgetData as any)?.[widgetId]
    ?? {}

  const widgetData = { ...rawWidgetData }
  if (title !== undefined) {
    widgetData.title = title
  }

  const widgetCtx: Record<string, unknown> = {
    ...parentCtx,
    ...widgetData,
    widget: {
      id: widgetId,
      instanceId: widgetId,
      type: widgetType,
      sectionId,
      version: 2,
    },
    this: widgetData,
    data: widgetData,
  }

  const wrapperTarget: MutationTarget = {
    classes: new Set(['widget', widgetType]),
    attributes: new Map(),
  }
  if (widgetId) {
    wrapperTarget.attributes.set('id', widgetId)
  }
  wrapperTarget.attributes.set('data-version', '2')

  return { widgetCtx, wrapperTarget }
}

export function bindIncludeScope(
  subroutine: BirIncludable,
  args: Record<string, BirAttrValue>,
  parentCtx: Record<string, unknown>,
): Record<string, unknown> {
  const subCtx: Record<string, unknown> = { ...parentCtx }
  const widgetBaseData = (parentCtx.this && typeof parentCtx.this === 'object')
    ? (parentCtx.this as Record<string, any>)
    : {}

  for (const [argName, argVal] of Object.entries(args)) {
    const val = argVal.kind === 'static'
      ? argVal.value
      : evaluateExpression(argVal.expr, parentCtx as Record<string, any>)

    if (subroutine.params && subroutine.params.length > 0 && (argName === 'data' || argName === 'var')) {
      for (const p of subroutine.params) {
        subCtx[p] = val
        const parentData = (parentCtx.data && typeof parentCtx.data === 'object')
          ? (parentCtx.data as Record<string, any>)
          : {}
        subCtx.data = { ...parentData, [p]: val }
      }
    }
    else if (argName === 'data' && (!subroutine.params || subroutine.params.length === 0)) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        Object.assign(subCtx, val)
        subCtx.data = { ...widgetBaseData, ...(val as Record<string, any>) }
      }
      else {
        subCtx.data = val
      }
    }
    else {
      subCtx[argName] = val
    }
  }

  return subCtx
}
