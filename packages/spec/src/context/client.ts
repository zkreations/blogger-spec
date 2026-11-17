import type { BloggerRawFeedResponse } from './types.js'

export interface FeedClientOptions {
  readonly fetchFn?: typeof fetch
  readonly defaultTtlMs?: number
  readonly apiBaseUrl?: string
}

interface CacheEntry {
  readonly timestamp: number
  readonly data: any
}

export class BloggerFeedClient {
  private readonly fetchFn: typeof fetch
  private readonly defaultTtlMs: number
  private readonly apiBaseUrl: string
  private readonly cache = new Map<string, CacheEntry>()

  constructor(options: FeedClientOptions = {}) {
    this.fetchFn = options.fetchFn || globalThis.fetch
    this.defaultTtlMs = options.defaultTtlMs ?? 3600_000 // 1 hour
    this.apiBaseUrl = (options.apiBaseUrl ?? 'https://www.blogger.com/feeds').replace(/\/+$/, '')
  }

  async fetchJson<T = any>(url: string, ttlMs = this.defaultTtlMs): Promise<T | null> {
    const cached = this.cache.get(url)
    const now = Date.now()

    if (cached && now - cached.timestamp < ttlMs) {
      return cached.data as T
    }

    try {
      const res = await this.fetchFn(url, {
        headers: { Accept: 'application/json' },
      })

      if (!res || !res.ok) {
        return null
      }

      const data = await res.json()
      this.cache.set(url, { timestamp: now, data })
      return data as T
    }
    catch {
      return null
    }
  }

  async fetchPosts(
    blogId: string,
    options: {
      maxResults?: number
      startIndex?: number
      q?: string
      category?: string
    } = {},
  ): Promise<BloggerRawFeedResponse | null> {
    const params = new URLSearchParams({ alt: 'json' })
    if (options.maxResults)
      params.set('max-results', String(options.maxResults))
    if (options.startIndex)
      params.set('start-index', String(options.startIndex))
    if (options.q)
      params.set('q', options.q)

    let path = `${this.apiBaseUrl}/${blogId}/posts/default`
    if (options.category) {
      path += `/-/${encodeURIComponent(options.category)}`
    }

    const url = `${path}?${params.toString()}`
    return this.fetchJson<BloggerRawFeedResponse>(url)
  }

  async fetchPost(blogId: string, postId: string): Promise<BloggerRawFeedResponse | null> {
    const url = `${this.apiBaseUrl}/${blogId}/posts/default/${postId}?alt=json`
    return this.fetchJson<BloggerRawFeedResponse>(url)
  }

  async fetchPages(blogId: string): Promise<BloggerRawFeedResponse | null> {
    const url = `${this.apiBaseUrl}/${blogId}/pages/default?alt=json`
    return this.fetchJson<BloggerRawFeedResponse>(url)
  }

  async fetchPage(blogId: string, pageId: string): Promise<BloggerRawFeedResponse | null> {
    const url = `${this.apiBaseUrl}/${blogId}/pages/default/${pageId}?alt=json`
    return this.fetchJson<BloggerRawFeedResponse>(url)
  }

  async fetchComments(blogId: string, postId?: string): Promise<BloggerRawFeedResponse | null> {
    const url = postId
      ? `${this.apiBaseUrl}/${blogId}/${postId}/comments/default?alt=json`
      : `${this.apiBaseUrl}/${blogId}/comments/default?alt=json`
    return this.fetchJson<BloggerRawFeedResponse>(url)
  }

  clearCache(): void {
    this.cache.clear()
  }
}
