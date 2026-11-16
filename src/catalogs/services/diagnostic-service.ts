import type {
  BloggerDiagnosticCode,
  BloggerDiagnosticRule,
  BloggerDiagnosticsCatalog,
  BloggerDirectivesCatalog,
  BloggerStandardDiagnosticKey,
  BloggerStandardDiagnostics,
} from '../../types.js'
import type { CatalogStore } from '../store.js'

export class DiagnosticCatalogService {
  private readonly diagnosticMap = new Map<string, BloggerDiagnosticRule>()
  private readonly diagnosticByNameMap = new Map<string, { code: BloggerDiagnosticCode, rule: BloggerDiagnosticRule }>()
  private readonly standardDiagnostics = new Map<BloggerStandardDiagnosticKey, BloggerDiagnosticCode>()

  constructor(private readonly store: CatalogStore) {
    this.index()
  }

  private index(): void {
    const diagCatalog = this.store.getCatalog('diagnostics') as BloggerDiagnosticsCatalog
    const rules = diagCatalog?.rules || {}
    for (const [code, rule] of Object.entries(rules)) {
      const entry = { ...rule, code: (rule.code ?? code) as BloggerDiagnosticCode }
      this.diagnosticMap.set(code, entry)
      if (rule.name) {
        this.diagnosticByNameMap.set(rule.name, { code: entry.code, rule: entry })
      }
    }

    const dirCatalog = this.store.getCatalog('directives') as BloggerDirectivesCatalog
    const stdDiags = (dirCatalog?.domain_metadata?.standard_diagnostics as Record<string, string>) || {}
    for (const [key, code] of Object.entries(stdDiags)) {
      this.standardDiagnostics.set(key as BloggerStandardDiagnosticKey, code as BloggerDiagnosticCode)
    }
  }

  isDiagnosticCode(code: string): code is BloggerDiagnosticCode {
    return this.diagnosticMap.has(code)
  }

  getDiagnostic(code: string): BloggerDiagnosticRule | undefined {
    return this.diagnosticMap.get(code)
  }

  getAllDiagnostics(): Record<string, BloggerDiagnosticRule> {
    const result: Record<string, BloggerDiagnosticRule> = {}
    for (const [k, v] of this.diagnosticMap.entries()) {
      result[k] = v
    }
    return result
  }

  getDiagnosticByName(name: string): { code: BloggerDiagnosticCode, rule: BloggerDiagnosticRule } | undefined {
    return this.diagnosticByNameMap.get(name)
  }

  getDiagnosticCodeByName(name: string): BloggerDiagnosticCode {
    const entry = this.diagnosticByNameMap.get(name)
    if (!entry) {
      throw new Error(`Diagnostic rule with name '${name}' not found in diagnostics catalog`)
    }
    return entry.code
  }

  getStandardDiagnostics(): Readonly<BloggerStandardDiagnostics> {
    const result: any = {}
    for (const [k, v] of this.standardDiagnostics.entries()) {
      result[k] = v
    }
    return result
  }

  getStandardDiagnostic(key: BloggerStandardDiagnosticKey): BloggerDiagnosticCode {
    const code = this.standardDiagnostics.get(key)
    if (!code) {
      throw new Error(`Standard diagnostic '${key}' is not defined in directives catalog domain_metadata.standard_diagnostics`)
    }
    return code
  }
}
