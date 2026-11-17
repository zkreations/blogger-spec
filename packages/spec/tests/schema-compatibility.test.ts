import { describe, expect, it } from 'vitest'
import {
  checkSchemaCompatibility,
  verifySchemasBackwardCompatibility,
} from '../src/tooling/schema-compatibility.js'

describe('schema-compatibility', () => {
  it('allows backward-compatible additions (new optional property, widened enum)', () => {
    const oldSchema = {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
        },
      },
      required: ['status'],
      additionalProperties: false,
    }

    const newSchema = {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'pending'],
        },
        description: {
          type: 'string',
        },
      },
      required: ['status'],
      additionalProperties: false,
    }

    const errors = checkSchemaCompatibility(oldSchema, newSchema, 'test.schema.json')
    expect(errors).toHaveLength(0)
  })

  it('rejects removing values from an enum', () => {
    const oldSchema = {
      type: 'string',
      enum: ['standard', 'suppress_when_empty', 'server_forced_markup'],
    }

    const newSchema = {
      type: 'string',
      enum: ['standard', 'suppress_when_empty'],
    }

    const errors = checkSchemaCompatibility(oldSchema, newSchema, 'test.schema.json')
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('Enum value \'server_forced_markup\' was removed')
  })

  it('rejects making an optional property required', () => {
    const oldSchema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['title'],
      additionalProperties: false,
    }

    const newSchema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['title', 'description'],
      additionalProperties: false,
    }

    const errors = checkSchemaCompatibility(oldSchema, newSchema, 'test.schema.json')
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('Optional property \'description\' was made required')
  })

  it('rejects deleting properties from closed objects (additionalProperties: false)', () => {
    const oldSchema = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        legacyKey: { type: 'string' },
      },
      additionalProperties: false,
    }

    const newSchema = {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      additionalProperties: false,
    }

    const errors = checkSchemaCompatibility(oldSchema, newSchema, 'test.schema.json')
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('Property \'legacyKey\' was deleted from closed object')
  })

  it('rejects narrowing permitted primitive types', () => {
    const oldSchema = {
      type: ['string', 'null', 'number'],
    }

    const newSchema = {
      type: ['string', 'null'],
    }

    const errors = checkSchemaCompatibility(oldSchema, newSchema, 'test.schema.json')
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('Type \'number\' was removed from permitted types')
  })

  it('validates canonical catalogs schemas against Git baseline without breaking changes', () => {
    const result = verifySchemasBackwardCompatibility()
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})
