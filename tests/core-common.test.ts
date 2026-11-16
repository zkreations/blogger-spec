import { describe, expect, it } from 'vitest'
import {
  getDeepProperty,
  isBloggerTruthy,
  parseBloggerDataPath,
  pureDeepMerge,
  setDeepProperty,
} from '../src/core/common.js'

describe('core common utilities suite', () => {
  describe('parseBloggerDataPath', () => {
    it('normalizes dot notation and bracket indexing into clean segments', () => {
      expect(parseBloggerDataPath('links[0].title')).toEqual(['links', '0', 'title'])
      expect(parseBloggerDataPath('posts[1]["author"].name')).toEqual(['posts', '1', 'author', 'name'])
      expect(parseBloggerDataPath('data:view.title')).toEqual(['view', 'title'])
    })

    it('handles preserveDataNamespace option', () => {
      expect(parseBloggerDataPath('data:view.title', { preserveDataNamespace: true })).toEqual(['data:view', 'title'])
      expect(parseBloggerDataPath('data:post.author.name', { preserveDataNamespace: true })).toEqual(['data:post', 'author', 'name'])
    })

    it('normalizes arrays of path segments', () => {
      expect(parseBloggerDataPath(['data:posts', '0', 'title'])).toEqual(['posts', '0', 'title'])
      expect(parseBloggerDataPath(['links[0]', 'href'])).toEqual(['links', '0', 'href'])
    })

    it('returns empty array on empty input', () => {
      expect(parseBloggerDataPath('')).toEqual([])
      expect(parseBloggerDataPath([])).toEqual([])
    })
  })

  describe('getDeepProperty & setDeepProperty', () => {
    it('reads nested properties safely across objects and arrays', () => {
      const data = {
        posts: [
          { title: 'Post 1', author: { name: 'Alice' } },
          { title: 'Post 2', author: { name: 'Bob' } },
        ],
        blog: { title: 'My Blog' },
      }

      expect(getDeepProperty(data, 'data:posts[0].author.name')).toBe('Alice')
      expect(getDeepProperty(data, 'posts[1].title')).toBe('Post 2')
      expect(getDeepProperty(data, 'blog.title')).toBe('My Blog')
      expect(getDeepProperty(data, 'posts[99].title')).toBeUndefined()
      expect(getDeepProperty(null, 'any.path')).toBeUndefined()
    })

    it('writes deep properties instantiating intermediate objects and arrays', () => {
      const target: Record<string, any> = {}

      setDeepProperty(target, 'blog.title', 'Tech Blog')
      expect(target.blog.title).toBe('Tech Blog')

      setDeepProperty(target, 'data:posts[0].title', 'First Post')
      expect(Array.isArray(target.posts)).toBe(true)
      expect(target.posts[0].title).toBe('First Post')

      setDeepProperty(target, 'posts[1].title', 'Second Post')
      expect(target.posts[1].title).toBe('Second Post')
    })
  })

  describe('isBloggerTruthy', () => {
    it('coerces canonical boolean strings and literals', () => {
      expect(isBloggerTruthy(true)).toBe(true)
      expect(isBloggerTruthy('true')).toBe(true)
      expect(isBloggerTruthy('yes')).toBe(true)

      expect(isBloggerTruthy(false)).toBe(false)
      expect(isBloggerTruthy('false')).toBe(false)
      expect(isBloggerTruthy('no')).toBe(false)
      expect(isBloggerTruthy(null)).toBe(false)
      expect(isBloggerTruthy(undefined)).toBe(false)
      expect(isBloggerTruthy('')).toBe(false)
    })

    it('unwraps { value: ... } container objects', () => {
      expect(isBloggerTruthy({ value: true })).toBe(true)
      expect(isBloggerTruthy({ value: 'yes' })).toBe(true)
      expect(isBloggerTruthy({ value: false })).toBe(false)
      expect(isBloggerTruthy({ value: 'no' })).toBe(false)
    })

    it('rejects arbitrary strings, numbers and non-value objects as falsy for boolean attributes', () => {
      expect(isBloggerTruthy(1)).toBe(false)
      expect(isBloggerTruthy('data:order')).toBe(false)
      expect(isBloggerTruthy({})).toBe(false)
      expect(isBloggerTruthy([])).toBe(false)
    })
  })

  describe('pureDeepMerge', () => {
    it('merges objects deeply without mutating target', () => {
      const target = { a: 1, nested: { b: 2, c: 3 } }
      const source = { nested: { c: 99, d: 4 }, extra: 'hello' }

      const result = pureDeepMerge(target, source)

      expect(result).toEqual({
        a: 1,
        nested: { b: 2, c: 99, d: 4 },
        extra: 'hello',
      })
      expect(target.nested.c).toBe(3) // immutability verified
    })

    it('clones arrays cleanly', () => {
      const target = { items: [1, 2] }
      const source = { items: [3, 4, 5] }

      const result = pureDeepMerge(target, source)
      expect(result.items).toEqual([3, 4, 5])
      expect(target.items).toEqual([1, 2])
    })
  })
})
