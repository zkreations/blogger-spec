import { describe, expect, it } from 'vitest'
import { getSpecCatalog } from '../src/catalogs/index.js'
import {
  buildWidgetsCollection,
  createCleanBaseContext,
  resolveBloggerContext,
} from '../src/context/index.js'

describe('context Pipeline & Modular Stages', () => {
  const spec = getSpecCatalog()

  it('creates clean base context with correct matrix entry and messages', () => {
    const base = createCleanBaseContext('post', 'en', spec)
    expect(base.view.type).toBe('item')
    expect(base.view.isPost).toBe(true)
    expect(base.blog.pageType).toBe('item')
    expect(base.blog.locale).toBe('en')
    expect(base.messages.home).toBeDefined()
  })

  it('buildWidgetsCollection constructs collection with .first/.last and instance ID accessors', () => {
    const discovered = new Map([
      ['Blog1', { id: 'Blog1', type: 'Blog', sectionId: 'main' }],
      ['Header1', { id: 'Header1', type: 'Header', sectionId: 'header' }],
    ])
    const widgetData = {
      Blog1: { title: 'My Blog', posts: [{ id: '1', title: 'Post 1' }] },
      Header1: { title: 'Header Title' },
    }

    const collection = buildWidgetsCollection(discovered as any, widgetData)
    expect(collection.length).toBe(2)
    expect(collection[0].id).toBe('Blog1')
    expect((collection as any).Blog1).toBeDefined()
    expect((collection as any).Blog1.title).toBe('My Blog')
    expect((collection as any).first.id).toBe('Blog1')
    expect((collection as any).last.id).toBe('Header1')
    expect((collection as any).Blog.first.id).toBe('Blog1')
    expect((collection as any).Blog.last.id).toBe('Blog1')
  })

  it('resolves offline context through pipeline seamlessly', async () => {
    const ctx = await resolveBloggerContext({
      offline: true,
      view: 'homepage',
      overrides: {
        blog: { title: 'Pipeline Blog' },
      },
    })

    expect(ctx.blog.title).toBe('Pipeline Blog')
    expect(ctx.view.type).toBe('feed')
    expect(ctx.widgetData.Blog1).toBeDefined()
    expect(ctx.widgets).toBeDefined()
  })
})
