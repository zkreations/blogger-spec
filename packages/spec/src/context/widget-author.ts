import type { BloggerRawEntry } from './types.js'

export interface BloggerExtractedAuthor {
  readonly displayname: string
  readonly userUrl: string
  readonly authorPhoto: {
    readonly url: string
    readonly image: string
    readonly width: number
    readonly height: number
    readonly alt: string
  }
  readonly hasgoogleprofile: boolean
}

const DEFAULT_AVATAR = 'https://lh3.googleusercontent.com/a/default-user=s80-c'

function normalizeProfileUrl(url: string | undefined): string {
  if (!url)
    return ''
  if (url.startsWith('http://www.blogger.com/')) {
    return url.replace(/^http:\/\/www\.blogger\.com\//, 'https://www.blogger.com/')
  }
  return url
}

function normalizeAvatarUrl(url: string | undefined): string {
  if (!url)
    return DEFAULT_AVATAR
  if (url.startsWith('//')) {
    return `https:${url}`
  }
  return url
}

export function extractBlogAuthor(options: {
  readonly feed?: any
  readonly rawPosts?: readonly BloggerRawEntry[]
  readonly normalizedPosts?: readonly any[]
  readonly defaultName?: string
}): BloggerExtractedAuthor {
  const { feed, rawPosts, normalizedPosts, defaultName = 'Anonymous' } = options

  // 1. Try feed.author[0]
  const rawFeedAuthor = feed?.author?.[0]
  if (rawFeedAuthor) {
    const displayname = rawFeedAuthor.name?.$t || defaultName
    const userUrl = normalizeProfileUrl(rawFeedAuthor.uri?.$t)
    const avatar = normalizeAvatarUrl(rawFeedAuthor.gd$image?.src)
    return {
      displayname,
      userUrl,
      authorPhoto: {
        url: avatar,
        image: avatar,
        width: 80,
        height: 80,
        alt: displayname,
      },
      hasgoogleprofile: userUrl.includes('blogger.com') || userUrl.includes('google.com'),
    }
  }

  // 2. Try rawPosts[0].author[0]
  const rawPostAuthor = rawPosts?.[0]?.author?.[0]
  if (rawPostAuthor) {
    const displayname = rawPostAuthor.name?.$t || defaultName
    const userUrl = normalizeProfileUrl(rawPostAuthor.uri?.$t)
    const avatar = normalizeAvatarUrl(rawPostAuthor.gd$image?.src)
    return {
      displayname,
      userUrl,
      authorPhoto: {
        url: avatar,
        image: avatar,
        width: 80,
        height: 80,
        alt: displayname,
      },
      hasgoogleprofile: userUrl.includes('blogger.com') || userUrl.includes('google.com'),
    }
  }

  // 3. Try normalizedPosts[0].author
  const normAuthor = normalizedPosts?.[0]?.author
  if (normAuthor) {
    const displayname = normAuthor.name || defaultName
    const userUrl = normalizeProfileUrl(normAuthor.profileUrl)
    const avatar = normalizeAvatarUrl(normAuthor.authorPhoto?.image || normAuthor.authorPhoto?.url)
    return {
      displayname,
      userUrl,
      authorPhoto: {
        url: avatar,
        image: avatar,
        width: normAuthor.authorPhoto?.width || 80,
        height: normAuthor.authorPhoto?.height || 80,
        alt: normAuthor.authorPhoto?.alt || displayname,
      },
      hasgoogleprofile: userUrl.includes('blogger.com') || userUrl.includes('google.com'),
    }
  }

  return {
    displayname: defaultName,
    userUrl: '',
    authorPhoto: {
      url: DEFAULT_AVATAR,
      image: DEFAULT_AVATAR,
      width: 80,
      height: 80,
      alt: defaultName,
    },
    hasgoogleprofile: false,
  }
}
