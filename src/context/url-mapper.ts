import type { BloggerUrlMode } from './types.js'

export interface UrlMapperOptions {
  readonly blogHost?: string
  readonly urlMode?: BloggerUrlMode
  readonly baseUrl?: string
}

export interface UrlMapper {
  mapUrl: (rawUrl: string | undefined) => string
  mapHref: (rawHref: string | undefined) => string
  readonly blogHost: string
  readonly urlMode: BloggerUrlMode
}

export function createUrlMapper(options: UrlMapperOptions = {}): UrlMapper {
  const {
    blogHost = '',
    urlMode = 'relative',
    baseUrl = '',
  } = options

  const cleanBaseUrl = baseUrl.replace(/\/+$/, '')
  const normalizedHost = blogHost
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')

  function map(raw: string | undefined): string {
    if (!raw)
      return ''
    if (
      raw.startsWith('/')
      || raw.startsWith('#')
      || raw.startsWith('mailto:')
      || raw.startsWith('tel:')
      || raw.startsWith('javascript:')
    ) {
      return raw
    }

    try {
      const parsed = new URL(raw)
      const currentHost = parsed.host.toLowerCase()
      const isInternal = !normalizedHost || currentHost === normalizedHost

      if (!isInternal) {
        return raw
      }

      if (urlMode === 'remote') {
        return raw
      }

      const relativePath = `${parsed.pathname}${parsed.search}${parsed.hash}`

      if (urlMode === 'local' && cleanBaseUrl) {
        return `${cleanBaseUrl}${relativePath}`
      }

      return relativePath
    }
    catch {
      return raw
    }
  }

  return {
    mapUrl: map,
    mapHref: map,
    blogHost: normalizedHost,
    urlMode,
  }
}
