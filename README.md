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
3. **Fault-Tolerant XML Directive Scanner (`blogger-spec/parser`)**: Lexical tokenizer and attribute parser specifically designed for Blogger XML directives (`<b:...>`, `<data:...>`, `<Variable...>`), expressions containing relational operators (`>`), CDATA skin variables, and real-time unclosed tag stack tracking.
4. **Layout Versions Authority (`blogger-spec/version`)**: Formal specification and deterministic engine to detect Blogger template layout architecture (Layouts v1, v2, v3) from raw XML documents.
5. **Compiler Token Quota Calculator (`blogger-spec/quota`)**: Exact token counting and budget evaluation against the Blogger compiler's strict 40-token ceiling (`BX1021`).
6. **Canonical Type System & Coercion Engine (`blogger-spec/type-system`)**: Subtype assignability, modifier inheritance (preserving flat hierarchy and isolating `skin:*` theme variables), operator compatibility, and return type inference.
7. **Declarative Structural Validation & Spec Catalogs (`blogger-spec/catalogs` & `blogger-spec/parser`)**: High-level validation utilities (`validateTemplateStructure`, `canNest`, `validateDirectiveNesting`) evaluating hierarchy rules, symbolic grammar groups (`@flow_instructions`, `@flow_containers`), and declarative recovery policies (`reject`, `strip`, `ignore`) against official compiler diagnostics (`BX1001-BX1040`).
8. **Universal ESM & Browser Ready**: Pure in-memory catalog store by default with zero Node.js built-in dependencies (`fs`, `path`). Works seamlessly in browsers, Node.js, Cloudflare Workers, and Web Workers.
9. **Empirical Conformance Suite**: Automated test harness validating against 185+ empirical test fixtures verified on live Blogger production engines.

---

## Architecture Overview

```
blogger-spec/
├── catalogs/                 # Canonical Single Source of Truth (10 Master JSON Catalogs)
│   ├── directives.json       # b:* tags, attributes, required flags, types, layout_versions
│   ├── operators.json        # Operators, precedence hierarchy, dual syntax, token costs
│   ├── types.json            # Primitive types, composite collections, coercion matrix
│   ├── widgets.json          # Widget definitions, schema declarations, allowed sections
│   ├── settings.json         # Widget settings configuration dictionaries
│   ├── globals.json          # Global data objects (data:blog, data:view, data:skin...)
│   ├── messages.json         # Localized UI string definitions (data:messages.*)
│   ├── scopes.json           # Variable scope resolution rules & precedence
│   ├── diagnostics.json      # Diagnostic compiler/linter rules (BX1001-BX1040)
│   ├── inclusions.json       # System inclusions, layouts versions 1-3, super.* prefix
│   └── schemas/              # JSON Schemas Draft 2020-12 for each catalog
├── fixtures/                 # Empirical test fixtures (discriminated union format)
│   ├── expressions/          # Expression evaluation cases & edge cases
│   ├── templates/            # Rendering and scoping fixtures
│   ├── diagnostics/          # Negative fixtures (code Blogger server rejects)
│   └── index.json            # Consolidated manifest (compiled via build)
├── src/                      # Spec modules, runtime helpers, and tooling
│   ├── ast.ts                # Formal AST specification interfaces & parser exports
│   ├── parser/               # Parsers, tokenizers, and structural validator
│   │   ├── lexer.ts          # Deterministic expression lexer with loc tracking
│   │   ├── expr-parser.ts    # Pratt parser guided by operators.json precedence
│   │   ├── directive-scanner.ts # Fault-tolerant XML directive & tag tokenizer
│   │   └── template-validator.ts # Directive nesting & structural template validator
│   ├── version.ts            # Canonical template layout version detector (v1, v2, v3)
│   ├── quota.ts              # Canonical token quota calculator (BX1021 rules)
│   ├── type-system.ts        # Type assignability, modifiers, operators, and truthiness
│   ├── catalogs/             # Typed CatalogStore, SpecCatalog, and query functions
│   ├── paths.ts              # Workspace path resolution utilities
│   ├── runner.ts             # Conformance harness engine
│   ├── tooling/              # Build pipeline, schema validator, and compiler
│   ├── types.ts              # Canonical models, catalog types, and fixture interfaces
│   └── index.ts              # Canonical root package entry point
└── dist/                     # Distribution package artifacts (zero runtime dependencies)
    ├── index.js / .d.ts      # Canonical entry point and TypeScript types
    ├── ast.js / .d.ts        # AST interfaces and parseExpression
    ├── parser/               # Parser, directive scanner, and validator
    │   └── index.js / .d.ts
    ├── version.js / .d.ts    # Template layout version detection
    ├── quota.js / .d.ts      # Token quota calculator and budget evaluator
    ├── type-system.js / .d.ts# Type assignability, modifiers, and operator compatibility
    ├── catalogs/             # Spec catalog models, store, and query functions
    │   └── index.js / .d.ts
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
// 1. Pratt Expression Parser & AST Types
import { parseExpression, tokenize } from 'blogger-spec/ast'

// Spec Catalogs & Query Helpers
import {
  getDiagnosticRule,
  getDirective,
  getThemeDesignerDescriptions,
  isDirective,
  isOperator,
} from 'blogger-spec/catalogs'

// 7. Node.js Filesystem Catalog Store (Optional, Node-only)
import { FsCatalogStore } from 'blogger-spec/node'

// 2. Structural Validation & Directive Scanning
import {
  canNest,
  getNearestUnclosedDirective,
  getUnclosedDirectiveStack,
  isStrictlySelfClosingTag,
  scanDirectiveTokens,
  validateDirectiveNesting,
  validateTemplateStructure,
} from 'blogger-spec/parser'

// 4. Token Quota Calculator (BX1021)
import {
  COMPILER_QUOTA_LIMIT,
  countExpressionTokens,
  evaluateExpressionBudget,
} from 'blogger-spec/quota'

// 5. Type System & Modifiers
import {
  getTypeModifiers,
  isTruthy,
  isTypeAssignable,
  resolveOperatorReturnType,
} from 'blogger-spec/type-system'

// 3. Template Layout Versions Authority
import {
  detectTemplateVersion,
  getLayoutVersionsSpec,
} from 'blogger-spec/version'
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

### 4. Scanning Directives & Tracking Unclosed Tag Stacks

```typescript
import {
  getNearestUnclosedDirective,
  getUnclosedDirectiveStack,
  scanDirectiveTokens,
} from 'blogger-spec/parser'

