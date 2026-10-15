# blogger-spec

> The canonical single source of truth for the Blogger XML template language, expression grammar, data dictionary, type system, and conformance suite.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Runtime Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)](package.json)

`blogger-spec` is a standalone, runtime-dependency-free specification authority and execution engine that formalizes the syntax, semantics, type ontology, directive grammar, operator precedence hierarchy, token compiler quotas, and runtime data paths of Google Blogger XML templates.

It is designed to be consumed by external tools—such as IDE extensions (VS Code), linters, template compilers, AST engines, and headless validators—ensuring that all consumers share an identical, versioned understanding of the language.

---

## Key Capabilities

1. **10 Canonical JSON Catalogs**: Machine-readable single source of truth (Draft 2020-12 schemas) for directives, operators, types, widgets, settings, globals, messages, scopes, diagnostics, and system inclusions.
2. **Zero-Dependency Pratt Expression Parser (`blogger-spec/ast`)**: Formally parses Blogger expression DSL into structured AST nodes (`BloggerExpressionNode`), respecting dual syntax (infix and functional), collection lambdas, dynamic bracket indexing, and 10 levels of operator precedence.
3. **Compiler Token Quota Calculator (`blogger-spec/quota`)**: Exact token counting and budget evaluation against the Blogger compiler's strict 40-token ceiling (`BX1021`).
4. **Canonical Type System & Coercion Engine (`blogger-spec/type-system`)**: Subtype assignability, modifier inheritance (preserving flat hierarchy and isolating `skin:*` theme variables), operator compatibility, and return type inference.
5. **Universal ESM & Browser Ready**: Pure in-memory catalog store by default with zero Node.js built-in dependencies (`fs`, `path`). Works seamlessly in browsers, Node.js, Cloudflare Workers, and Web Workers.
6. **Empirical Conformance Suite**: Automated test harness validating against 175+ empirical test fixtures verified on live Blogger production engines.

---

## Architecture Overview

```
blogger-spec/
├── catalogs/                 # Canonical Single Source of Truth (10 Master JSON Catalogs)
│   ├── directives.json       # b:* tags, attributes, required flags, types, self-closing
│   ├── operators.json        # Operators, precedence hierarchy, dual syntax, token costs
│   ├── types.json            # Primitive types, composite collections, coercion matrix
│   ├── widgets.json          # Widget definitions, schema declarations, allowed sections
│   ├── settings.json         # Widget settings configuration dictionaries
│   ├── globals.json          # Global data objects (data:blog, data:view, data:skin...)
│   ├── messages.json         # Localized UI string definitions (data:messages.*)
│   ├── scopes.json           # Variable scope resolution rules & precedence
│   ├── diagnostics.json      # Diagnostic compiler/linter rules (BX1001+)
│   ├── inclusions.json       # System inclusions, layouts versions 1-3, super.* prefix
│   └── schemas/              # JSON Schemas Draft 2020-12 for each catalog
├── fixtures/                 # Empirical test fixtures (discriminated union format)
│   ├── expressions/          # Expression evaluation cases & edge cases
│   ├── templates/            # Rendering and scoping fixtures
│   ├── diagnostics/          # Negative fixtures (code Blogger server rejects)
│   └── index.json            # Consolidated manifest (compiled via build)
├── src/                      # Spec modules, runtime helpers, and tooling
│   ├── ast.ts                # Formal AST specification interfaces & parser exports
│   ├── parser/               # Zero-runtime-dependency Pratt expression parser
│   │   ├── lexer.ts          # Deterministic lexer with XML entity decoding & loc tracking
│   │   └── expr-parser.ts    # Pratt parser guided by operators.json precedence hierarchy
│   ├── quota.ts              # Canonical token quota calculator (BX1021 rules)
│   ├── type-system.ts        # Type assignability, modifiers, operators, and truthiness
│   ├── catalogs/             # Typed CatalogStore and SpecCatalog domain models
│   ├── helpers.ts            # Zero-runtime-dependency query & validation facade
│   ├── paths.ts              # Workspace path resolution utilities
│   ├── runner.ts             # Conformance harness engine
│   ├── tooling/              # Build pipeline, schema validator, and compiler
│   ├── types.ts              # Canonical models, catalog types, and fixture interfaces
│   └── index.ts              # Canonical root package entry point
└── dist/                     # Distribution package artifacts (zero runtime dependencies)
    ├── index.js / .d.ts      # Canonical entry point and TypeScript types
    ├── ast.js / .d.ts        # AST interfaces and parseExpression
    ├── quota.js / .d.ts      # Token quota calculator and budget evaluator
    ├── type-system.js / .d.ts# Type assignability, modifiers, and operator compatibility
    ├── helpers.js / .d.ts    # Unified spec query helpers
    ├── runner.js / .d.ts     # Conformance harness
    └── catalogs/fs-store.js  # Node.js filesystem catalog store (optional)
```

