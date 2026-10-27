import { describe, expect, it } from 'vitest'
import {
  getAllLocales,
  getLocale,
  getLocalizedMessage,
  getSpecCatalog,
  getTranslation,
  isRTL,
  resolveDataPath,
  resolvePlural,
} from '../src/index.js'

describe('blogger locales SSOT & runtime resolution suite', () => {
  const catalog = getSpecCatalog()

  describe('specCatalog locale metadata methods', () => {
    it('indexes all 61 canonical Blogger locales', () => {
      const locales = getAllLocales()
      const codes = Object.keys(locales)
      expect(codes.length).toBe(61)
      expect(codes).toContain('en')
      expect(codes).toContain('es')
      expect(codes).toContain('es_419')
      expect(codes).toContain('ar')
      expect(codes).toContain('ja')
      expect(codes).toContain('ru')
      expect(codes).toContain('zh_CN')
      expect(codes).toContain('zh_TW')
    })

    it('retrieves locale metadata by BCP 47 code case-insensitively and by legacy underscore code', () => {
      const es = getLocale('es')
      expect(es).toBeDefined()
      expect(es?.bcp47).toBe('es')
      expect(es?.language).toBe('es')
      expect(es?.language_direction).toBe('ltr')
      expect(es?.language_alignment).toBe('left')

      const zhCN = getLocale('zh-CN')
      expect(zhCN).toBeDefined()
      expect(zhCN?.bcp47).toBe('zh-CN')
      expect(zhCN?.underscore_code).toBe('zh_cn')

      const zhCNByUnderscore = getLocale('zh_CN')
      expect(zhCNByUnderscore).toBeDefined()
      expect(zhCNByUnderscore?.bcp47).toBe('zh-CN')

      const es419ByBcp = getLocale('es-419')
      expect(es419ByBcp).toBeDefined()
      expect(es419ByBcp?.bcp47).toBe('es-419')

      const esUpper = getLocale('ES')
      expect(esUpper).toBeDefined()
      expect(esUpper?.bcp47).toBe('es')
    })

    it('accurately identifies RTL language direction', () => {
      expect(isRTL('ar')).toBe(true)
      expect(isRTL('fa')).toBe(true)
      expect(isRTL('he')).toBe(true)
      expect(isRTL('ur')).toBe(true)

      expect(isRTL('en')).toBe(false)
      expect(isRTL('es')).toBe(false)
      expect(isRTL('fr')).toBe(false)
      expect(isRTL('ja')).toBe(false)
      expect(isRTL('ru')).toBe(false)
      expect(isRTL('unknown-code')).toBe(false)
    })
  })

  describe('localized translations lookup', () => {
    it('resolves UI messages across multiple languages', () => {
      expect(getLocalizedMessage('archive', 'en')).toBe('Archive')
      expect(getLocalizedMessage('archive', 'es')).toBe('Archivo')
      expect(getLocalizedMessage('archive', 'ja')).toBe('アーカイブ')
      expect(getLocalizedMessage('archive', 'ru')).toBe('Архив')

      expect(getLocalizedMessage('home', 'en')).toBe('Home')
      expect(getLocalizedMessage('home', 'es')).toBe('Inicio')
      expect(getLocalizedMessage('home', 'fr')).toBe('Accueil')
    })

    it('resolves canonical translations via getTranslation with domain prefixes', () => {
      // 1. messages
      expect(getTranslation('messages.archive', 'es')).toBe('Archivo')
      expect(getTranslation('messages.home', 'es')).toBe('Inicio')

      // 2. globals
      expect(getTranslation('globals.blog.jumpLinkMessage', 'en')).toBe('Read more')
      expect(getTranslation('globals.blog.jumpLinkMessage', 'es')).toBe('Leer más')
      expect(getTranslation('globals.blog.jumpLinkMessage', 'fr')).toBe('Lire la suite')

      // 3. widgets
      expect(getTranslation('widgets.ContactForm.contactFormSendMsg', 'en')).toBe('Send')
      expect(getTranslation('widgets.ContactForm.contactFormSendMsg', 'es')).toBe('Enviar')
      expect(getTranslation('widgets.ContactForm.contactFormEmailMsg', 'es')).toBe('Correo electrónico')

      expect(getTranslation('widgets.BlogList.showAllText', 'en')).toBe('Show All')
      expect(getTranslation('widgets.BlogList.showAllText', 'es')).toBe('Mostrar todo')

      expect(getTranslation('widgets.Feed.loadingMsg', 'es')).toBe('Cargando...')
      expect(getTranslation('widgets.Profile.viewProfileMsg', 'es')).toBe('Ver todo mi perfil')
    })

    it('falls back to English default value when locale translation is missing', () => {
      const fallback = getTranslation('messages.archive', 'non-existent-locale')
      expect(fallback).toBe('Archive')

      const globFallback = getTranslation('globals.blog.jumpLinkMessage', 'non-existent-locale')
      expect(globFallback).toBe('Read more')
    })
  })

  describe('icu plural forms resolution', () => {
    it('resolves cardinal plural forms in English', () => {
      expect(resolvePlural('numberOfComments', 0, 'en')).toBe('No comments')
      expect(resolvePlural('numberOfComments', 1, 'en')).toBe('1 comment')
      expect(resolvePlural('numberOfComments', 2, 'en')).toBe('2 comments')
      expect(resolvePlural('numberOfComments', 5, 'en')).toBe('5 comments')
      expect(resolvePlural('numberOfComments', 21, 'en')).toBe('21 comments')
      expect(resolvePlural('numberOfComments', 100, 'en')).toBe('100 comments')
    })

    it('resolves Slavic inflectional plural forms in Russian', () => {
      expect(resolvePlural('numberOfComments', 0, 'ru')).toBe('Комментариев нет')
      expect(resolvePlural('numberOfComments', 1, 'ru')).toBe('1&#160;комментарий')
      expect(resolvePlural('numberOfComments', 2, 'ru')).toBe('2&#160;комментария')
      expect(resolvePlural('numberOfComments', 5, 'ru')).toBe('5&#160;комментариев')
      expect(resolvePlural('numberOfComments', 21, 'ru')).toBe('21&#160;комментарий')
    })

    it('resolves Arabic dual and plural forms', () => {
      expect(resolvePlural('numberOfComments', 0, 'ar')).toBe('ليست هناك تعليقات')
      expect(resolvePlural('numberOfComments', 1, 'ar')).toBe('تعليق واحد')
      expect(resolvePlural('numberOfComments', 2, 'ar')).toBe('تعليقان (2)')
      expect(resolvePlural('numberOfComments', 5, 'ar')).toBe('5 تعليقات')
    })
  })

  describe('resolveDataPath locale integration', () => {
    it('resolves messages with localized value when locale is passed in context', () => {
      const resolved = resolveDataPath('data:messages.archive', { locale: 'es', catalog })
      expect(resolved).toBeDefined()
      expect(resolved?.type).toBe('string')
      expect(resolved?.sourceCatalog).toBe('messages')
      expect(resolved?.localizedValue).toBe('Archivo')
    })

    it('resolves translatable globals with localized value', () => {
      const resolved = resolveDataPath('data:blog.jumpLinkMessage', { locale: 'es', catalog })
      expect(resolved).toBeDefined()
      expect(resolved?.translatable).toBe(true)
      expect(resolved?.localizationKey).toBe('globals.blog.jumpLinkMessage')
      expect(resolved?.defaultValue).toBe('Read more')
      expect(resolved?.localizedValue).toBe('Leer más')
    })

    it('resolves translatable widget properties with localized value', () => {
      const resolved = resolveDataPath('data:contactFormSendMsg', {
        widgetType: 'ContactForm',
        locale: 'es',
        catalog,
      })
      expect(resolved).toBeDefined()
      expect(resolved?.translatable).toBe(true)
      expect(resolved?.localizationKey).toBe('widgets.ContactForm.contactFormSendMsg')
      expect(resolved?.defaultValue).toBe('Send')
      expect(resolved?.localizedValue).toBe('Enviar')
    })

    it('resolves data:blog.locale metadata corresponding to the active locale', () => {
      const locResolved = resolveDataPath('data:blog.locale', { locale: 'es', catalog })
      expect(locResolved?.localizedValue).toBe('es')

      const dirResolved = resolveDataPath('data:blog.locale.languageDirection', { locale: 'ar', catalog })
      expect(dirResolved?.localizedValue).toBe('rtl')

      const alignResolved = resolveDataPath('data:blog.locale.languageAlignment', { locale: 'ar', catalog })
      expect(alignResolved?.localizedValue).toBe('right')

      const nameResolved = resolveDataPath('data:blog.locale.name', { locale: 'es', catalog })
      expect(nameResolved?.localizedValue).toBe('Spanish')

      const underscoreResolved = resolveDataPath('data:blog.localeUnderscoreDelimited', { locale: 'zh-CN', catalog })
      expect(underscoreResolved?.localizedValue).toBe('zh_cn')
    })
  })
})
