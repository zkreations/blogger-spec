export interface BloggerStaticFeedSnapshots {
  readonly posts?: unknown
  readonly pages?: unknown
  readonly comments?: unknown | Readonly<Record<string, unknown>>
}

function isCommentMap(val: unknown): val is Readonly<Record<string, unknown>> {
  if (!val || typeof val !== 'object' || Array.isArray(val)) {
    return false
  }
  return !('feed' in val) && !('version' in val)
}

export function createStaticFeedFetch(snapshots: BloggerStaticFeedSnapshots): typeof fetch {
  return ((input: string | URL | Request) => {
    const urlStr = typeof input === 'string'
      ? input
      : (input instanceof URL ? input.toString() : input.url)

    const jsonHeaders = { 'Content-Type': 'application/json' }

    if (urlStr.includes('/posts/default') && snapshots.posts !== undefined) {
      return Promise.resolve(new Response(JSON.stringify(snapshots.posts), { status: 200, headers: jsonHeaders }))
    }

    if (urlStr.includes('/pages/default') && snapshots.pages !== undefined) {
      return Promise.resolve(new Response(JSON.stringify(snapshots.pages), { status: 200, headers: jsonHeaders }))
    }

    const commentMatch = /\/(\d+)\/comments\/default/.exec(urlStr)
    if (commentMatch && snapshots.comments !== undefined) {
      const postId = commentMatch[1]!
      if (isCommentMap(snapshots.comments)) {
        const entryComments = snapshots.comments[postId] ?? { feed: { entry: [] } }
        return Promise.resolve(new Response(JSON.stringify(entryComments), { status: 200, headers: jsonHeaders }))
      }
      return Promise.resolve(new Response(JSON.stringify(snapshots.comments), { status: 200, headers: jsonHeaders }))
    }

    if (urlStr.includes('/comments/default') && snapshots.comments !== undefined && !isCommentMap(snapshots.comments)) {
      return Promise.resolve(new Response(JSON.stringify(snapshots.comments), { status: 200, headers: jsonHeaders }))
    }

    return Promise.resolve(new Response('{"feed":{"entry":[]}}', { status: 404, headers: jsonHeaders }))
  }) as typeof fetch
}
