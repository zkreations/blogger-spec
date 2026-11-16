import type {
  BloggerDiagnosticCode,
  BloggerLocaleRecord,
  BloggerLocalesCatalog,
  BloggerMessageDefinition,
  BloggerMessageDiagnosticKey,
  BloggerMessagesCatalog,
  BloggerPropertyTranslationEntry,
  BloggerSharingPlatformTranslationEntry,
} from '../../types.js'
import type { CatalogStore } from '../store.js'

export interface BuildBlogNavMessageOptions {
  type: 'query' | 'label' | 'archive'
  query?: string
  label?: string
  archiveMessage?: string
  byDate?: boolean
  maxResults?: number | string
  homepageUrl: string
  searchUrl: string
  locale?: string
}

export interface LocaleSettingsResolver {
  getBlogPagination?: () => { searchPageSize?: number } | undefined
}

export class LocaleCatalogService {
  private readonly localeMap = new Map<string, BloggerLocaleRecord>()
  private readonly messageMap = new Map<string, BloggerMessageDefinition>()
  private localesCatalog?: BloggerLocalesCatalog

  constructor(
    private readonly store: CatalogStore,
    private readonly settings?: LocaleSettingsResolver,
  ) {
    this.index()
  }

  private index(): void {
    const messages = (this.store.getCatalog('messages') as BloggerMessagesCatalog)?.messages || {}
    for (const [key, def] of Object.entries(messages)) {
      this.messageMap.set(key, { ...def, type: def.type ?? 'message' })
    }

    try {
      const catalog = this.store.getCatalog('locales') as BloggerLocalesCatalog
      this.localesCatalog = catalog
      if (catalog?.locales) {
        for (const [code, rec] of Object.entries(catalog.locales)) {
          this.localeMap.set(code.toLowerCase(), rec)
          if (rec.underscore_code) {
            this.localeMap.set(rec.underscore_code.toLowerCase(), rec)
          }
          if (rec.bcp47) {
            this.localeMap.set(rec.bcp47.toLowerCase(), rec)
          }
        }
      }
    }
    catch {
      // Store might not contain locales catalog in minimal or custom store instances
    }
  }

  isMessage(key: string): boolean {
    return this.messageMap.has(key)
  }

  getMessage(key: string): BloggerMessageDefinition | undefined {
    return this.messageMap.get(key)
  }

  getAllMessages(): Record<string, BloggerMessageDefinition> {
    const result: Record<string, BloggerMessageDefinition> = {}
    for (const [k, v] of this.messageMap.entries()) {
      result[k] = v
    }
    return result
  }

  getMessageDiagnostic(key: BloggerMessageDiagnosticKey): BloggerDiagnosticCode {
    const messagesData = this.store.getCatalog('messages') as BloggerMessagesCatalog
    const code = messagesData?.domain_metadata?.standard_diagnostics?.[key]
    if (!code) {
      throw new Error(`Message standard diagnostic '${key}' is not defined in messages catalog domain_metadata.standard_diagnostics`)
    }
    return code
  }

  getLocale(code: string): BloggerLocaleRecord | undefined {
    const clean = code.trim().toLowerCase()
    if (!clean) {
      return undefined
    }
    const underscore = clean.replace(/-/g, '_')
    const legacyAliases: Readonly<Record<string, string>> = {
      iw: 'he',
      in: 'id',
      ji: 'yi',
      tl: 'fil',
      nb: 'no',
      nn: 'no',
    }
    return this.localeMap.get(clean)
      ?? this.localeMap.get(underscore)
      ?? (legacyAliases[clean] ? this.localeMap.get(legacyAliases[clean]!) : undefined)
  }

  resolveBcp47Locale(locale = 'en'): string {
    const clean = locale.trim()
    if (!clean) {
      return 'en'
    }
    const record = this.getLocale(clean)
    if (record?.bcp47) {
      return record.bcp47
    }
    const legacyAliases: Readonly<Record<string, string>> = {
      iw: 'he',
      in: 'id',
      ji: 'yi',
      tl: 'fil',
      nb: 'no',
      nn: 'no',
    }
    const parts = clean.split(/[-_]/)
    const mappedBase = legacyAliases[parts[0]?.toLowerCase() || '']
    if (mappedBase) {
      parts[0] = mappedBase
      return parts.join('-')
    }
    return clean.replace(/_/g, '-')
  }

