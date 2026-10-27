import type { SpecCatalog } from './catalogs/index.js'
import type { BloggerScopeSymbol, ScopeEnvironment } from './scope.js'
import type { BloggerMemberInfo, BloggerViewId } from './types.js'
import { getSpecCatalog } from './catalogs/index.js'
import { getTypeModifiers, resolveModifierReturnType } from './type-system.js'

export interface BloggerSkinVariableSymbol {
  readonly type: string
  readonly name?: string
  readonly description?: string
  readonly default?: string
  readonly value?: string
}

export interface ResolveDataPathContext {
  widgetType?: string
  catalog?: SpecCatalog
  variables?: Record<string, string | BloggerScopeSymbol>
  scope?: ScopeEnvironment
  skinVariables?: Record<string, string | BloggerSkinVariableSymbol>
  locale?: string
}

export function toSkinVarIdentifier(name: string): string {
  return name.replace(/\./g, '_')
}

export interface BloggerResolvedProperty {
  readonly name: string
  readonly path: string
  readonly type: string
  readonly definition?: any
  readonly sourceCatalog: 'globals' | 'widgets' | 'types' | 'messages' | 'variables' | 'settings'
  readonly isDeprecated?: boolean
  readonly isCollection?: boolean
  readonly itemType?: string
  readonly description?: string
  readonly availableInViews?: readonly BloggerViewId[]
  readonly unconfiguredState?: 'empty' | 'missing'
  readonly condition?: string
  readonly runtimeState?: 'active' | 'empty' | 'missing'
  readonly sourceConstraint?: string
  readonly translatable?: boolean
  readonly localizationKey?: string
  readonly defaultValue?: string
  readonly localizedValue?: string
}

function parsePathSegments(path: string | readonly string[]): string[] {
  if (typeof path !== 'string') {
    const result: string[] = []
    for (const item of path) {
      const parts = item
        .replace(/\[['"]?([^'"\]]+)['"]?\]/g, '.$1')
        .split('.')
        .map((s: string) => s.trim())
        .filter(Boolean)
      result.push(...parts)
    }
    if (result.length > 1 && result[0] === 'data') {
      result.splice(0, 2, `data:${result[1]}`)
    }
    return result
  }

  const raw = path.trim()
  const normalized = raw.replace(/\[['"]?([^'"\]]+)['"]?\]/g, '.$1')
  const segments = normalized.split('.').map((s: string) => s.trim()).filter(Boolean)
  if (segments.length > 1 && segments[0] === 'data') {
    segments.splice(0, 2, `data:${segments[1]}`)
  }
  return segments
}

