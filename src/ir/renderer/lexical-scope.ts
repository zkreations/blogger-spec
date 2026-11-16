/**
 * Blogger Intermediate Representation (BIR) Runtime Lexical Scope
 * Provides pure, immutable scope nesting and lexical isolation without destructive property mutations.
 */

export const ANONYMOUS_KEYS_KEY = Symbol.for('blogger.anonymousKeys')

export class RuntimeLexicalScope {
  /**
   * Returns the set of transient anonymous payload keys attached to this scope context, if any.
   */
  static getAnonymousKeys(ctx: Record<string, any>): Set<string> | undefined {
    return ctx && typeof ctx === 'object' ? (ctx as any)[ANONYMOUS_KEYS_KEY] : undefined
  }

  /**
   * Attaches anonymous payload keys to a scope context as a non-enumerable property.
   */
  static attachAnonymousKeys(ctx: Record<string, any>, keys: Set<string>): void {
    Object.defineProperty(ctx, ANONYMOUS_KEYS_KEY, {
      configurable: true,
      enumerable: false,
      value: keys,
      writable: true,
    })
  }

  /**
   * Propagates anonymous payload keys from parent to child scope context (e.g. inside loop or with).
   */
  static propagate(childCtx: Record<string, any>, parentCtx: Record<string, any>): void {
    const keys = this.getAnonymousKeys(parentCtx)
    if (keys && keys.size > 0) {
      this.attachAnonymousKeys(childCtx, keys)
    }
  }

  /**
   * Creates a shallow copy of a context, omitting any transient anonymous payload keys if purgeAnonymous is true.
   */
  static cloneContext(
    sourceCtx: Record<string, any>,
    purgeAnonymous: boolean,
  ): Record<string, any> {
    const anonymousKeys = purgeAnonymous ? this.getAnonymousKeys(sourceCtx) : undefined
    if (!anonymousKeys || anonymousKeys.size === 0) {
      return { ...sourceCtx }
    }

    const target: Record<string, any> = {}
    for (const [key, val] of Object.entries(sourceCtx)) {
      if (!anonymousKeys.has(key)) {
        target[key] = val
      }
    }
    return target
  }

  /**
   * Clones context.data, omitting any transient anonymous payload keys if purgeAnonymous is true.
   */
  static cloneData(
    data: unknown,
    purgeAnonymous: boolean,
    sourceCtx: Record<string, any>,
  ): Record<string, any> {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return {}
    }
    const anonymousKeys = purgeAnonymous ? this.getAnonymousKeys(sourceCtx) : undefined
    if (!anonymousKeys || anonymousKeys.size === 0) {
      return { ...(data as Record<string, any>) }
    }

    const target: Record<string, any> = {}
    for (const [key, val] of Object.entries(data as Record<string, any>)) {
      if (!anonymousKeys.has(key)) {
        target[key] = val
      }
    }
    return target
  }
}
