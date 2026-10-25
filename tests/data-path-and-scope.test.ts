import { describe, expect, it } from 'vitest'
import { resolveDataPath, toSkinVarIdentifier } from '../src/data-path.js'
import { ScopeEnvironment } from '../src/scope.js'

describe('dataPath Navigator (resolveDataPath)', () => {
  it('resolves canonical global paths and modifiers', () => {
    const blogUrlCanonical = resolveDataPath('data:blog.url.canonical')
    expect(blogUrlCanonical).toBeDefined()
    expect(blogUrlCanonical?.name).toBe('canonical')
    expect(blogUrlCanonical?.type).toBe('url')
    expect(blogUrlCanonical?.sourceCatalog).toBe('types')
    expect(blogUrlCanonical?.description).toBe('Resolves and returns the canonical absolute URL.')

    const blogTitle = resolveDataPath(['data:blog', 'title'])
    expect(blogTitle).toBeDefined()
    expect(blogTitle?.name).toBe('title')
    expect(blogTitle?.type).toBe('string')
    expect(blogTitle?.sourceCatalog).toBe('globals')

    const escapedTitle = resolveDataPath('data:blog.title.escaped')
    expect(escapedTitle).toBeDefined()
    expect(escapedTitle?.name).toBe('escaped')
    expect(escapedTitle?.type).toBe('string')
    expect(escapedTitle?.sourceCatalog).toBe('types')

    const searchLabel = resolveDataPath('data:view.search.label')
    expect(searchLabel).toBeDefined()
    expect(searchLabel?.name).toBe('label')
    expect(searchLabel?.type).toBe('string')
    expect(searchLabel?.sourceCatalog).toBe('globals')
  })

  it('detects and flags deprecated properties with status metadata', () => {
    const isMobile = resolveDataPath('data:view.isMobile')
    expect(isMobile).toBeDefined()
    expect(isMobile?.name).toBe('isMobile')
    expect(isMobile?.type).toBe('boolean')
    expect(isMobile?.isDeprecated).toBe(true)
    expect(isMobile?.description).toContain('data:view.isMobile is non-functional in responsive v3 themes')
  })

  it('resolves widget canonical properties, collections, and item properties', () => {
    const posts = resolveDataPath('posts', { widgetType: 'Blog' })
    expect(posts).toBeDefined()
    expect(posts?.name).toBe('posts')
    expect(posts?.isCollection).toBe(true)
    expect(posts?.sourceCatalog).toBe('widgets')

    const firstPostTitle = resolveDataPath('data:posts.first.title', { widgetType: 'Blog' })
    expect(firstPostTitle).toBeDefined()
    expect(firstPostTitle?.name).toBe('title')
    expect(firstPostTitle?.type).toBe('string')

    const indexedPostTitle = resolveDataPath('posts[0].title', { widgetType: 'Blog' })
    expect(indexedPostTitle).toBeDefined()
    expect(indexedPostTitle?.name).toBe('title')
    expect(indexedPostTitle?.type).toBe('string')

    const postsSize = resolveDataPath('data:posts.size', { widgetType: 'Blog' })
    expect(postsSize).toBeDefined()
    expect(postsSize?.name).toBe('size')
    expect(postsSize?.type).toBe('number')
    expect(postsSize?.sourceCatalog).toBe('types')

    const postsEmpty = resolveDataPath('data:posts.empty', { widgetType: 'Blog' })
    expect(postsEmpty).toBeDefined()
    expect(postsEmpty?.name).toBe('empty')
    expect(postsEmpty?.type).toBe('boolean')
    expect(postsEmpty?.sourceCatalog).toBe('types')
  })

  it('resolves data:widgets collection and widget instance descriptors', () => {
    const blogCollection = resolveDataPath('data:widgets.Blog')
    expect(blogCollection).toBeDefined()
    expect(blogCollection?.type).toBe('array[object]')
    expect(blogCollection?.isCollection).toBe(true)

    const blogInstancePostTitle = resolveDataPath('data:widgets.Blog1.posts[0].title')
    expect(blogInstancePostTitle).toBeDefined()
    expect(blogInstancePostTitle?.name).toBe('title')
    expect(blogInstancePostTitle?.type).toBe('string')

    const widgetMeta = resolveDataPath('data:widget.instanceId')
    expect(widgetMeta).toBeDefined()
    expect(widgetMeta?.name).toBe('instanceId')
    expect(widgetMeta?.type).toBe('string')
    expect(widgetMeta?.sourceCatalog).toBe('widgets')
  })

  it('resolves localized messages from messages catalog', () => {
    const msg = resolveDataPath('data:messages.newerPosts')
    expect(msg).toBeDefined()
    expect(msg?.name).toBe('newerPosts')
    expect(msg?.type).toBe('string')
    expect(msg?.sourceCatalog).toBe('messages')
  })

  it('resolves Blog widget canonical messages.blogComment without colliding with global messages', () => {
    const blogComment = resolveDataPath('data:messages.blogComment', { widgetType: 'Blog' })
    expect(blogComment).toBeDefined()
    expect(blogComment?.name).toBe('blogComment')
    expect(blogComment?.type).toBe('string')
    expect(blogComment?.sourceCatalog).toBe('widgets')

    const blogCommentUnprefixed = resolveDataPath('messages.blogComment', { widgetType: 'Blog' })
    expect(blogCommentUnprefixed).toBeDefined()
    expect(blogCommentUnprefixed?.name).toBe('blogComment')
    expect(blogCommentUnprefixed?.type).toBe('string')
    expect(blogCommentUnprefixed?.sourceCatalog).toBe('widgets')

    const globalMsg = resolveDataPath('data:messages.newerPosts', { widgetType: 'Blog' })
    expect(globalMsg).toBeDefined()
    expect(globalMsg?.name).toBe('newerPosts')
    expect(globalMsg?.type).toBe('string')
    expect(globalMsg?.sourceCatalog).toBe('messages')

    const env = new ScopeEnvironment()
    env.pushScope('widget', { widgetType: 'Blog' })
    const scopeBlogComment = resolveDataPath('data:messages.blogComment', { scope: env })
    expect(scopeBlogComment).toBeDefined()
    expect(scopeBlogComment?.name).toBe('blogComment')
    expect(scopeBlogComment?.type).toBe('string')
    expect(scopeBlogComment?.sourceCatalog).toBe('widgets')

    const scopeGlobalMsg = resolveDataPath('data:messages.newerPosts', { scope: env })
    expect(scopeGlobalMsg).toBeDefined()
    expect(scopeGlobalMsg?.name).toBe('newerPosts')
    expect(scopeGlobalMsg?.type).toBe('string')
    expect(scopeGlobalMsg?.sourceCatalog).toBe('messages')
  })

  it('resolves variables supplied in context', () => {
    const authorName = resolveDataPath('author.name', {
      variables: {
        author: 'object',
      },
      widgetType: 'Blog',
    })
    expect(authorName).toBeDefined()
    expect(authorName?.name).toBe('name')
  })

  it('seamlessly integrates with ScopeEnvironment', () => {
    const env = new ScopeEnvironment()
    env.pushScope('widget', { widgetType: 'Blog' })
    env.pushScope('loop', { symbols: { post: 'object' } })

    const postTitle = resolveDataPath('data:post.title', { scope: env })
    expect(postTitle).toBeDefined()
    expect(postTitle?.name).toBe('title')
    expect(postTitle?.type).toBe('string')

    const blogProp = resolveDataPath('data:posts', { scope: env })
    expect(blogProp).toBeDefined()
    expect(blogProp?.name).toBe('posts')
    expect(blogProp?.sourceCatalog).toBe('widgets')
  })

  it('returns undefined for non-existent or unresolvable paths', () => {
    expect(resolveDataPath('data:nonExistentGlobal.prop')).toBeUndefined()
    expect(resolveDataPath('data:blog.nonExistentField')).toBeUndefined()
    expect(resolveDataPath('')).toBeUndefined()
  })

  it('normalizes skin variable names with toSkinVarIdentifier', () => {
    expect(toSkinVarIdentifier('admin.name')).toBe('admin_name')
    expect(toSkinVarIdentifier('body.font.family')).toBe('body_font_family')
    expect(toSkinVarIdentifier('keycolor')).toBe('keycolor')
  })

  it('resolves Theme Designer skin variables and their modifiers via resolveDataPath', () => {
    const skinVars = {
      'body_font': { type: 'font', name: 'body.font' },
      'keycolor': 'color',
      'site.title': { type: 'string', name: 'site.title' },
    }

    // 1. Resolve variable node directly
    const fontVar = resolveDataPath('data:skin.vars.body_font', { skinVariables: skinVars })
    expect(fontVar).toBeDefined()
    expect(fontVar?.name).toBe('body_font')
    expect(fontVar?.type).toBe('skin:font')
    expect(fontVar?.sourceCatalog).toBe('variables')

    // 2. Resolve modifier on skin variable (e.g. .family on font)
    const fontFamily = resolveDataPath('data:skin.vars.body_font.family', { skinVariables: skinVars })
    expect(fontFamily).toBeDefined()
    expect(fontFamily?.name).toBe('family')
    expect(fontFamily?.type).toBe('string')
    expect(fontFamily?.sourceCatalog).toBe('types')

    // 3. Resolve modifier on color variable (e.g. .red on color)
    const colorRed = resolveDataPath('data:skin.vars.keycolor.red', { skinVariables: skinVars })
    expect(colorRed).toBeDefined()
    expect(colorRed?.name).toBe('red')
    expect(colorRed?.type).toBe('string')
    expect(colorRed?.sourceCatalog).toBe('types')

    // 4. Resolve variable defined with dot in name ('site.title' matched via 'site_title')
    const siteTitle = resolveDataPath('data:skin.vars.site_title', { skinVariables: skinVars })
    expect(siteTitle).toBeDefined()
    expect(siteTitle?.name).toBe('site_title')
    expect(siteTitle?.type).toBe('skin:string')

    // 5. Skin string variables do not have platform string modifiers (.length is invalid)
    expect(resolveDataPath('data:skin.vars.site_title.length', { skinVariables: skinVars })).toBeUndefined()

    // 6. Works without 'data:' prefix
    const noPrefixFamily = resolveDataPath('skin.vars.body_font.family', { skinVariables: skinVars })
    expect(noPrefixFamily).toBeDefined()
    expect(noPrefixFamily?.name).toBe('family')

    // 7. Unregistered skin variable falls back to generic skin_variable pattern from globals.json
    const unregVar = resolveDataPath('data:skin.vars.unknown_var')
    expect(unregVar).toBeDefined()
    expect(unregVar?.name).toBe('unknown_var')
    expect(unregVar?.type).toBe('skin_variable')
    expect(unregVar?.sourceCatalog).toBe('globals')
  })
})

