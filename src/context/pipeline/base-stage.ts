import type { SpecCatalog } from '../../catalogs/spec-catalog.js'
import type { BloggerViewId } from '../../generated/types.generated.js'
import type { ContextStage, ResolutionState } from './types.js'

export function createCleanBaseContext(
  viewId: BloggerViewId,
  locale: string,
  spec: SpecCatalog,
): Record<string, any> {
  const matrixEntry = spec.getViewMatrixEntry(viewId)
  const view: Record<string, any> = {
    type: matrixEntry?.view_type ?? 'feed',
    title: '',
    description: '',
    url: '',
  }

  if (matrixEntry?.flags) {
    for (const [flag, val] of Object.entries(matrixEntry.flags)) {
      if (val === 'true') {
        view[flag] = true
      }
      else if (val === 'false') {
        view[flag] = false
      }
    }
  }

  const blog: Record<string, any> = {
    locale,
    localeUnderscoreDelimited: locale.replace('-', '_'),
    languageDirection: spec.isRTL(locale) ? 'rtl' : 'ltr',
    encoding: 'UTF-8',
    isMobileRequest: false,
    adultContent: false,
    httpsEnabled: true,
    hasCustomDomain: false,
    adsenseHasAds: false,
    adsenseAutoAds: false,
    enabledCommentProfileImages: true,
    pageType: matrixEntry?.blog_page_type ?? 'index',
    pageTitle: '',
    pageName: '',
    isPrivate: false,
    isPrivateBlog: false,
  }

  const messages: Record<string, string> = {
    ...spec.getAllLocalizedMessages(locale),
  }

  const widgetData: Record<string, any> = {}

  return {
    view,
    blog,
    messages,
    skin: { vars: {} },
    widgetData,
    widgets: [],
  }
}

export class BaseStage implements ContextStage {
  readonly name = 'base'

  process(context: Record<string, any>, state: ResolutionState): void {
    const base = createCleanBaseContext(state.viewId, state.blogLocale, state.spec)
    for (const [key, val] of Object.entries(base)) {
      if (context[key] === undefined) {
        context[key] = val
      }
    }
  }
}