const xml = `
  <b:section id='main'>
    <b:widget id='Blog1' type='Blog'>
      <b:includable id='main'>
        <b:if cond='data:view.isPost and 5 > 2'>
          <p>Hello</p>
`

// Tokenizes XML directives with exact character offsets and attribute ranges
const tokens = scanDirectiveTokens(xml)

// Real-time unclosed directive stack for autocomplete and diagnostics:
const stack = getUnclosedDirectiveStack(xml)
// ['b:section', 'b:widget', 'b:includable', 'b:if']
const nearest = getNearestUnclosedDirective(xml) // 'b:if'
```

### 5. Detecting Template Layout Versions

```typescript
import { detectTemplateVersion } from 'blogger-spec/version'

const result = detectTemplateVersion('<html b:layoutsVersion="3">...</html>')
// {
//   version: 3,
//   confidence: 'explicit',
//   detectedFeatures: ['b:layoutsVersion="3"'],
//   summary: 'Explicitly declared Layouts v3 via b:layoutsVersion="3"'
// }
```

### 6. Validating Template Structure & Nesting

```typescript
import { canNest, validateDirectiveNesting, validateTemplateStructure } from 'blogger-spec/parser'

// Boolean hierarchy check
canNest('b:section', 'b:widget') // true
canNest('div', 'b:section') // true (HTML layout containers in body)
canNest('head', 'b:section') // false
canNest('b:template-skin', 'Variable') // false (skin variables exclusive to b:skin)

// Immediate hierarchy violation details
const violation = validateDirectiveNesting('b:section', 'b:section')
// Returns DirectiveNestingViolation:
// {
//   code: 'BX1035',
//   action: 'reject', // 'reject' | 'strip' | 'ignore'
//   message: 'Tag <b:section> is not permitted inside <b:section>.',
//   rule: { name: 'NESTED_SECTION', severity: 'error', ... }
// }

// Comprehensive template structural audit
const diagnostics = validateTemplateStructure(`
  <b:section id='main'>
    <b:widget id='wid1' type='Blog'/>
    <b:section id='nested'/>
  </b:section>
`)
// Emits canonical diagnostics:
// [ { code: 'BX1035', rule: { name: 'NESTED_SECTION' }, ... } ]
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
