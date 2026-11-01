export type CommentMode = 'ALLOWED' | 'RESTRICTED' | 'DISABLED'

export type CommentLocation = 'EMBEDDED' | 'FULL_PAGE' | 'POPUP' | 'HIDDEN'

export const BLOGGER_POST_DATE_FORMATS = [
  'h:mm a',
  'h:mm:ss a',
  'MM/dd/yyyy hh:mm:ss a',
  'MMMM dd, yyyy',
  'EEEE, MMMM dd, yyyy',
  'MM/dd/yyyy',
  'HH:mm',
  'd.M.yy',
  'dd MMMM',
  'EEEE, dd MMMM, yyyy',
  'dd MMMM, yyyy',
] as const

export type BloggerDateFormat = typeof BLOGGER_POST_DATE_FORMATS[number]

export const BLOGGER_COMMENT_DATE_FORMATS = [
  'EEEE, MMMM dd, yyyy \'a las\' h:mm:ss a z',
  'MMMM dd, yyyy \'a las\' h:mm:ss a z',
  'MMMM dd, yyyy \'a las\' h:mm a',
  'MMM dd yyyy, h:mm:ss a',
  'h:mm:ss a',
  'h:mm a',
  'd/M/yy, h:mm a',
  'MM/dd/yyyy h:mm a',
  'MM/dd/yyyy h:mm:ss a',
  'MM/dd/yyyy',
  'h:mm a z',
  'h:mm a, MMMM dd, yyyy',
  'HH:mm',
  'MMMM dd, yyyy',
  'MMMM dd, yyyy h:mm a',
  'EEEE, MMMM dd, yyyy',
  'EEEE, MMMM dd, yyyy h:mm:ss a',
  'EEE MMM dd, hh:mm:ss a z',
  'EEE MMM dd, h:mm a',
  'EEE MMM dd, hh:mm:ss a yyyy',
  'd.M.yy',
  'd/M/yy',
  'd/M/yy HH:mm',
  'd/M/yy h:mm a',
  'EEEE, dd MMMM, yyyy',
  'dd MMMM',
  'dd MMMM, yyyy HH:mm',
] as const

export type BloggerCommentDateFormat = typeof BLOGGER_COMMENT_DATE_FORMATS[number]

export interface BloggerEntryConfiguration {
  readonly searchDescription?: string
  readonly commentMode?: CommentMode
}

export interface BloggerBlogConfiguration {
  readonly $schema?: string
  readonly blog?: {
    readonly locale?: string
    readonly adultContent?: boolean
    readonly analyticsMeasurementId?: string
    readonly isPrivate?: boolean
    readonly postsPerPage?: number
    readonly commentLocation?: CommentLocation
    readonly commentFormMessage?: string
    readonly postDateFormat?: BloggerDateFormat | string
    readonly commentDateFormat?: BloggerCommentDateFormat | string
    readonly titleAndEnclosureLinks?: boolean
  }
  readonly entries?: Record<string, BloggerEntryConfiguration>
  readonly widgets?: Record<string, Record<string, any>>
}

export interface ConfigValidationError {
  readonly path: string
  readonly message: string
  readonly code: string
}

export interface ConfigValidationResult {
  readonly valid: boolean
  readonly errors: readonly ConfigValidationError[]
}