describe('scopeEnvironment Symbol Table & Scope Stack', () => {
  it('initializes with global root scope and exposes platform globals', () => {
    const env = new ScopeEnvironment()
    expect(env.getDepth()).toBe(1)
    expect(env.getCurrentScope().type).toBe('global')

    expect(env.hasSymbol('data:blog')).toBe(true)
    expect(env.hasSymbol('blog')).toBe(true)
    expect(env.hasSymbol('data:view')).toBe(true)
    expect(env.hasSymbol('data:messages')).toBe(true)

    const blogSym = env.resolveIdentifier('data:blog')
    expect(blogSym?.scopeType).toBe('global')
    expect(blogSym?.requiresDataPrefix).toBe(true)
  })

  it('pushes and pops widget scopes and resolves active widget properties', () => {
    const env = new ScopeEnvironment()
    expect(env.hasSymbol('data:widget')).toBe(false)
    expect(env.hasSymbol('widget')).toBe(false)

    env.pushScope('widget', { widgetType: 'FeaturedPost' })

    expect(env.getDepth()).toBe(2)
    expect(env.getActiveWidgetType()).toBe('FeaturedPost')
    expect(env.getCurrentScope().type).toBe('widget')

    expect(env.hasSymbol('title')).toBe(true)
    expect(env.hasSymbol('data:title')).toBe(true)
    expect(env.hasSymbol('data:widget')).toBe(true)

    const titleSym = env.resolveIdentifier('data:title')
    expect(titleSym?.scopeType).toBe('widget')

    const popped = env.popScope()
    expect(popped?.type).toBe('widget')
    expect(env.getDepth()).toBe(1)
    expect(env.getActiveWidgetType()).toBeUndefined()
    expect(env.hasSymbol('data:widget')).toBe(false)
  })

  it('prevents popping the root global scope', () => {
    const env = new ScopeEnvironment()
    expect(env.popScope()).toBeUndefined()
    expect(env.getDepth()).toBe(1)
  })

  it('applies local-wins shadowing across nested loop and with scopes', () => {
    const env = new ScopeEnvironment()
    env.pushScope('widget', { widgetType: 'Blog' })

    env.pushScope('loop', {
      id: 'outer-loop',
      symbols: { item: 'post' },
    })
    expect(env.resolveIdentifier('item')?.type).toBe('post')

    env.pushScope('with', {
      id: 'inner-with',
      symbols: { item: 'string' },
    })
    expect(env.resolveIdentifier('item')?.type).toBe('string')
    expect(env.resolveIdentifier('data:item')?.type).toBe('string')

    env.popScope()
    expect(env.resolveIdentifier('item')?.type).toBe('post')
  })

  it('strictly enforces no data: prefix rule in lambda scopes per BX1019', () => {
    const env = new ScopeEnvironment()
    env.pushScope('lambda', {
      symbols: {
        x: 'post',
      },
    })

    const lambdaSym = env.resolveIdentifier('x')
    expect(lambdaSym).toBeDefined()
    expect(lambdaSym?.scopeType).toBe('lambda')
    expect(lambdaSym?.requiresDataPrefix).toBe(false)

    // Per Blogger specification & BX1019, data:x must NOT resolve to the lambda iterator
    expect(env.resolveIdentifier('data:x')).toBeUndefined()
  })

  it('clones environment preserving isolated stack state', () => {
    const env = new ScopeEnvironment()
    env.pushScope('widget', { widgetType: 'Blog' })

    const cloned = env.clone()
    expect(cloned.getDepth()).toBe(2)
    expect(cloned.getActiveWidgetType()).toBe('Blog')

    cloned.pushScope('loop', { symbols: { item: 'post' } })
    expect(cloned.getDepth()).toBe(3)
    expect(env.getDepth()).toBe(2)
    expect(env.hasSymbol('item')).toBe(false)
  })

  it('exposes resolution precedence matching scopes.json catalog', () => {
    const env = new ScopeEnvironment()
    expect(env.getResolutionPrecedence()).toEqual([
      'lambda',
      'loop',
      'with',
      'includable',
      'widget',
      'global',
    ])
  })

  it('aggregates all visible symbols with shadowing precedence', () => {
    const env = new ScopeEnvironment()
    env.pushScope('widget', { widgetType: 'Blog' })
    env.pushScope('loop', { symbols: { item: 'post' } })

    const allSymbols = env.getAllVisibleSymbols()
    expect(allSymbols.has('data:blog')).toBe(true)
    expect(allSymbols.has('posts')).toBe(true)
    expect(allSymbols.has('item')).toBe(true)
    expect(allSymbols.get('item')?.type).toBe('post')
  })
})
