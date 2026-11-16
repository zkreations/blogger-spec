import type {
  BloggerCompilerQuotas,
  BloggerDiagnosticCode,
  BloggerOperatorDefinition,
  BloggerOperatorName,
  BloggerOperatorsCatalog,
  BloggerPrecedenceHierarchyLevel,
} from '../../types.js'
import type { CatalogStore } from '../store.js'

export interface OperatorSnippetOptions {
  readonly syntax?: 'functional' | 'infix'
}

export class OperatorCatalogService {
  private readonly operatorMap = new Map<string, BloggerOperatorDefinition>()
  private readonly grammarOperatorMap = new Map<string, BloggerOperatorDefinition>()
  private readonly docAliasMap = new Map<string, BloggerOperatorDefinition>()
  private precedenceHierarchy: BloggerPrecedenceHierarchyLevel[] = []
  private readonly levelBindingPowerMap = new Map<number, number>()
  private readonly operatorBindingPowerMap = new Map<string, number>()
  private readonly operatorAssociativityMap = new Map<string, 'left-to-right' | 'right-to-left' | 'inner-to-outer' | 'non-associative'>()

  constructor(private readonly store: CatalogStore) {
    this.index()
  }

  private index(): void {
    const operatorsCatalog = this.store.getCatalog('operators') as BloggerOperatorsCatalog
    const hierarchy = operatorsCatalog?.domain_metadata?.precedence_hierarchy || []
    this.precedenceHierarchy = hierarchy

    const maxLevel = hierarchy.length > 0 ? Math.max(...hierarchy.map((h: BloggerPrecedenceHierarchyLevel) => h.level)) : 10

    for (const item of hierarchy) {
      const bp = (maxLevel + 1 - item.level) * 10
      this.levelBindingPowerMap.set(item.level, bp)

      if (Array.isArray(item.operators)) {
        for (const op of item.operators) {
          if (item.associativity) {
            this.operatorAssociativityMap.set(op, item.associativity)
            this.operatorAssociativityMap.set(op.toLowerCase(), item.associativity)
          }
        }
      }
    }

    const operators = operatorsCatalog?.operators || {}
    for (const [op, def] of Object.entries(operators)) {
      this.operatorMap.set(op, def)
      this.grammarOperatorMap.set(op, def)
      this.grammarOperatorMap.set(op.toLowerCase(), def)

      const level = def.precedence_level
      if (level !== undefined) {
        const bp = this.levelBindingPowerMap.get(level) ?? (maxLevel + 1 - level) * 10
        this.operatorBindingPowerMap.set(op, bp)
        this.operatorBindingPowerMap.set(op.toLowerCase(), bp)

        if (op === '? :') {
          this.operatorBindingPowerMap.set('?', bp)
        }
      }

      if (Array.isArray(def.grammar_aliases)) {
        for (const alias of def.grammar_aliases) {
          this.grammarOperatorMap.set(alias, def)
          this.grammarOperatorMap.set(alias.toLowerCase(), def)

          const bp = this.operatorBindingPowerMap.get(op)
          if (bp !== undefined) {
            this.operatorBindingPowerMap.set(alias, bp)
            this.operatorBindingPowerMap.set(alias.toLowerCase(), bp)
          }

          const assoc = this.operatorAssociativityMap.get(op)
          if (assoc) {
            this.operatorAssociativityMap.set(alias, assoc)
            this.operatorAssociativityMap.set(alias.toLowerCase(), assoc)
          }
        }
      }

      if (Array.isArray(def.doc_aliases)) {
        for (const alias of def.doc_aliases) {
          this.docAliasMap.set(alias, def)
          this.docAliasMap.set(alias.toLowerCase(), def)
        }
      }
    }
  }

  isOperator(op: string): op is BloggerOperatorName {
    return this.grammarOperatorMap.has(op) || this.grammarOperatorMap.has(op.toLowerCase())
  }

  isGrammarOperator(op: string): boolean {
    return this.isOperator(op)
  }

  isDocAlias(alias: string): boolean {
    return this.docAliasMap.has(alias) || this.docAliasMap.has(alias.toLowerCase())
  }

  getOperator(op: string): BloggerOperatorDefinition | undefined {
    return this.grammarOperatorMap.get(op)
      ?? this.grammarOperatorMap.get(op.toLowerCase())
      ?? this.docAliasMap.get(op)
      ?? this.docAliasMap.get(op.toLowerCase())
  }

  isFunctionalOperator(op: string): boolean {
    const def = this.getOperator(op)
    return Boolean(def?.syntax?.supports_functional)
  }

  getAllOperators(): Record<string, BloggerOperatorDefinition> {
    const result: Record<string, BloggerOperatorDefinition> = {}
    for (const [k, v] of this.operatorMap.entries()) {
      result[k] = v
    }
    return result
  }

  getGrammarOperators(): Record<string, BloggerOperatorDefinition> {
    const result: Record<string, BloggerOperatorDefinition> = {}
    for (const [k, v] of this.grammarOperatorMap.entries()) {
      result[k] = v
    }
    return result
  }

