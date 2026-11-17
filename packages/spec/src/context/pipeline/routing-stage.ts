import type { BloggerViewId } from '../../generated/types.generated.js'
import type { ContextStage, ResolutionState } from './types.js'
import { resolveBloggerRoute } from '../routing.js'

export function isSameUrlOrPath(candidate: string | undefined, target: string | undefined): boolean {
  if (!candidate || !target) {
    return false
  }
  if (candidate === target) {
    return true
  }
  try {
    const c = new URL(candidate, 'https://blogger.com')
    const t = new URL(target, 'https://blogger.com')
    return c.pathname === t.pathname
  }
  catch {
    return false
  }
}

export class RoutingStage implements ContextStage {
  readonly name = 'routing'

  process(context: Record<string, any>, state: ResolutionState): void {
    const activeUrl = state.activeUrl
    const resolvedRoute = activeUrl ? resolveBloggerRoute(activeUrl) : undefined
    state.resolvedRoute = resolvedRoute

    if (!state.config.view && resolvedRoute?.viewId) {
      state.viewId = resolvedRoute.viewId as BloggerViewId
    }

    if (state.viewId === 'static_page') {
      state.currentPath = state.config.targetUrl || context.view?.url || state.config.overrides?.view?.url
    }
  }
}