export function resolveDataPath(
  path: string | readonly string[],
  context?: ResolveDataPathContext,
): BloggerResolvedProperty | undefined {
  const segments = parsePathSegments(path)
  if (segments.length === 0) {
    return undefined
  }

  const catalog = context?.catalog ?? getSpecCatalog()
  const widgetType = context?.widgetType ?? context?.scope?.getActiveWidgetType() ?? 'Blog'

  const variables: Record<string, string | BloggerScopeSymbol> = {
    ...(context?.scope ? Object.fromEntries(context.scope.getAllVisibleSymbols()) : {}),
    ...(context?.variables ?? {}),
  }

  const first = segments[0]!
  let currentType = 'unknown'
  let currentDef: any
  let sourceCatalog: BloggerResolvedProperty['sourceCatalog'] = 'globals'
  let isCollection = false
  let itemType: string | undefined
  let isDeprecated = false

  const varSym = variables[first]
    ?? variables[`data:${first}`]
    ?? (first.startsWith('data:') ? variables[first.slice(5)] : undefined)

  if (varSym) {
    const rawType = typeof varSym === 'string' ? varSym : (varSym.type ?? 'unknown')
    currentType = rawType
    const strippedFirst = first.startsWith('data:') ? first.slice(5) : first

    if (typeof varSym === 'object' && varSym.scopeType === 'widget') {
      sourceCatalog = 'widgets'
      currentDef = strippedFirst === 'widget'
        ? catalog.getCommonWidget() ?? varSym
        : catalog.getWidget(widgetType)?.canonical?.[strippedFirst] ?? varSym
    }
    else if (typeof varSym === 'object' && varSym.scopeType === 'global') {
      sourceCatalog = 'globals'
      currentDef = catalog.getGlobal(`data:${strippedFirst}`) ?? varSym
    }
    else {
      sourceCatalog = 'variables'
      currentDef = typeof varSym === 'object' ? varSym : { type: rawType }
    }

    isCollection = currentType.startsWith('array') || Boolean(currentDef?.item_properties)
    if (currentDef?.item_properties || (currentType.startsWith('array[') && currentType.endsWith(']'))) {
      itemType = currentDef?.item_type ?? (currentType.startsWith('array[') ? currentType.slice(6, -1) : undefined)
    }
  }
  else {
    const globalKey = first.startsWith('data:') ? first : `data:${first}`
    const globalDef = catalog.getGlobal(globalKey)
    const widget = catalog.getWidget(widgetType)
    const widgetPropKey = first.startsWith('data:') ? first.slice(5) : first
    const widgetProp = widget?.canonical?.[widgetPropKey]
    const widgetDep = widget?.deprecated?.[widgetPropKey]

    if (!first.startsWith('data:') && widgetProp) {
      sourceCatalog = 'widgets'
      currentDef = widgetProp
      currentType = widgetProp.type
      isCollection = widgetProp.type.startsWith('array') || Boolean(widgetProp.item_properties)
      itemType = widgetProp.item_type ?? (widgetProp.type.startsWith('array[') ? widgetProp.type.slice(6, -1) : undefined)
      isDeprecated = false
    }
    else if (globalDef) {
      sourceCatalog = 'globals'
      currentDef = globalDef
      if (globalDef.cardinality === 'collection') {
        currentType = globalDef.item_type ? `array[${globalDef.item_type}]` : 'array'
        isCollection = true
        itemType = globalDef.item_type
      }
      else {
        currentType = 'object'
        isCollection = false
      }
    }
    else if (widgetProp) {
      sourceCatalog = 'widgets'
      currentDef = widgetProp
      currentType = widgetProp.type
      isCollection = widgetProp.type.startsWith('array') || Boolean(widgetProp.item_properties)
      itemType = widgetProp.item_type ?? (widgetProp.type.startsWith('array[') ? widgetProp.type.slice(6, -1) : undefined)
      isDeprecated = false
    }
    else if (widgetDep) {
      sourceCatalog = 'widgets'
      currentDef = widgetDep
      currentType = widgetDep.type ?? 'unknown'
      isDeprecated = true
    }
    else if (first === 'messages' || first === 'data:messages') {
      sourceCatalog = 'messages'
      currentType = 'object'
      currentDef = { type: 'object', description: 'Universal localized UI messages dictionary.' }
    }
    else if (first === 'data:widget' || first === 'widget') {
      const commonWidget = catalog.getCommonWidget()
      if (commonWidget) {
        sourceCatalog = 'widgets'
        currentDef = commonWidget
        currentType = 'object'
        isCollection = false
      }
    }
    else {
      return undefined
    }
  }

  let availableInViews: readonly BloggerViewId[] | undefined = currentDef?.available_in_views
  let unconfiguredState: 'empty' | 'missing' | undefined = currentDef?.unconfigured_state
  let condition: string | undefined = currentDef?.condition
  let runtimeState: 'active' | 'empty' | 'missing' | undefined = currentDef?.runtime_state
  let sourceConstraint: string | undefined = currentDef?.source_constraint

  const syncMetadata = (def: any) => {
    if (!def || typeof def !== 'object') {
      return
    }
    if (def.available_in_views !== undefined) {
      availableInViews = def.available_in_views
    }
    if (def.unconfigured_state !== undefined) {
      unconfiguredState = def.unconfigured_state
    }
    if (def.condition !== undefined) {
      condition = def.condition
    }
    if (def.runtime_state !== undefined) {
      runtimeState = def.runtime_state
    }
    if (def.source_constraint !== undefined) {
      sourceConstraint = def.source_constraint
    }
  }

  const buildResolvedProperty = (name: string): BloggerResolvedProperty => {
    const translatable = Boolean(currentDef?.translatable)
    const localizationKey = currentDef?.localization_key
    const defaultValue = currentDef?.default_value

    let localizedValue: string | undefined
    if (context?.locale) {
      if (sourceCatalog === 'messages') {
        localizedValue = catalog.getLocalizedMessage(name, context.locale)
      }
      else if (localizationKey) {
        localizedValue = catalog.getTranslation(localizationKey, context.locale)
      }
      else {
        const fullPath = segments.join('.')
        const locRec = catalog.getLocale(context.locale)
        if (locRec) {
          if (fullPath === 'data:blog.locale' || fullPath === 'blog.locale') {
            localizedValue = locRec.bcp47
          }
          else if (fullPath.endsWith('.locale.name')) {
            localizedValue = locRec.name
          }
          else if (fullPath.endsWith('.locale.language')) {
            localizedValue = locRec.language
          }
          else if (fullPath.endsWith('.locale.country')) {
            localizedValue = locRec.country
          }
          else if (fullPath.endsWith('.locale.variant')) {
            localizedValue = locRec.variant
          }
          else if (fullPath.endsWith('.locale.script')) {
            localizedValue = locRec.script
          }
          else if (fullPath.endsWith('.locale.languageDirection') || fullPath === 'data:blog.languageDirection') {
            localizedValue = locRec.language_direction
          }
          else if (fullPath.endsWith('.locale.languageAlignment')) {
            localizedValue = locRec.language_alignment
          }
          else if (fullPath === 'data:blog.localeUnderscoreDelimited') {
            localizedValue = locRec.underscore_code
          }
        }
      }
    }

    return {
      name,
      path: typeof path === 'string' ? path : segments.join('.'),
      type: currentType,
      definition: currentDef,
      sourceCatalog,
      isDeprecated,
      isCollection,
      itemType,
      description: currentDef?.description ?? currentDef?.reason,
      availableInViews,
      unconfiguredState,
      condition,
      runtimeState,
      sourceConstraint,
      translatable: translatable || undefined,
      localizationKey,
      defaultValue,
      localizedValue,
    }
  }

  if (segments.length === 1) {
    const strippedName = first.startsWith('data:') ? first.slice(5) : first
    return buildResolvedProperty(strippedName)
  }

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i]!

    if (sourceCatalog === 'messages' || first === 'messages' || first === 'data:messages') {
      const strippedFirst = first.startsWith('data:') ? first.slice(5) : first
      const widget = catalog.getWidget(widgetType)
      const widgetSubProp = currentDef?.properties?.[seg] ?? widget?.canonical?.[strippedFirst]?.properties?.[seg]

      if (widgetSubProp) {
        currentType = widgetSubProp.type ?? 'string'
        currentDef = widgetSubProp
        syncMetadata(currentDef)
        sourceCatalog = 'widgets'
        isCollection = widgetSubProp.type?.startsWith('array') || Boolean(widgetSubProp.item_properties)
        itemType = widgetSubProp.item_type ?? (widgetSubProp.type?.startsWith('array[') ? widgetSubProp.type.slice(6, -1) : undefined)
        isDeprecated = Boolean(widgetSubProp.deprecated)
        continue
      }

      const msgDef = catalog.getMessage(seg)
      currentType = 'string'
      currentDef = msgDef ?? { type: 'string', description: `Localized message for '${seg}'` }
      syncMetadata(currentDef)
      sourceCatalog = 'messages'
      isCollection = false
      itemType = undefined
      isDeprecated = false
      continue
    }

    if (currentType.startsWith('array') || isCollection) {
      if (/^\d+$/.test(seg) || seg === 'first' || seg === 'last') {
        currentType = itemType ?? (currentType.startsWith('array[') && currentType.endsWith(']') ? currentType.slice(6, -1) : 'object')
        isCollection = currentType.startsWith('array')
        itemType = currentType.startsWith('array[') && currentType.endsWith(']') ? currentType.slice(6, -1) : undefined
        if (currentDef?.item_properties) {
          currentDef = { type: currentType, properties: currentDef.item_properties }
        }
        continue
      }

      if (seg === 'size' || seg === 'length') {
        currentType = 'number'
        currentDef = catalog.getType('array')?.modifiers?.[seg]
        syncMetadata(currentDef)
        sourceCatalog = 'types'
        isCollection = false
        itemType = undefined
        continue
      }

      if (seg === 'empty' || seg === 'notEmpty' || seg === 'any') {
        currentType = 'boolean'
        currentDef = catalog.getType('array')?.modifiers?.[seg]
        syncMetadata(currentDef)
        sourceCatalog = 'types'
        isCollection = false
        itemType = undefined
        continue
      }
    }

    if (first === 'data:widgets' || first === 'widgets') {
      const allWidgets = catalog.getAllWidgets()
      if (allWidgets[seg as keyof typeof allWidgets]) {
        currentType = 'array[object]'
        isCollection = true
        itemType = 'object'
        currentDef = catalog.getGlobal('data:widgets')?.canonical?.[seg]
        syncMetadata(currentDef)
        continue
      }

      const matchingType = Object.keys(allWidgets).find(wt => seg.startsWith(wt))
      if (matchingType) {
        currentType = 'object'
        isCollection = false
        currentDef = catalog.getGlobal('data:widgets')?.canonical?.[matchingType] ?? catalog.getWidget(matchingType)
        syncMetadata(currentDef)
        continue
      }
    }

    if ((first === 'data:skin' || first === 'skin') && segments[1] === 'vars' && i === 2) {
      let skinVar = context?.skinVariables?.[seg]
      if (!skinVar && context?.skinVariables) {
        for (const [k, v] of Object.entries(context.skinVariables)) {
          if (toSkinVarIdentifier(k) === seg || (typeof v === 'object' && v.name && toSkinVarIdentifier(v.name) === seg)) {
            skinVar = v
            break
          }
        }
      }

      if (skinVar) {
        const rawType = typeof skinVar === 'string' ? skinVar : (skinVar.type ?? 'skin_variable')
        const skinType = rawType.startsWith('skin:') ? rawType : (catalog.getType(`skin:${rawType}`) ? `skin:${rawType}` : rawType)
        currentType = skinType
        currentDef = typeof skinVar === 'object' ? skinVar : catalog.getType(skinType) ?? { type: skinType }
        syncMetadata(currentDef)
        sourceCatalog = 'variables'
        isCollection = false
        itemType = undefined
        isDeprecated = false
        continue
      }

      const pattern = catalog.getGlobal('data:skin')?.patterns?.[0]
      currentType = pattern?.type ?? 'skin_variable'
      currentDef = pattern ?? { type: currentType, description: 'Theme Designer skin variable.' }
      syncMetadata(currentDef)
      sourceCatalog = 'globals'
      isCollection = false
      itemType = undefined
      isDeprecated = false
      continue
    }

    const remaining = segments.slice(i).join('.')
    if (currentDef?.deprecated?.[remaining]) {
      const dep = currentDef.deprecated[remaining]
      currentType = dep.type ?? 'unknown'
      currentDef = dep
      syncMetadata(currentDef)
      isDeprecated = true
      break
    }

    if (currentDef?.properties?.[seg]) {
      const prop = currentDef.properties[seg]
      currentType = prop.type
      currentDef = prop
      syncMetadata(currentDef)
      isCollection = prop.type?.startsWith('array') || Boolean(prop.item_properties)
      itemType = prop.item_type ?? (prop.type?.startsWith('array[') ? prop.type.slice(6, -1) : undefined)
      isDeprecated = Boolean(prop.deprecated)
      continue
    }

    if (currentDef?.item_properties?.[seg]) {
      const prop = currentDef.item_properties[seg]
      currentType = prop.type
      currentDef = prop
      syncMetadata(currentDef)
      isCollection = prop.type?.startsWith('array') || Boolean(prop.item_properties)
      itemType = prop.item_type ?? (prop.type?.startsWith('array[') ? prop.type.slice(6, -1) : undefined)
      isDeprecated = Boolean(prop.deprecated)
      continue
    }

    if (currentDef?.canonical?.[seg]) {
      const prop = currentDef.canonical[seg]
      currentType = prop.type
      currentDef = prop
      syncMetadata(currentDef)
      isCollection = prop.type?.startsWith('array') || Boolean(prop.item_properties)
      itemType = prop.item_type ?? (prop.type?.startsWith('array[') ? prop.type.slice(6, -1) : undefined)
      isDeprecated = Boolean(prop.deprecated)
      continue
    }

    if (currentDef?.deprecated?.[seg]) {
      const dep = currentDef.deprecated[seg]
      currentType = dep.type ?? 'unknown'
      currentDef = dep
      syncMetadata(currentDef)
      isDeprecated = true
      continue
    }

    const modifiers = getTypeModifiers(currentType, catalog)
    if (modifiers[seg]) {
      const mod = modifiers[seg]!
      const outType = resolveModifierReturnType(currentType, seg, catalog)
      currentType = outType
      currentDef = mod
      syncMetadata(currentDef)
      sourceCatalog = 'types'
      isCollection = outType.startsWith('array')
      itemType = outType.startsWith('array[') && outType.endsWith(']') ? outType.slice(6, -1) : undefined
      isDeprecated = false
      continue
    }

    const widget = catalog.getWidget(widgetType)
    if (currentType === 'author' || first === 'author' || currentDef?.name === 'author') {
      const authorProp = widget?.canonical?.posts?.item_properties?.author?.properties?.[seg]
      if (authorProp) {
        currentType = authorProp.type
        currentDef = authorProp
        syncMetadata(currentDef)
        sourceCatalog = 'widgets'
        isCollection = authorProp.type?.startsWith('array') || Boolean(authorProp.item_properties)
        itemType = authorProp.item_type
        continue
      }
    }

    if (currentType === 'post' || first === 'post' || currentDef?.name === 'post') {
      const postProp = widget?.canonical?.posts?.item_properties?.[seg]
      if (postProp) {
        currentType = postProp.type
        currentDef = postProp
        syncMetadata(currentDef)
        sourceCatalog = 'widgets'
        isCollection = postProp.type?.startsWith('array') || Boolean(postProp.item_properties)
        itemType = postProp.item_type
        continue
      }
    }

    if (currentType === 'object' && widget?.canonical?.[seg]) {
      const prop = widget.canonical[seg]!
      currentType = prop.type
      currentDef = prop
      syncMetadata(currentDef)
      sourceCatalog = 'widgets'
      isCollection = prop.type?.startsWith('array') || Boolean(prop.item_properties)
      itemType = prop.item_type
      continue
    }

    return undefined
  }

  return buildResolvedProperty(segments[segments.length - 1]!)
}

