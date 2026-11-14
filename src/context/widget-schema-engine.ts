import type { SpecCatalog } from '../catalogs/spec-catalog.js'
import type { BloggerCanonicalProperty } from '../generated/types.generated.js'
import type { DiscoveredWidget } from './types.js'
import { bindWidgetSettingsToData } from './data-binder.js'

export interface WidgetInstantiationOptions {
  readonly widget: DiscoveredWidget
  readonly type: string
  readonly merged: Record<string, any>
  readonly catalogDefaults?: Record<string, any>
  readonly templateSettings?: Record<string, any>
  readonly instanceConfig?: Record<string, any>
  readonly instanceOverrides?: Record<string, any>
  readonly genericTypeConfig?: Record<string, any>
  readonly spec: SpecCatalog
  readonly blogLocale: string
}

const COMMON_PROPERTY_ALIASES: Record<string, Record<string, string>> = {
  Profile: {
    author: 'displayname',
    displayName: 'displayname',
    snippet: 'aboutme',
    bio: 'aboutme',
    avatar: 'authorPhoto',
    profileUrl: 'userUrl',
    showAboutMe: 'showaboutme',
    showLocation: 'showlocation',
  },
  HTML: {
    html: 'content',
    body: 'content',
  },
  Text: {
    text: 'content',
    body: 'content',
  },
  Image: {
    url: 'sourceUrl',
    src: 'sourceUrl',
    imageUrl: 'sourceUrl',
  },
  LinkList: {
    items: 'links',
  },
  PageList: {
    pages: 'links',
  },
}

export function evaluateWidgetCondition(condition: string | undefined, state: Record<string, any>): boolean {
  if (!condition)
    return true

  if (condition === 'team == false') {
    return !state.team
  }
  if (condition === 'team == true') {
    return Boolean(state.team)
  }
  if (condition === 'google_hosted_image') {
    const src = state.sourceUrl || state.image
    if (typeof src === 'string') {
      return src.includes('googleusercontent.com') || src.includes('bp.blogspot.com')
    }
    return true
  }

  return true
}

export function normalizeConfigValue(
  propName: string,
  rawVal: any,
  _propDef?: BloggerCanonicalProperty,
): any {
  if (rawVal === undefined)
    return undefined

  // Normalization for authorPhoto: allow passing avatar string URL
  if (propName === 'authorPhoto') {
    if (typeof rawVal === 'string' && rawVal) {
      return {
        image: rawVal,
        url: rawVal,
        alt: '',
        width: 80,
        height: 80,
      }
    }
    if (typeof rawVal === 'object' && rawVal !== null) {
      const img = rawVal.image || rawVal.url || ''
      return {
        image: img,
        url: img,
        alt: rawVal.alt || '',
        width: rawVal.width || 80,
        height: rawVal.height || 80,
        ...rawVal,
      }
    }
  }

  return rawVal
}

export function instantiateWidgetFromCatalog(options: WidgetInstantiationOptions): Record<string, any> {
  const {
    widget,
    type,
    merged,
    templateSettings,
    instanceConfig,
    instanceOverrides,
    genericTypeConfig,
    spec,
    blogLocale,
  } = options

  const widgetDef = spec.getWidget(type)
  const canonicalDefs: Record<string, BloggerCanonicalProperty> = widgetDef?.canonical || {}
  const aliases = COMMON_PROPERTY_ALIASES[type] || {}

  // 1. Determine preliminary state for condition evaluation (e.g. team toggle)
  const preliminaryTeam = instanceOverrides?.team
    ?? instanceConfig?.team
    ?? templateSettings?.team
    ?? genericTypeConfig?.team
    ?? merged.team
    ?? false

  const preliminaryState: Record<string, any> = {
    ...merged,
    team: Boolean(preliminaryTeam),
  }

  const result: Record<string, any> = {}

  // 2. Iterate canonical properties declared in catalogs/widgets.json
  for (const [propName, propDef] of Object.entries(canonicalDefs)) {
    // Check condition (e.g. team == false, team == true)
    if (!evaluateWidgetCondition(propDef.condition, preliminaryState)) {
      continue
    }

    // Look up value across precedence layers (overrides > config > template settings > type config > merged)
    const aliasKey = Object.keys(aliases).find(a => aliases[a] === propName)

    let val = instanceOverrides?.[propName]
      ?? instanceConfig?.[propName]
      ?? templateSettings?.[propName]
      ?? genericTypeConfig?.[propName]
      ?? merged[propName]

    if (val === undefined && aliasKey) {
      val = instanceOverrides?.[aliasKey]
        ?? instanceConfig?.[aliasKey]
        ?? templateSettings?.[aliasKey]
        ?? genericTypeConfig?.[aliasKey]
        ?? merged[aliasKey]
    }

    if (val !== undefined) {
      result[propName] = normalizeConfigValue(propName, val, propDef)
      continue
    }

    // Check localized messages (catalogs/locales.json)
    if (propDef.translatable && propDef.localization_key) {
      const localized = spec.getTranslation(propDef.localization_key, blogLocale)
        || spec.getLocalizedMessage(propDef.localization_key, blogLocale)
        || propDef.default_value
      if (localized !== undefined) {
        result[propName] = localized
        continue
      }
    }

    // Check default values
    if (propDef.default_value !== undefined) {
      result[propName] = propDef.default_value
      continue
    }

    // Handle unconfigured_state semantics
    if (propDef.unconfigured_state === 'empty') {
      if (propDef.type === 'string' || propDef.type === 'url') {
        result[propName] = ''
      }
      else if (propDef.type.startsWith('array')) {
        result[propName] = []
      }
      else if (propDef.type === 'boolean') {
        result[propName] = false
      }
      else if (propDef.type === 'number') {
        result[propName] = 0
      }
    }
    // If unconfigured_state is 'missing' (or undefined without defaults), property remains omitted (undefined)
  }

  // 3. Pass through any non-canonical user properties and template settings
  for (const [k, v] of Object.entries(merged)) {
    if (result[k] === undefined && !canonicalDefs[k]) {
      result[k] = v
    }
  }

  // 4. Bind widget settings according to catalogs/settings.json bound_runtime_data declarations
  const boundResult = bindWidgetSettingsToData(result, type, spec)

  const title = instanceOverrides?.title
    || instanceConfig?.title
    || templateSettings?.title
    || widget.title
    || genericTypeConfig?.title
    || boundResult.title
    || spec.getWidgetDefaultTitle(type, blogLocale)
    || type

  boundResult.title = title

  return boundResult
}