  getAllLocales(): Record<string, BloggerLocaleRecord> {
    return this.localesCatalog?.locales || {}
  }

  getDefaultLocale(): string {
    return this.localesCatalog?.domain_metadata?.default_locale ?? 'en'
  }

  isRTL(locale: string): boolean {
    const rec = this.getLocale(locale)
    return rec ? rec.language_direction === 'rtl' : false
  }

  private lookupLocaleValue<T>(values: Readonly<Record<string, T>> | undefined, locale: string): T | undefined {
    if (!values) {
      return undefined
    }
    const trimmed = locale.trim()
    const clean = trimmed.toLowerCase()
    const underscore = trimmed.replace(/-/g, '_')
    const cleanUnderscore = clean.replace(/-/g, '_')
    const rec = this.getLocale(trimmed)
    return values[trimmed]
      ?? values[underscore]
      ?? values[clean]
      ?? values[cleanUnderscore]
      ?? (rec ? (values[rec.underscore_code] ?? values[rec.language]) : undefined)
  }

  getTranslation(key: string, locale = 'en'): string | undefined {
    if (!this.localesCatalog?.translations) {
      return undefined
    }

    if (key.startsWith('messages.')) {
      const msgKey = key.slice(9)
      return this.getLocalizedMessage(msgKey, locale)
    }

    if (key.startsWith('globals.')) {
      const globKey = key.slice(8)
      if (globKey.startsWith('blog.sharing.platforms.')) {
        const parts = globKey.split('.')
        const field = parts[parts.length - 1]
        const platKey = parts.length === 5 ? parts[3] : 'facebook'
        const platforms = this.localesCatalog.translations.globals['blog.sharing.platforms'] as Record<string, BloggerSharingPlatformTranslationEntry> | undefined
        const platform = platforms?.[platKey]
        if (platform) {
          const entry = field === 'shareMessage' ? platform.share_message : platform.name
          return (this.lookupLocaleValue<string>(entry?.values, locale) ?? entry?.default) ?? undefined
        }
        return undefined
      }
      const entry = this.localesCatalog.translations.globals[globKey] as BloggerPropertyTranslationEntry | undefined
      if (entry) {
        return (this.lookupLocaleValue<string>(entry.values, locale) ?? entry.default) ?? undefined
      }
      return undefined
    }

    if (key.startsWith('widgets.')) {
      const parts = key.slice(8).split('.')
      const widgetType = parts[0]
      const propPath = parts.slice(1).join('.')
      const widgetTranslations = this.localesCatalog.translations.widgets?.[widgetType]
      const entry = widgetTranslations?.[propPath]
      if (entry) {
        return this.lookupLocaleValue<string>(entry.values, locale) ?? entry.default ?? undefined
      }
      return undefined
    }

    return this.getLocalizedMessage(key, locale)
  }

  getLocalizedMessage(messageKey: string, locale = 'en'): string | undefined {
    const entry = this.localesCatalog?.translations?.messages?.[messageKey]
    if (!entry) {
      return undefined
    }
    return this.lookupLocaleValue<string>(entry.values, locale) ?? entry.default
  }

  getAllLocalizedMessages(locale = 'en'): Record<string, string> {
    const result: Record<string, string> = {}
    const messagesMap = this.localesCatalog?.translations?.messages ?? {}
    for (const key of Object.keys(messagesMap)) {
      const val = this.getLocalizedMessage(key, locale)
      if (val !== undefined) {
        result[key] = val
      }
    }
    return result
  }

  getWidgetNavMessage(widgetType = 'Blog', locale = 'en'): string {
    const entry = this.localesCatalog?.translations?.widgets?.[widgetType]?.navMessage
    return this.lookupLocaleValue<string>(entry?.values, locale)
      ?? entry?.default
      ?? 'Sorry, the page you were looking for in this blog does not exist.'
  }