---

## Installation & Consumption

```bash
pnpm add blogger-spec
# or
npm install blogger-spec
```

### Subpath Imports

Consume only what your tool requires:

```typescript
import type { BloggerExpressionNode } from 'blogger-spec/ast'
// 1. Pratt Expression Parser & AST Types
import { parseExpression, tokenize } from 'blogger-spec/ast'

// 4. Query Helpers & Validation Facade
import {
  getDiagnosticRule,
  getDirective,
  isDirective,
  isOperator,
  validateDirectiveAttributes,
} from 'blogger-spec/helpers'

// 5. Node.js Filesystem Catalog Store (Optional, Node-only)
import { FsCatalogStore } from 'blogger-spec/node'

// 3. Token Quota Calculator (BX1021)
import {
  COMPILER_QUOTA_LIMIT,
  countExpressionTokens,
  evaluateExpressionBudget,
} from 'blogger-spec/quota'

// 2. Type System & Modifiers
import {
  getTypeModifiers,
  isTruthy,
  isTypeAssignable,
  resolveOperatorReturnType,
} from 'blogger-spec/type-system'
```

Or import raw JSON catalogs directly:

```typescript
import diagnostics from 'blogger-spec/diagnostics'
import directives from 'blogger-spec/directives'
import inclusions from 'blogger-spec/inclusions'
import operators from 'blogger-spec/operators'
import types from 'blogger-spec/types'
```

---

## Quick Usage Examples

### 1. Parsing Blogger Expressions

```typescript
import { parseExpression } from 'blogger-spec/ast'

const ast = parseExpression('data:posts filter (p => p.id == 1) take 5')
// Parses into a canonical AST tree respecting dual syntax, lambdas, and precedence:
// BinaryExpression (take)
// ├── left: LambdaExpression (filter)
// └── right: Literal (5)
```

### 2. Evaluating Expression Token Budget (`BX1021`)

The Blogger compiler aborts with `BX1021` if an expression exceeds **40 compilation tokens**:

```typescript
import { evaluateExpressionBudget } from 'blogger-spec/quota'

const budget = evaluateExpressionBudget('data:posts[0].labels[0].name ?: "Default"')
console.log(budget)
// {
//   totalTokens: 5,
//   isValid: true,
//   status: 'SAFE', // 'SAFE' | 'WARNING' (>=36) | 'EXCEEDED' (>40)
//   recommendation: 'SAFE: Expression consumes 5/40 tokens.'
// }
```

### 3. Type Checking & Member Modifiers

```typescript
import { getTypeModifiers, isTypeAssignable } from 'blogger-spec/type-system'

// Specialized subtypes inherit string members:
isTypeAssignable('image', 'string') // true
const imageMods = getTypeModifiers('image')
// { isResizable: ..., length: ..., escaped: ... }

// Skin variables (b:skin) are strictly isolated from template string hierarchy:
isTypeAssignable('skin:color', 'string') // false
const colorMods = getTypeModifiers('skin:color')
// { red: ..., green: ..., blue: ..., alpha: ... } (no .length or .escaped)
```

---

## Conformance Test Harness

To verify that your parser, evaluator, or linter conforms to the Blogger specification:

```typescript
import { runSpecConformance } from 'blogger-spec/runner'

const results = runSpecConformance({
  evaluateExpression(expr, context) {
    return myEngine.eval(expr, context)
  },
  renderTemplate(template, context) {
    return myEngine.render(template, context)
  },
  analyze(source, mode) {
    return myLinter.lint(source)
  },
})

console.log(`Passed ${results.passed} / ${results.total} fixtures.`)
```

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our single source of truth architecture, empirical fixture requirements, and the verification pipeline (`pnpm run test:spec`).

---

## Acknowledgments

Special credit and recognition to **Soraya Lambrechts** and [bloggercode.orbiona.com](https://bloggercode.orbiona.com). Her pioneering and comprehensive documentation of the Blogger XML template and expression language provided the foundational starting point for this project, which was subsequently verified and expanded through empirical testing against the production Blogger engine.

---

## License

Code and tooling: [MIT](LICENSE).  
Catalog metadata, schemas, and test fixtures: [CC0 1.0 Universal](LICENSE).