export function getTypeMembers(
  typeName: string,
  catalog: SpecCatalog = getSpecCatalog(),
): BloggerMemberInfo[] {
  const result: BloggerMemberInfo[] = []
  const seen = new Set<string>()

  let resolvedName = typeName
  if (typeName.startsWith('array[') && !catalog.getType(typeName)?.modifiers) {
    resolvedName = 'array'
  }

  const def = catalog.getType(resolvedName)

  const props = (def as any)?.properties
  if (props) {
    for (const [propName, propDef] of Object.entries(props)) {
      if (!seen.has(propName)) {
        seen.add(propName)
        const p = propDef as any
        result.push({
          name: propName,
          type: p.type ?? 'string',
          sourceCatalog: 'types',
          isModifier: false,
          isCollection: p.type?.startsWith('array') || Boolean(p.item_properties),
          itemType: p.item_type,
          isDeprecated: Boolean(p.deprecated),
          description: p.description,
          availableInViews: p.available_in_views,
          unconfiguredState: p.unconfigured_state,
          condition: p.condition,
        })
      }
    }
  }

  const modifiers = getTypeModifiers(resolvedName, catalog)
  for (const [modName, modDef] of Object.entries(modifiers)) {
    if (!seen.has(modName)) {
      seen.add(modName)
      const outType = resolveModifierReturnType(resolvedName, modName, catalog)
      result.push({
        name: modName,
        type: outType,
        sourceCatalog: 'types',
        isModifier: true,
        isCollection: outType.startsWith('array'),
        itemType: outType.startsWith('array[') && outType.endsWith(']') ? outType.slice(6, -1) : undefined,
        description: modDef.description,
        sourceConstraint: modDef.source_constraint,
      })
    }
  }

  return result
}

