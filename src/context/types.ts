import type { BloggerDocumentNode } from '../ast.js'
import type { BloggerViewId } from '../generated/types.generated.js'
import type { BloggerBlogConfiguration } from './config-types.js'

export type BloggerUrlMode = 'remote' | 'local' | 'relative'

export interface BloggerContextConfig {
  /** Blogger blog ID (required in online mode if not provided in config.blog.id) */
  readonly blogId?: string
  /** Canonical view to resolve (Default: 'homepage') */
  readonly view?: BloggerViewId
  /** Active post or page ID when view is 'post' or 'static_page' */
  readonly targetId?: string
  /** Active post or page URL or path when view is 'post' or 'static_page' */
  readonly targetUrl?: string
  /** Blogger blog configuration and default context (blogger.config.json) */
  readonly config?: BloggerBlogConfiguration
  /** Internal URL remapping mode (Default: 'relative') */
  readonly urlMode?: BloggerUrlMode
  /** Base URL for remapping in 'local' mode (e.g. 'http://localhost:3000') */
  readonly baseUrl?: string
  /** When true, skips HTTP calls and uses canonical mocks only */
  readonly offline?: boolean
  /** Explicit overrides with highest precedence */
  readonly overrides?: Record<string, any>
  /** In-memory cache options */
  readonly cache?: {
    readonly ttlMs?: number
  }
  /** Optional fetch injection (useful for tests and hermetic environments) */
  readonly fetch?: typeof fetch
  /** When true, injects the official cookie banner (cookieChoiceInfo) before </body> */
  readonly cookieChoices?: boolean
  /** Custom base URL for the comment form iframe (avoids CORS and SameSite blocks during local dev) */
  readonly commentFrameBaseUrl?: string
  /** Theme or document XML for automatic widget discovery and <b:widget-settings> extraction */
  readonly templateXml?: string
  /** Pre-parsed AST (high-performance alternative to templateXml) */
  readonly templateAst?: BloggerDocumentNode
}

export interface DiscoveredWidget {
  readonly id: string
  readonly type: string
  readonly title?: string
  readonly version?: number
  readonly settings?: Record<string, unknown>
}

export interface BloggerRawText {
  readonly $t: string
  readonly type?: string
}

export interface BloggerRawLink {
  readonly rel: string
  readonly type?: string
  readonly href: string
  readonly title?: string
}

export interface BloggerRawCategory {
  readonly scheme?: string
  readonly term: string
}

export interface BloggerRawAuthor {
  readonly name?: BloggerRawText
  readonly uri?: BloggerRawText
  readonly email?: BloggerRawText
  readonly gd$image?: {
    readonly rel?: string
    readonly width?: string
    readonly height?: string
    readonly src: string
  }
}

export interface BloggerRawEntry {
  readonly id: BloggerRawText
  readonly published?: BloggerRawText
  readonly updated?: BloggerRawText
  readonly title: BloggerRawText
  readonly content?: BloggerRawText
  readonly summary?: BloggerRawText
  readonly link?: readonly BloggerRawLink[]
  readonly category?: readonly BloggerRawCategory[]
  readonly author?: readonly BloggerRawAuthor[]
  readonly thr$total?: BloggerRawText
  readonly gd$extendedProperty?: ReadonlyArray<{ readonly name: string, readonly value: string }>
  readonly media$thumbnail?: {
    readonly url: string
    readonly height?: string
    readonly width?: string
  }
}

export interface BloggerRawFeed {
  readonly id?: BloggerRawText
  readonly title?: BloggerRawText
  readonly subtitle?: BloggerRawText
  readonly link?: readonly BloggerRawLink[]
  readonly category?: readonly BloggerRawCategory[]
  readonly author?: readonly BloggerRawAuthor[]
  readonly entry?: readonly BloggerRawEntry[]
  readonly openSearch$totalResults?: BloggerRawText
  readonly openSearch$startIndex?: BloggerRawText
  readonly openSearch$itemsPerPage?: BloggerRawText
}

export interface BloggerRawFeedResponse {
  readonly feed?: BloggerRawFeed
  readonly entry?: BloggerRawEntry
}

export interface BloggerAuthorData {
  readonly name: string
  readonly profileUrl: string
  readonly aboutMe: string
  readonly authorPhoto: {
    readonly url: string
    readonly width: number
    readonly height: number
    readonly alt: string
  }
}

export interface BloggerPostLabel {
  readonly name: string
  readonly url: string
}

export interface BloggerCommentData {
  readonly id: string
  readonly author: string
  readonly authorAvatarSrc: string
  readonly authorUrl: string
  readonly authorUserType: string
  readonly body: string
  readonly timestamp: string
  readonly timestampValue: number
  readonly timestampAbs: number
  readonly inReplyTo: string
  readonly isDeleted: boolean
  readonly adminClass: string
  readonly deleteUrl: string
  readonly url: string
  readonly anchorName: string
}

export interface BloggerFeedLink {
  readonly url: string
  readonly name: string
  readonly feedType: string
  readonly mimeType: string
}

export interface BloggerPostData {
  readonly id: string
  readonly title: string
  readonly url: string
  readonly absoluteUrl: string
  readonly link?: string
  readonly feedLinks?: readonly BloggerFeedLink[]
  readonly body: string
  readonly date: string
  readonly timestamp?: number
  readonly publishedIso?: string
  readonly lastUpdated: string
  readonly featuredImage: string
  readonly thumbnailUrl: string
  readonly author: BloggerAuthorData
  readonly labels: readonly BloggerPostLabel[]
  readonly snippets: {
    readonly short: string
    readonly long: string
  }
  readonly numberOfComments: number
  readonly allowComments: boolean
  readonly allowNewComments: boolean
  readonly showThreadedComments: boolean
  readonly hasJumpLink: boolean
  readonly comments: readonly BloggerCommentData[]
  readonly commentFormIframeSrc: string
  readonly cmtfpIframe?: string
  readonly noNewCommentsText?: string
  readonly commentRangeText?: string
}

export interface BloggerPageLink {
  readonly id: string
  readonly title: string
  readonly href: string
  readonly isCurrentPage: boolean
}

export interface BloggerLabelData {
  readonly name: string
  readonly count: number
  readonly url: string
}

export interface BloggerHeaderData {
  readonly title: string
  readonly description: string
  readonly url: string
  readonly image?: string
}
