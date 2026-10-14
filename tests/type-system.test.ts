import { describe, expect, it } from 'vitest'
import {
  getCompatibleOperatorNames,
  getTypeDefinition,
  getTypeModifiers,
  isTruthy,
  isTypeAssignable,
  resolveModifierReturnType,
  resolveOperatorReturnType,
} from '../src/helpers.js'
import * as RootExports from '../src/index.js'
import * as TypeSystemExports from '../src/type-system.js'

describe('canonical type system & coercion engine', () => {
  it('exposes type system functions on root, helpers and type-system module', () => {
    expect(RootExports.isTypeAssignable).toBeDefined()
    expect(RootExports.getTypeModifiers).toBeDefined()
    expect(RootExports.getCompatibleOperators).toBeDefined()
    expect(RootExports.resolveOperatorReturnType).toBeDefined()
    expect(RootExports.resolveModifierReturnType).toBeDefined()
    expect(RootExports.isTruthy).toBeDefined()

    expect(TypeSystemExports.isTypeAssignable).toBeDefined()
    expect(TypeSystemExports.getTypeModifiers).toBeDefined()
    expect(TypeSystemExports.resolveModifierReturnType).toBeDefined()
  })

  describe('isTypeAssignable (subtype hierarchy)', () => {
    it('handles identity, universal and scalar assignability', () => {
      expect(isTypeAssignable('string', 'string')).toBe(true)
      expect(isTypeAssignable('number', 'number')).toBe(true)
      expect(isTypeAssignable('boolean', 'boolean')).toBe(true)
      expect(isTypeAssignable('object', 'object')).toBe(true)
      expect(isTypeAssignable('array', 'array')).toBe(true)

      expect(isTypeAssignable('string', 'any')).toBe(true)
      expect(isTypeAssignable('any', 'number')).toBe(true)
      expect(isTypeAssignable('string', 'unknown')).toBe(true)
      expect(isTypeAssignable('unknown', 'boolean')).toBe(true)

      expect(isTypeAssignable('string', 'scalar')).toBe(true)
      expect(isTypeAssignable('number', 'scalar')).toBe(true)
      expect(isTypeAssignable('boolean', 'scalar')).toBe(true)
      expect(isTypeAssignable('url', 'scalar')).toBe(true)
      expect(isTypeAssignable('object', 'scalar')).toBe(false)
      expect(isTypeAssignable('array', 'scalar')).toBe(false)
    })

    it('validates flat subtype hierarchy where specialized types extend string directly', () => {
      expect(isTypeAssignable('url', 'string')).toBe(true)
      expect(isTypeAssignable('image', 'string')).toBe(true)
      expect(isTypeAssignable('date', 'string')).toBe(true)
      expect(isTypeAssignable('locale', 'string')).toBe(true)
      expect(isTypeAssignable('message', 'string')).toBe(true)

      // Empirically proven independence: image does not extend url
      expect(isTypeAssignable('image', 'url')).toBe(false)
      expect(isTypeAssignable('date', 'image')).toBe(false)
      expect(isTypeAssignable('locale', 'date')).toBe(false)
      expect(isTypeAssignable('string', 'url')).toBe(false)
    })

    it('enforces isolation of skin variables from template string hierarchy', () => {
      expect(isTypeAssignable('skin:color', 'string')).toBe(false)
      expect(isTypeAssignable('skin:font', 'string')).toBe(false)
      expect(isTypeAssignable('skin:length', 'string')).toBe(false)
      expect(isTypeAssignable('skin:url', 'url')).toBe(false)
      expect(isTypeAssignable('skin:url', 'string')).toBe(false)
      expect(isTypeAssignable('skin:background', 'string')).toBe(false)
    })

    it('supports array parameterized forms assignability', () => {
      expect(isTypeAssignable('array[string]', 'array')).toBe(true)
      expect(isTypeAssignable('array[image]', 'array')).toBe(true)
      expect(isTypeAssignable('array[object]', 'array')).toBe(true)
      expect(isTypeAssignable('array[url]', 'array')).toBe(true)

      expect(isTypeAssignable('array[url]', 'array[string]')).toBe(true)
      expect(isTypeAssignable('array[image]', 'array[string]')).toBe(true)
      expect(isTypeAssignable('array[number]', 'array[string]')).toBe(false)
    })
  })

  describe('getTypeModifiers', () => {
    it('returns string base modifiers', () => {
      const stringMods = getTypeModifiers('string')
      expect(stringMods.length).toBeDefined()
      expect(stringMods.size).toBeDefined()
      expect(stringMods.escaped).toBeDefined()
      expect(stringMods.jsEscaped).toBeDefined()
      expect(stringMods.jsonEscaped).toBeDefined()
      expect(stringMods.cssEscaped).toBeDefined()
    })

    it('merges string modifiers into string subtypes', () => {
      const urlMods = getTypeModifiers('url')
      expect(urlMods.canonical).toBeDefined()
      expect(urlMods.http).toBeDefined()
      expect(urlMods.https).toBeDefined()
      expect(urlMods.length).toBeDefined()
      expect(urlMods.escaped).toBeDefined()

      const imageMods = getTypeModifiers('image')
      expect(imageMods.isResizable).toBeDefined()
      expect(imageMods.isYouTube).toBeDefined()
      expect(imageMods.length).toBeDefined()
      expect(imageMods.escaped).toBeDefined()
      expect(imageMods.canonical).toBeUndefined()

      const dateMods = getTypeModifiers('date')
      expect(dateMods.iso8601).toBeDefined()
      expect(dateMods.year).toBeDefined()
      expect(dateMods.month).toBeDefined()
      expect(dateMods.length).toBeDefined()

      const localeMods = getTypeModifiers('locale')
      expect(localeMods.name).toBeDefined()
      expect(localeMods.language).toBeDefined()
      expect(localeMods.country).toBeDefined()
      expect(localeMods.variant).toBeDefined()
      expect(localeMods.script).toBeDefined()
      expect(localeMods.languageDirection).toBeDefined()
      expect(localeMods.languageAlignment).toBeDefined()
      expect(localeMods.length).toBeDefined()
      expect(localeMods.escaped).toBeDefined()
    })

    it('returns array collection modifiers for both generic and parameterized forms', () => {
      const arrayMods = getTypeModifiers('array')
      expect(arrayMods.size).toBeDefined()
      expect(arrayMods.length).toBeDefined()
      expect(arrayMods.first).toBeDefined()
      expect(arrayMods.last).toBeDefined()
      expect(arrayMods.empty).toBeDefined()
      expect(arrayMods.notEmpty).toBeDefined()
      expect(arrayMods.any).toBeDefined()

      const arrayImageMods = getTypeModifiers('array[image]')
      expect(arrayImageMods.size).toBeDefined()
      expect(arrayImageMods.first).toBeDefined()
    })

    it('strictly isolates skin variable modifiers without inheriting string methods', () => {
      const colorMods = getTypeModifiers('skin:color')
      expect(colorMods.red).toBeDefined()
      expect(colorMods.green).toBeDefined()
      expect(colorMods.blue).toBeDefined()
      expect(colorMods.alpha).toBeDefined()
      expect(colorMods.length).toBeUndefined()
      expect(colorMods.escaped).toBeUndefined()

      const fontMods = getTypeModifiers('skin:font')
      expect(Object.keys(fontMods)).toEqual(['family', 'size'])
      expect(fontMods.family).toBeDefined()
      expect(fontMods.size).toBeDefined()
      expect(fontMods.style).toBeUndefined()
      expect(fontMods.weight).toBeUndefined()
      expect(fontMods.length).toBeUndefined()

      const bgMods = getTypeModifiers('skin:background')
      expect(bgMods.color).toBeDefined()
      expect(bgMods.image).toBeDefined()
      expect(bgMods.length).toBeUndefined()

      const urlMods = getTypeModifiers('skin:url')
      expect(Object.keys(urlMods).length).toBe(0)
    })

    it('returns empty object for unknown or unparameterized primitives', () => {
      expect(getTypeModifiers('number')).toEqual({})
      expect(getTypeModifiers('boolean')).toEqual({})
      expect(getTypeModifiers('non_existent')).toEqual({})
    })
  })

  describe('getCompatibleOperators & getCompatibleOperatorNames', () => {
    it('returns arithmetic, relational and order operators for number', () => {
      const numberOps = getCompatibleOperatorNames('number')
      expect(numberOps).toContain('+')
      expect(numberOps).toContain('-')
      expect(numberOps).toContain('*')
      expect(numberOps).toContain('/')
      expect(numberOps).toContain('%')
      expect(numberOps).toContain('<')
      expect(numberOps).toContain('==')
      expect(numberOps).not.toContain('to')
    })

    it('includes "to" operator only for number in loop context', () => {
      const loopOps = getCompatibleOperatorNames('number', true)
      expect(loopOps).toContain('to')

      const stringLoopOps = getCompatibleOperatorNames('string', true)
      expect(stringLoopOps).not.toContain('to')
    })

    it('returns collection and lambda operators for array', () => {
      const arrayOps = getCompatibleOperatorNames('array')
      expect(arrayOps).toContain('filter')
      expect(arrayOps).toContain('map')
      expect(arrayOps).toContain('count')
      expect(arrayOps).toContain('take')
      expect(arrayOps).toContain('skip')
      expect(arrayOps).toContain('contains')
      expect(arrayOps).toContain('==')
      expect(arrayOps).not.toContain('+')
      expect(arrayOps).not.toContain('*')
    })

    it('returns logical operators for boolean', () => {
      const boolOps = getCompatibleOperatorNames('boolean')
      expect(boolOps).toContain('and')
      expect(boolOps).toContain('or')
      expect(boolOps).toContain('==')
      expect(boolOps).toContain('+')
      expect(boolOps).not.toContain('*')
      expect(boolOps).not.toContain('filter')
    })

    it('returns url and image operators honoring subtype assignability to string', () => {
      const urlOps = getCompatibleOperatorNames('url')
      expect(urlOps).toContain('path')
      expect(urlOps).toContain('params')
      expect(urlOps).toContain('appendParams')
      expect(urlOps).toContain('+')

      const imageOps = getCompatibleOperatorNames('image')
      expect(imageOps).toContain('resizeImage')
      expect(imageOps).toContain('path')
      expect(imageOps).toContain('params')
      expect(imageOps).toContain('+')

      const localeOps = getCompatibleOperatorNames('locale')
      expect(localeOps).toContain('+')
      expect(localeOps).toContain('==')
      expect(localeOps).toContain('contains')
    })
  })

  describe('resolveOperatorReturnType', () => {
    it('deduces boolean for relational, comparison and logical operators', () => {
      expect(resolveOperatorReturnType('==', 'number', 'number')).toBe('boolean')
      expect(resolveOperatorReturnType('!=', 'string', 'string')).toBe('boolean')
      expect(resolveOperatorReturnType('<', 'number', 'number')).toBe('boolean')
      expect(resolveOperatorReturnType('and', 'boolean', 'boolean')).toBe('boolean')
      expect(resolveOperatorReturnType('or', 'boolean', 'boolean')).toBe('boolean')
      expect(resolveOperatorReturnType('contains', 'string', 'string')).toBe('boolean')
      expect(resolveOperatorReturnType('in', 'number', 'array')).toBe('boolean')
    })

    it('resolves arithmetic operations and coercions', () => {
      expect(resolveOperatorReturnType('-', 'number', 'number')).toBe('number')
      expect(resolveOperatorReturnType('*', 'number', 'number')).toBe('number')
      expect(resolveOperatorReturnType('/', 'number', 'number')).toBe('number')
      expect(resolveOperatorReturnType('%', 'number', 'number')).toBe('number')

      expect(resolveOperatorReturnType('+', 'number', 'number')).toBe('number')
      expect(resolveOperatorReturnType('+', 'number', 'string')).toBe('string')
      expect(resolveOperatorReturnType('+', 'string', 'number')).toBe('string')
      expect(resolveOperatorReturnType('+', 'string', 'string')).toBe('string')
      expect(resolveOperatorReturnType('+', 'url', 'string')).toBe('string')
    })

    it('resolves collection transformations and element unwrapping', () => {
      expect(resolveOperatorReturnType('filter', 'array[image]')).toBe('array[image]')
      expect(resolveOperatorReturnType('where', 'array')).toBe('array')
      expect(resolveOperatorReturnType('take', 'array[string]')).toBe('array[string]')
      expect(resolveOperatorReturnType('count', 'array')).toBe('number')
      expect(resolveOperatorReturnType('map', 'array')).toBe('array')
      expect(resolveOperatorReturnType('to', 'number')).toBe('array')

      expect(resolveOperatorReturnType('first', 'array[image]')).toBe('image')
      expect(resolveOperatorReturnType('first', 'array')).toBe('unknown')

      // Property modifier unwrapping (.first, .last)
      expect(resolveModifierReturnType('array[image]', 'first')).toBe('image')
      expect(resolveModifierReturnType('array[string]', 'last')).toBe('string')
      expect(resolveModifierReturnType('array', 'first')).toBe('unknown')
      expect(resolveModifierReturnType('string', 'length')).toBe('number')
      expect(resolveModifierReturnType('locale', 'name')).toBe('string')
      expect(resolveModifierReturnType('locale', 'languageDirection')).toBe('string')
      expect(resolveModifierReturnType('locale', 'length')).toBe('number')
      expect(resolveModifierReturnType('array', 'size')).toBe('number')
      expect(resolveModifierReturnType('array', 'empty')).toBe('boolean')
    })

    it('resolves native specialized functions and transform operators', () => {
      expect(resolveOperatorReturnType('resizeImage')).toBe('image')
      expect(resolveOperatorReturnType('snippet')).toBe('string')
      expect(resolveOperatorReturnType('format')).toBe('string')
      expect(resolveOperatorReturnType('path')).toBe('url')
      expect(resolveOperatorReturnType('params')).toBe('url')
      expect(resolveOperatorReturnType('appendParams')).toBe('url')
      expect(resolveOperatorReturnType('fragment')).toBe('url')
    })

    it('resolves Elvis and ternary operators preserving operand type', () => {
      expect(resolveOperatorReturnType('?:', 'image', 'string')).toBe('image')
      expect(resolveOperatorReturnType('?:', 'unknown', 'string')).toBe('string')
      expect(resolveOperatorReturnType('?:', 'unknown')).toBe('unknown')
    })
  })

  describe('isTruthy', () => {
    it('correctly evaluates canonical Blogger truthy and falsy values', () => {
      expect(isTruthy(true)).toBe(true)
      expect(isTruthy('yes')).toBe(true)
      expect(isTruthy('hello')).toBe(true)
      expect(isTruthy(1)).toBe(true)
      expect(isTruthy(-5)).toBe(true)
      expect(isTruthy([1])).toBe(true)
      expect(isTruthy({ key: 'val' })).toBe(true)

      expect(isTruthy(false)).toBe(false)
      expect(isTruthy('no')).toBe(false)
      expect(isTruthy('')).toBe(false)
      expect(isTruthy(0)).toBe(false)
      expect(isTruthy([])).toBe(false)
      expect(isTruthy({})).toBe(false)
      expect(isTruthy(null)).toBe(false)
      expect(isTruthy(undefined)).toBe(false)
    })
  })

  describe('getTypeDefinition', () => {
    it('retrieves detailed type metadata from catalog', () => {
      const imgDef = getTypeDefinition('image')
      expect(imgDef).toBeDefined()
      expect(imgDef?.parent_type).toBe('string')
      expect(imgDef?.category).toBe('subtype')

      const colorDef = getTypeDefinition('skin:color')
      expect(colorDef).toBeDefined()
      expect(colorDef?.parent_type).toBeNull()
      expect(colorDef?.category).toBe('skin')
    })
  })
})