export function getDataPathMembers(
  path: string | readonly string[],
  context?: ResolveDataPathContext,
): BloggerMemberInfo[] {
  const catalog = context?.catalog ?? getSpecCatalog()
  const widgetType = context?.widgetType ?? context?.scope?.getActiveWidgetType() ?? 'Blog'
  const segments = parsePathSegments(path)

  if (segments.length === 0 || (segments.length === 1 && segments[0] === 'data')) {
    const result: BloggerMemberInfo[] = []
    const seen = new Set<string>()

    const visibleSymbols = context?.scope ? context.scope.getAllVisibleSymbols() : new Map<string, BloggerScopeSymbol>()
    for (const [rawName, sym] of visibleSymbols.entries()) {
      const stripped = rawName.startsWith('data:') ? rawName.slice(5) : rawName
      if (!seen.has(stripped)) {
        seen.add(stripped)
        result.push({
          name: stripped,
          type: sym.type ?? 'unknown',
          sourceCatalog: 'variables',
          description: (sym.metadata as any)?.description,
        })
      }
    }

    const widget = catalog.getWidget(widgetType)
    if (widget?.canonical) {
      for (const [propName, propDef] of Object.entries(widget.canonical)) {
        if (!seen.has(propName)) {
          seen.add(propName)
          result.push({
            name: propName,
            type: propDef.type,
            sourceCatalog: 'widgets',
            isCollection: propDef.type.startsWith('array') || Boolean(propDef.item_properties),
            itemType: propDef.item_type,
            description: propDef.description,
            availableInViews: propDef.available_in_views,
            unconfiguredState: propDef.unconfigured_state,
            condition: propDef.condition,
          })
        }
      }
    }

    const globals = catalog.getAllGlobals()
    for (const [globalKey, globalDef] of Object.entries(globals)) {
      const stripped = globalKey.startsWith('data:') ? globalKey.slice(5) : globalKey
      if (!seen.has(stripped)) {
        seen.add(stripped)
        const isCollection = globalDef.cardinality === 'collection'
        result.push({
          name: stripped,
          type: isCollection ? (globalDef.item_type ? `array[${globalDef.item_type}]` : 'array') : 'object',
          sourceCatalog: 'globals',
          isCollection,
          itemType: globalDef.item_type,
          description: globalDef.description,
        })
      }
    }

    if (!seen.has('messages')) {
      seen.add('messages')
      result.push({
        name: 'messages',
        type: 'object',
        sourceCatalog: 'messages',
        description: 'Universal localized UI messages dictionary.',
      })
    }

    return result
  }

  const first = segments[0]!
  if ((first === 'messages' || first === 'data:messages') && segments.length === 1) {
    const result: BloggerMemberInfo[] = []
    const allMessages = catalog.getAllMessages()
    for (const [key, msgDef] of Object.entries(allMessages)) {
      result.push({
        name: key,
        type: 'string',
        sourceCatalog: 'messages',
        description: msgDef.description,
      })
    }
    return result
  }

  if ((first === 'data:skin' || first === 'skin') && segments.length === 2 && segments[1] === 'vars') {
    const result: BloggerMemberInfo[] = []
    const seen = new Set<string>()
    if (context?.skinVariables) {
      for (const [k, v] of Object.entries(context.skinVariables)) {
        const id = toSkinVarIdentifier(typeof v === 'object' && v.name ? v.name : k)
        if (!seen.has(id)) {
          seen.add(id)
          const rawType = typeof v === 'string' ? v : (v.type ?? 'skin_variable')
          result.push({
            name: id,
            type: rawType,
            sourceCatalog: 'variables',
            description: typeof v === 'object' ? v.description : undefined,
          })
        }
      }
    }
    return result
  }

  const resolved = resolveDataPath(segments, context)
  if (!resolved) {
    return []
  }

  const result: BloggerMemberInfo[] = []
  const seen = new Set<string>()
  const def = resolved.definition

  const propsObj = def?.properties ?? (def?.canonical && resolved.sourceCatalog === 'globals' ? def.canonical : undefined)
  if (propsObj && typeof propsObj === 'object') {
    for (const [propName, propDef] of Object.entries(propsObj)) {
      if (!seen.has(propName)) {
        seen.add(propName)
        const p = propDef as any
        result.push({
          name: propName,
          type: p.type ?? 'string',
          sourceCatalog: resolved.sourceCatalog,
          isCollection: p.type?.startsWith('array') || Boolean(p.item_properties),
          itemType: p.item_type,
          isDeprecated: Boolean(p.deprecated),
          description: p.description,
          availableInViews: p.available_in_views ?? resolved.availableInViews,
          unconfiguredState: p.unconfigured_state ?? resolved.unconfiguredState,
          condition: p.condition ?? resolved.condition,
        })
      }
    }
  }

  if (resolved.isCollection || resolved.type.startsWith('array')) {
    const arrayModifiers = getTypeModifiers('array', catalog)
    for (const [modName, modDef] of Object.entries(arrayModifiers)) {
      if (!seen.has(modName)) {
        seen.add(modName)
        const outType = resolveModifierReturnType('array', modName, catalog)
        result.push({
          name: modName,
          type: outType,
          sourceCatalog: 'types',
          isModifier: true,
          isCollection: outType.startsWith('array'),
          itemType: outType.startsWith('array[') && outType.endsWith(']') ? outType.slice(6, -1) : undefined,
          description: modDef.description,
          sourceConstraint: modDef.source_constraint,
        })
      }
    }
  }

  if (resolved.type && resolved.type !== 'unknown') {
    const typeModifiers = getTypeModifiers(resolved.type, catalog)
    for (const [modName, modDef] of Object.entries(typeModifiers)) {
      if (!seen.has(modName)) {
        seen.add(modName)
        const outType = resolveModifierReturnType(resolved.type, modName, catalog)
        result.push({
          name: modName,
          type: outType,
          sourceCatalog: 'types',
          isModifier: true,
          isCollection: outType.startsWith('array'),
          itemType: outType.startsWith('array[') && outType.endsWith(']') ? outType.slice(6, -1) : undefined,
          description: modDef.description,
          sourceConstraint: modDef.source_constraint,
        })
      }
    }
  }

  if (def?.deprecated && typeof def.deprecated === 'object') {
    for (const [depName, depDef] of Object.entries(def.deprecated)) {
      if (!seen.has(depName)) {
        seen.add(depName)
        const d = depDef as any
        result.push({
          name: depName,
          type: d.type ?? 'unknown',
          sourceCatalog: resolved.sourceCatalog,
          isDeprecated: true,
          description: d.reason,
          deprecationReason: d.reason,
          replacement: d.replacement ?? undefined,
          runtimeState: d.runtime_state,
        })
      }
    }
  }

  const widget = catalog.getWidget(widgetType)
  if (resolved.type === 'post' || resolved.name === 'post') {
    const postItemProps = widget?.canonical?.posts?.item_properties
    if (postItemProps) {
      for (const [pName, pDef] of Object.entries(postItemProps)) {
        if (!seen.has(pName)) {
          seen.add(pName)
          result.push({
            name: pName,
            type: pDef.type,
            sourceCatalog: 'widgets',
            isCollection: pDef.type.startsWith('array') || Boolean(pDef.item_properties),
            itemType: pDef.item_type,
            description: pDef.description,
            availableInViews: pDef.available_in_views,
            unconfiguredState: pDef.unconfigured_state,
            condition: pDef.condition,
          })
        }
      }
    }
  }
  else if (resolved.type === 'author' || resolved.name === 'author') {
    const authorProps = widget?.canonical?.posts?.item_properties?.author?.properties
    if (authorProps) {
      for (const [aName, aDef] of Object.entries(authorProps)) {
        if (!seen.has(aName)) {
          seen.add(aName)
          result.push({
            name: aName,
            type: aDef.type,
            sourceCatalog: 'widgets',
            isCollection: aDef.type.startsWith('array') || Boolean(aDef.item_properties),
            itemType: aDef.item_type,
            description: aDef.description,
            availableInViews: aDef.available_in_views,
            unconfiguredState: aDef.unconfigured_state,
            condition: aDef.condition,
          })
        }
      }
    }
  }

  return result
}
