/**
 * Blogger Intermediate Representation (BIR) Compiler Interface.
 * Primary compiler front-end API for blogger-spec.
 */

import type { BloggerLowerOptions } from './lowering.js'
import type { BloggerIRDocument } from './types.js'
import { getSpecCatalog } from '../catalogs/index.js'
import { parseTemplate } from '../parser/template-parser.js'
import { lowerDocument } from './lowering.js'

export interface BloggerCompileIROptions extends BloggerLowerOptions {
  /**
   * If true, syntax errors do not throw immediately; instead diagnostics are recorded.
   * Defaults to false (strict canonical Blogger XML mode).
   */
  readonly tolerant?: boolean
}

/**
 * Compiles a Blogger XML template into a normalized, language-agnostic Blogger Intermediate Representation (BIR) document.
 */
export function compileToIR(
  xml: string,
  options?: BloggerCompileIROptions,
): BloggerIRDocument {
  const catalog = options?.catalog ?? getSpecCatalog()
  const doc = parseTemplate(xml, {
    catalog,
    parseExpressions: true,
    tolerant: options?.tolerant ?? false,
  })
  return lowerDocument(doc, {
    ...options,
    catalog,
    sourceXml: xml,
  })
}

export interface BloggerSerializeIROptions {
  /**
   * Indentation space count or string (defaults to 2).
   */
  readonly space?: number | string
}

/**
 * Serializes a BloggerIRDocument to a canonical, language-agnostic JSON string.
 */
export function serializeIR(
  ir: BloggerIRDocument,
  options?: BloggerSerializeIROptions,
): string {
  return JSON.stringify(ir, null, options?.space ?? 2)
}

/**
 * Deserializes a canonical JSON string into a strongly-typed BloggerIRDocument.
 */
export function parseIR(json: string): BloggerIRDocument {
  return JSON.parse(json) as BloggerIRDocument
}