  getWidgetDefaultTitle(widgetType: string, locale = 'en'): string {
    const entry = this.localesCatalog?.translations?.widgets?.[widgetType]?.defaultTitle
      ?? this.localesCatalog?.translations?.widgets?.[widgetType]?.name
    return this.lookupLocaleValue<string>(entry?.values, locale) ?? entry?.default ?? widgetType
  }

  stripDefaultWidgetTypeSuffix(title: string, widgetType: string): string {
    if (!title || typeof title !== 'string') {
      return title
    }
    const entry = this.localesCatalog?.translations?.widgets?.[widgetType]?.defaultTitle
      ?? this.localesCatalog?.translations?.widgets?.[widgetType]?.name
    const suffixes = new Set<string>()
    if (entry?.default) {
      suffixes.add(entry.default)
    }
    if (entry?.values) {
      for (const val of Object.values(entry.values)) {
        if (typeof val === 'string' && val.trim()) {
          suffixes.add(val.trim())
        }
      }
    }
    if (widgetType === 'Header') {
      suffixes.add('Header')
      suffixes.add('Cabecera')
      suffixes.add('En-tête')
      suffixes.add('Kopfzeile')
      suffixes.add('Cabeçalho')
    }
    else if (suffixes.size === 0) {
      suffixes.add(widgetType)
    }
    const pattern = Array.from(suffixes)
      .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|')
    const regex = new RegExp(`\\s*\\((?:${pattern})\\)$`, 'i')
    return title.replace(regex, '').trim()
  }

  buildBlogNavMessage(options: BuildBlogNavMessageOptions, locale?: string): string {
    const loc = locale ?? options.locale ?? this.getDefaultLocale()
    const isEs = loc.toLowerCase().startsWith('es')
    const homepage = options.homepageUrl.endsWith('/') ? options.homepageUrl : `${options.homepageUrl}/`
    const showAllText = isEs ? 'Mostrar todas las entradas' : 'Show all posts'
    const showAllLink = `<a href="${homepage}">${showAllText}</a>`
    const defaultPageSize = this.settings?.getBlogPagination?.()?.searchPageSize ?? 20

    if (options.type === 'query' && options.query) {
      const qEnc = encodeURIComponent(options.query)
      const maxResults = options.maxResults || defaultPageSize
      const byDate = Boolean(options.byDate)
      const searchBase = options.searchUrl

      if (!byDate) {
        const text = isEs
          ? `Mostrando entradas ordenadas por relevancia para la consulta <b>${options.query}</b>. `
          : `Showing posts sorted by relevance for query <b>${options.query}</b>. `
        const sortUrl = `${searchBase}?q=${qEnc}&amp;max-results=${maxResults}&amp;by-date=true`
        const sortText = isEs ? 'Ordenar por fecha' : 'Sort by date'
        const sortLink = `<a href="${sortUrl}">${sortText}</a>`
        return `${text}${sortLink} ${showAllLink}`
      }
      else {
        const text = isEs
          ? `Mostrando entradas ordenadas por fecha para la consulta <b>${options.query}</b>. `
          : `Showing posts sorted by date for query <b>${options.query}</b>. `
        const sortUrl = `${searchBase}?q=${qEnc}&amp;max-results=${maxResults}`
        const sortText = isEs ? 'Ordenar por relevancia' : 'Sort by relevance'
        const sortLink = `<a href="${sortUrl}">${sortText}</a>`
        return `${text}${sortLink} ${showAllLink}`
      }
    }

    if (options.type === 'label' && options.label) {
      const text = isEs
        ? `Mostrando las entradas con la etiqueta <b>${options.label}</b>. `
        : `Showing posts with label <b>${options.label}</b>. `
      return `${text}${showAllLink}`
    }

    if (options.type === 'archive' && options.archiveMessage) {
      return `${options.archiveMessage}. ${showAllLink}`
    }

    return ''
  }

  getSearchQueryResultsMessage(query: string, locale = 'en', isHtml = false): string {
    const isEs = locale.toLowerCase().startsWith('es')
    const q = isHtml ? `<b>${query}</b>` : query
    return isEs
      ? `Mostrando entradas que coinciden con la búsqueda de ${q}`
      : `Showing posts matching the search for ${q}`
  }

