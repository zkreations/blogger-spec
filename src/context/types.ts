import type { BloggerViewId } from '../generated/types.generated.js'

export type BloggerUrlMode = 'remote' | 'local' | 'relative'

export interface BloggerContextConfig {
  /** ID del blog en Blogger (Default: '5408826600056783247' - Hamlet) */
  readonly blogId?: string
  /** Vista canónica a resolver (Default: 'homepage') */
  readonly view?: BloggerViewId
  /** ID del post o página activo si la vista es 'post' o 'static_page' */
  readonly targetId?: string
  /** Modo de re-mapeo de URLs internas (Default: 'relative') */
  readonly urlMode?: BloggerUrlMode
  /** URL base para re-mapeo en modo 'local' (ej. 'http://localhost:3000') */
  readonly baseUrl?: string
  /** Si es true, omite llamadas HTTP y usa únicamente los mocks canónicos */
  readonly offline?: boolean
  /** Overrides explícitos que tienen máxima precedencia */
  readonly overrides?: Record<string, any>
  /** Opciones de caché en memoria */
  readonly cache?: {
    readonly ttlMs?: number
  }
  /** Inyección opcional de fetch (útil para tests y entornos herméticos) */
  readonly fetch?: typeof fetch
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

export interface BloggerPostData {
  readonly id: string
  readonly title: string
  readonly url: string
  readonly absoluteUrl: string
  readonly body: string
  readonly date: string
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
