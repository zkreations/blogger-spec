import type { BirAttribute, BirAttrValue, BirClassMutation } from '../types.js'
import { evaluateExpression } from '../../parser/index.js'
import { isTruthy } from '../../type-system.js'
import { escapeAttr, normalizeProtocolUrl } from './html-serializer.js'

export interface MutationTarget {
  classes: Set<string>
  attributes: Map<string, string>
}

export class DomMutationPipeline {
  private stack: MutationTarget[] = []

  clear(): void {
    this.stack = []
  }

  pushTarget(target: MutationTarget): void {
    this.stack.push(target)
  }

  popTarget(): MutationTarget | undefined {
    return this.stack.pop()
  }

  current(): MutationTarget | undefined {
    return this.stack[this.stack.length - 1]
  }

  resolveAttrValue(val: BirAttrValue, ctx: Record<string, unknown>, normalizeUrls = false): string | undefined {
    if (val.kind === 'static') {
      return val.value
    }
    let evalResult = evaluateExpression(val.expr, ctx as Record<string, any>)

    if (typeof evalResult === 'string' && evalResult.startsWith('data:') && !evalResult.includes(' ')) {
      const propPath = evalResult.slice(5)
      const dataObj = (ctx.data && typeof ctx.data === 'object') ? (ctx.data as Record<string, any>) : {}
      if (propPath in dataObj) {
        evalResult = dataObj[propPath]
      }
      else if (propPath in ctx) {
        evalResult = (ctx as any)[propPath]
      }
      else {
        evalResult = evaluateExpression({
          type: 'DataPath',
          raw: evalResult,
          members: propPath.split('.').map(p => ({ property: p, safeAccess: false })),
        } as any, ctx as Record<string, any>)
      }
    }

    if (evalResult === null || evalResult === undefined || evalResult === false || evalResult === '') {
      return undefined
    }
    const resStr = String(evalResult)
    return normalizeProtocolUrl(resStr, normalizeUrls)
  }

  createTarget(
    attributes: readonly BirAttribute[],
    classes: readonly BirClassMutation[],
    ctx: Record<string, unknown>,
    normalizeUrls = false,
  ): MutationTarget {
    const classSet = new Set<string>()
    for (const cls of classes) {
      if (cls.cond !== undefined && !isTruthy(evaluateExpression(cls.cond, ctx as Record<string, any>))) {
        continue
      }
      const val = this.resolveAttrValue(cls.name, ctx, normalizeUrls)
      if (val) {
        for (const token of val.trim().split(/\s+/)) {
          if (token) {
            classSet.add(token)
          }
        }
      }
    }

    const attrsMap = new Map<string, string>()
    for (const attr of attributes) {
      if (attr.cond !== undefined && !isTruthy(evaluateExpression(attr.cond, ctx as Record<string, any>))) {
        continue
      }
      const val = this.resolveAttrValue(attr.value, ctx, normalizeUrls)
      if (val !== undefined && val !== null && val !== '') {
        attrsMap.set(attr.name, val)
      }
    }

    return { classes: classSet, attributes: attrsMap }
  }

  applyAttrMutation(name: string, val: string | undefined): void {
    const target = this.current()
    if (!target)
      return

    if (name === 'class') {
      if (val === undefined || val === null || val === '') {
        target.classes.clear()
      }
      else {
        target.classes = new Set(val.trim().split(/\s+/).filter(Boolean))
      }
      return
    }

    if (val === undefined || val === null || val === '') {
      target.attributes.delete(name)
    }
    else {
      target.attributes.set(name, val)
    }
  }

  applyClassMutation(tokenString: string): void {
    const target = this.current()
    if (!target)
      return

    for (const token of tokenString.trim().split(/\s+/)) {
      if (token) {
        target.classes.add(token)
      }
    }
  }

  serializeAttributes(target: MutationTarget, normalizeUrls = false): string {
    const parts: string[] = []
    if (target.classes.size > 0) {
      parts.push(`class="${escapeAttr(Array.from(target.classes).join(' '))}"`)
    }
    for (const [name, val] of target.attributes.entries()) {
      if (name !== 'class') {
        const normalizedVal = (name === 'src' || name === 'href' || name === 'action' || name === 'poster')
          ? normalizeProtocolUrl(val, normalizeUrls)
          : val
        parts.push(`${name}="${escapeAttr(normalizedVal)}"`)
      }
    }
    return parts.length > 0 ? ` ${parts.join(' ')}` : ''
  }
}