  getFormattedGlobalMessage(key: string, locale = 'en', params: Record<string, string> = {}): string {
    const entry = this.localesCatalog?.translations?.globals?.[key] as BloggerPropertyTranslationEntry | undefined
    let msg: string = this.lookupLocaleValue<string>(entry?.values, locale) ?? entry?.default ?? ''
    for (const [k, v] of Object.entries(params)) {
      msg = msg.split(k).join(v)
    }
    return msg
  }

  getArchiveRangeMessage(year: number, month?: number, locale = 'en'): string {
    const entry = this.localesCatalog?.translations?.globals?.['view.archive.rangeMessage'] as BloggerPropertyTranslationEntry | undefined
    const template: string = this.lookupLocaleValue<string>(entry?.values, locale)
      ?? entry?.default
      ?? 'Showing posts from August, 2026'

    let periodText = String(year)
    if (month && month >= 1 && month <= 12) {
      try {
        const intlLocale = this.resolveBcp47Locale(locale)
        const date = new Date(Date.UTC(year, month - 1, 1))
        const monthName = new Intl.DateTimeFormat(intlLocale, { month: 'long', timeZone: 'UTC' }).format(date)
        periodText = `${monthName}, ${year}`
      }
      catch {
        periodText = `${month}/${year}`
      }
    }
    return template.replace(/[\p{L}\p{M}&#;\d]+(?:\s*,\s*|\s+)\p{N}{4}/u, periodText)
  }

  resolvePlural(messageKey: string, count: number, locale = 'en'): string | undefined {
    const entry = this.localesCatalog?.translations?.messages?.[messageKey]
    if (!entry?.plural_forms) {
      return this.getLocalizedMessage(messageKey, locale)
    }
    const localeForms = this.lookupLocaleValue(entry.plural_forms, locale) ?? entry.plural_forms.en
    if (!localeForms) {
      return entry.default
    }
    const strCount = String(count)
    if (localeForms[strCount]) {
      return localeForms[strCount]
    }
    try {
      const pr = new Intl.PluralRules(this.resolveBcp47Locale(locale))
      const category = pr.select(count)
      let rep = '5'
      if (category === 'zero') {
        rep = '0'
      }
      else if (category === 'one') {
        rep = '1'
      }
      else if (category === 'two') {
        rep = '2'
      }
      else if (category === 'few') {
        rep = '2'
      }
      else if (category === 'many') {
        rep = '5'
      }
      else {
        rep = '100'
      }

      const templateStr = localeForms[rep] ?? localeForms['5'] ?? localeForms['1']
      if (templateStr) {
        return templateStr.replace(new RegExp(`\\b${rep}\\b`), strCount)
      }
    }
    catch {}
    return localeForms['5']?.replace(/\b5\b/, strCount) ?? `${count} ${entry.default}`
  }

  formatParameterizedMessage(
    key: string,
    params: Array<{ name?: string, value: any }>,
    locale = 'en',
  ): string {
    const cleanKey = key.replace(/^messages\./, '')
    const msgMeta = this.messageMap.get(cleanKey)

    if (cleanKey === 'numberOfComments' || msgMeta?.pattern?.includes('plural')) {
      const numParam = params.find(p => p.name === 'numComments') ?? params[0]
      const num = Number(numParam?.value ?? 0) || 0
      return this.resolvePlural(cleanKey, num, locale) ?? `${num} comments`
    }

    let template = this.getLocalizedMessage(cleanKey, locale)
      ?? msgMeta?.pattern
      ?? msgMeta?.default_value
      ?? ''

    for (let i = 0; i < params.length; i++) {
      const p = params[i]
      const valStr = p?.value !== undefined && p?.value !== null ? String(p.value) : ''
      const posToken1 = `%${i + 1}`
      const posToken2 = `__ARG${i + 1}__`
      template = template.split(posToken1).join(valStr).split(posToken2).join(valStr)
      if (p?.name) {
        template = template.split(`%${p.name}`).join(valStr).split(`{${p.name}}`).join(valStr)
      }
    }

    return template
  }
}
