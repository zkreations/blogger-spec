import { describe, expect, it } from 'vitest'
import {
  ANONYMOUS_KEYS_KEY,
  RuntimeLexicalScope,
} from '../src/ir/renderer/lexical-scope.js'

describe('runtimeLexicalScope', () => {
  it('attaches and retrieves anonymous keys without exposing them in Object.keys', () => {
    const ctx: Record<string, any> = { title: 'Test', count: 10 }
    const keys = new Set(['title'])

    RuntimeLexicalScope.attachAnonymousKeys(ctx, keys)

    expect(RuntimeLexicalScope.getAnonymousKeys(ctx)).toBe(keys)
    expect(Object.keys(ctx)).toEqual(['title', 'count'])
    expect(Object.hasOwn(ctx, ANONYMOUS_KEYS_KEY)).toBe(true)
  })

  it('clones context cleanly, filtering out transient anonymous keys when requested', () => {
    const parent: Record<string, any> = {
      title: 'Transient Title',
      permanentVar: 'Permanent',
    }
    RuntimeLexicalScope.attachAnonymousKeys(parent, new Set(['title']))

    // With purge: false, all properties are preserved
    const inherited = RuntimeLexicalScope.cloneContext(parent, false)
    expect(inherited.title).toBe('Transient Title')
    expect(inherited.permanentVar).toBe('Permanent')

    // With purge: true, only anonymous keys are omitted, while lexical locals remain
    const purged = RuntimeLexicalScope.cloneContext(parent, true)
    expect(purged.title).toBeUndefined()
    expect(purged.permanentVar).toBe('Permanent')
    // Parent object is not mutated
    expect(parent.title).toBe('Transient Title')
  })

  it('clones data payload cleanly without mutating the original record', () => {
    const parentCtx: Record<string, any> = {}
    RuntimeLexicalScope.attachAnonymousKeys(parentCtx, new Set(['tempProp']))

    const originalData = { tempProp: 'temp', realProp: 'real' }
    const cleaned = RuntimeLexicalScope.cloneData(originalData, true, parentCtx)

    expect(cleaned.tempProp).toBeUndefined()
    expect(cleaned.realProp).toBe('real')
    expect(originalData.tempProp).toBe('temp')
  })

  it('propagates anonymous keys to child contexts in loop and with bindings', () => {
    const parent: Record<string, any> = {}
    const keys = new Set(['transientKey'])
    RuntimeLexicalScope.attachAnonymousKeys(parent, keys)

    const child: Record<string, any> = { localVar: 42 }
    RuntimeLexicalScope.propagate(child, parent)

    expect(RuntimeLexicalScope.getAnonymousKeys(child)).toBe(keys)
  })
})