  getOperatorPrecedence(op: string): number | undefined {
    const grammarDef = this.grammarOperatorMap.get(op) ?? this.grammarOperatorMap.get(op.toLowerCase())
    return grammarDef?.precedence_level
  }

  getPrecedenceHierarchy(): readonly BloggerPrecedenceHierarchyLevel[] {
    return this.precedenceHierarchy
  }

  getLevelBindingPower(level: number): number | undefined {
    return this.levelBindingPowerMap.get(level)
  }

  getOperatorBindingPower(op: string): number | undefined {
    return this.operatorBindingPowerMap.get(op) ?? this.operatorBindingPowerMap.get(op.toLowerCase())
  }

  isLogicalOperator(op: string): boolean {
    const def = this.getOperator(op)
    return def?.family === 'logical'
  }

  isRightAssociativeOperator(op: string): boolean {
    const assoc = this.operatorAssociativityMap.get(op) ?? this.operatorAssociativityMap.get(op.toLowerCase())
    if (assoc) {
      return assoc === 'right-to-left'
    }
    const def = this.getOperator(op)
    if (def?.precedence_level !== undefined) {
      const levelItem = this.precedenceHierarchy.find(h => h.level === def.precedence_level)
      return levelItem?.associativity === 'right-to-left'
    }
    return false
  }

  getCompilerQuotas(): BloggerCompilerQuotas | undefined {
    const opCatalog = this.store.getCatalog('operators') as BloggerOperatorsCatalog
    return opCatalog?.domain_metadata?.evaluation_contexts?.compiler_quotas
  }

  getExpressionQuotaLimit(): number {
    const limit = this.getCompilerQuotas()?.max_expression_tokens
    if (limit === undefined) {
      throw new Error('Missing compiler_quotas.max_expression_tokens in operators catalog')
    }
    return limit
  }

  getExpressionQuotaWarning(): number {
    const warning = this.getCompilerQuotas()?.warning_expression_tokens
    if (warning === undefined) {
      throw new Error('Missing compiler_quotas.warning_expression_tokens in operators catalog')
    }
    return warning
  }

  getExpressionQuotaDiagnostic(): BloggerDiagnosticCode | undefined {
    return this.getCompilerQuotas()?.diagnostic
  }

  getExpressionQuotaWarningDiagnostic(): BloggerDiagnosticCode | undefined {
    return this.getCompilerQuotas()?.warning_diagnostic
  }

  getLambdaKeywords(): ReadonlySet<string> {
    const result = new Set<string>()
    for (const [opKey, opDef] of this.operatorMap.entries()) {
      if (opDef.family === 'lambda') {
        result.add(opKey)
        for (const alias of opDef.grammar_aliases || []) {
          result.add(alias)
        }
      }
    }
    return result
  }

  getProhibitedSyntaxDiagnostic(key: 'js_methods' | 'js_equality_operators'): BloggerDiagnosticCode {
    const operatorsData = this.store.getCatalog('operators') as any
    const code = operatorsData?.domain_metadata?.prohibited_syntax?.[key]?.diagnostic
    if (!code) {
      throw new Error(`Prohibited syntax diagnostic '${key}' is not defined in operators catalog domain_metadata.prohibited_syntax`)
    }
    return code
  }

  getOperatorSnippet(operatorName: string, options?: OperatorSnippetOptions): string {
    const op = this.getOperator(operatorName)
    if (!op) {
      return `${operatorName}($0)`
    }

    const isSymbolic = !/^[a-z_]/i.test(operatorName)
    const preferredSyntax = options?.syntax
      ?? (op.operands?.length === 1
        ? 'prefix'
        : (op.syntax?.supports_functional && !isSymbolic ? 'functional' : (op.syntax?.supports_infix ? 'infix' : 'functional')))

    if (preferredSyntax === 'functional' && op.syntax?.supports_functional) {
      const fnName = op.syntax.functional_identifier ?? operatorName
      const operands = op.operands || []
      let tabstopIndex = 1
      const args = operands.map(o => `\${${tabstopIndex++}:${o.name}}`)
      return `${fnName}(${args.join(', ')})$0`
    }

    if (op.family === 'lambda') {
      const collectionName = op.operands?.[0]?.name ?? 'items'
      const varName = 'item'
      const condition = 'condition'
      return `\${1:${collectionName}} ${operatorName} (\${2:${varName}} => \${3:${condition}})$0`
    }

    if (op.operands && op.operands.length === 1) {
      const operandName = op.operands[0]?.name ?? 'expression'
      const sep = /^[a-z]/i.test(operatorName) ? ' ' : ''
      return `${operatorName}${sep}\${1:${operandName}}$0`
    }

    const left = op.operands?.[0]?.name ?? 'left'
    const right = op.operands?.[1]?.name ?? 'right'
    return `\${1:${left}} ${operatorName} \${2:${right}}$0`
  }
}
