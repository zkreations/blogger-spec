# blogger-spec

> Specification, data catalogs, and runtime tooling for the Blogger XML template language.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Runtime Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)](package.json)

`blogger-spec` is a standalone package that formalizes the syntax, semantics, type system, directive grammar, operator precedence, token compiler quotas, and runtime data paths of Google Blogger XML templates.

It is designed to be consumed by external tools — IDE extensions, linters, template compilers, AST engines, and validators — so that all consumers share an identical, versioned understanding of the language.

---

## Modules

- **10 JSON catalogs** — machine-readable definitions (Draft 2020-12 schemas) for directives, operators, types, widgets, settings, globals, messages, scopes, diagnostics, and system inclusions.
- **`blogger-spec/ast`** — Pratt expression parser producing structured AST nodes (`BloggerExpressionNode`), supporting dual syntax (infix and functional), collection lambdas, dynamic bracket indexing, and 10 levels of operator precedence. Includes recursion limit protection (`maxDepth: 50`).
- **`blogger-spec/parser`** — Lexical tokenizer and attribute parser for Blogger XML directives (`<b:...>`, `<data:...>`, `<Variable...>`), expressions containing relational operators (`>`), CDATA skin variables, and unclosed tag stack tracking.
- **`blogger-spec/version`** — Detects Blogger template layout architecture (Layouts v1, v2, v3) from raw XML.
- **`blogger-spec/quota`** — Token counting and budget evaluation against the Blogger compiler's 40-token ceiling (`BX1021`).
- **`blogger-spec/type-system`** — Subtype assignability, modifier inheritance, Theme Designer skin modifiers (`getSkinTypeModifiers`), operator compatibility, and expression return type inference with widget scope support.
- **`blogger-spec/data-path`** — Data path resolution (`resolveDataPath`) across globals, widget dictionaries, platform types, localized messages, scoped variables, and Theme Designer skin variables (`skinVariables`, `toSkinVarIdentifier`), including collection unwrapping (`[0]`, `.first`, `.last`) and type modifiers (`.escaped`, `.canonical`, `.length`).
- **`blogger-spec/scope`** — Compiler symbol table and scope stack (`ScopeEnvironment`) with canonical resolution precedence (`lambda` → `loop` → `with` → `includable` → `widget` → `global`) and variable shadowing.
- **`blogger-spec/catalogs`** — Snippet generators (`getDirectiveSnippet`, `getOperatorSnippet`) with tabstops, enforcing single quotes for template directives and double quotes for skin variables.

No Node.js built-in dependencies (`fs`, `path`). Works in browsers, Node.js, Cloudflare Workers, and Web Workers.

---

## Architecture

```
blogger-spec/
├── catalogs/                 # JSON catalogs
│   ├── directives.json       # b:* tags, attributes, required flags, types, layout_versions
│   ├── operators.json        # Operators, precedence, dual syntax, token costs
│   ├── types.json            # Primitive types, composite collections, coercion matrix
│   ├── widgets.json          # Widget definitions, schema declarations, allowed sections
│   ├── settings.json         # Widget settings configuration
│   ├── globals.json          # Global data objects (data:blog, data:view, data:skin...)
│   ├── messages.json         # Localized UI string definitions (data:messages.*)
│   ├── scopes.json           # Variable scope resolution rules and precedence
│   ├── diagnostics.json      # Diagnostic rules (BX1001-BX1049)
│   ├── inclusions.json       # System inclusions, layout versions 1-3, super.* prefix
│   └── schemas/              # JSON Schemas Draft 2020-12 for each catalog
├── fixtures/                 # Test fixtures verified against the production Blogger engine
│   ├── expressions/          # Expression evaluation cases and edge cases
│   ├── templates/            # Rendering and scoping fixtures
│   ├── diagnostics/          # Negative fixtures (templates the Blogger server rejects)
│   └── index.json            # Consolidated manifest (compiled via build)
├── src/
│   ├── index.ts              # Root package entry point
│   ├── ast.ts                # AST interfaces and parser exports
│   ├── data-path.ts          # Data path navigator (resolveDataPath)
│   ├── scope.ts              # ScopeEnvironment symbol table and scope stack
│   ├── parser/
│   │   ├── lexer.ts          # Expression lexer with location tracking
│   │   ├── expr-parser.ts    # Pratt parser guided by operators.json precedence
│   │   ├── directive-scanner.ts # XML directive and tag tokenizer
│   │   └── template-validator.ts # Directive nesting and structural validator
│   ├── version.ts            # Template layout version detector (v1, v2, v3)
│   ├── quota.ts              # Token quota calculator (BX1021)
│   ├── type-system.ts        # Type assignability, modifiers, operators, and truthiness
│   ├── catalogs/             # CatalogStore, SpecCatalog, and query functions
│   ├── paths.ts              # Workspace path resolution utilities
│   ├── runner.ts             # Conformance harness engine
│   ├── tooling/              # Build pipeline, schema validator, and compiler
│   └── types.ts              # Models, catalog types, and fixture interfaces
└── dist/                     # Distribution artifacts (no runtime dependencies)
    ├── index.js / .d.ts
    ├── ast.js / .d.ts
    ├── data-path.js / .d.ts
    ├── scope.js / .d.ts
    ├── parser/
    │   └── index.js / .d.ts
    ├── version.js / .d.ts
    ├── quota.js / .d.ts
    ├── type-system.js / .d.ts
    ├── catalogs/
    │   └── index.js / .d.ts
    ├── runner.js / .d.ts
    └── catalogs/fs-store.js  # Optional Node.js filesystem catalog store
```

---

## Installation

```bash
pnpm add blogger-spec
# or
npm install blogger-spec
```

### Root package imports

```typescript
import {
  catalogs,
  detectTemplateVersion,
  evaluateExpressionBudget,
  getDirectives,
  getDirectiveSnippet,
  getOperatorSnippet,
  getSkinTypeModifiers,
  getSpecCatalog,
  inferExpressionType,
  isTypeAssignable,
  parseExpression,
  resolveDataPath,
  scanDirectiveTokens,
  ScopeEnvironment,
  toSkinVarIdentifier,
  validateExpression,
  validateTemplateExpressions,
  validateTemplateStructure,
} from 'blogger-spec'
```

### Subpath imports

```typescript
import type { BloggerStructureDiagnostic, DirectiveNestingViolation } from 'blogger-spec/parser'

// Expression parser and AST types
import { parseExpression, tokenize } from 'blogger-spec/ast'

// Catalogs, query helpers, and snippet generators
import {
  getDiagnosticRule,
  getDirective,
  getDirectiveSnippet,
  getOperatorSnippet,
  getThemeDesignerDescriptions,
  isDirective,
  isOperator,
} from 'blogger-spec/catalogs'

// Data path navigation and skin variable normalization
import { resolveDataPath, toSkinVarIdentifier } from 'blogger-spec/data-path'

// Node.js filesystem catalog store (optional, Node-only)
import { FsCatalogStore } from 'blogger-spec/node'
// Structural validation, expression auditing, and directive scanning
import {

  canNest,

  getNearestUnclosedDirective,
  getUnclosedDirectiveStack,
  isStrictlySelfClosingTag,
  scanDirectiveTokens,
  validateDirectiveNesting,
  validateExpression,
  validateTemplateExpressions,
  validateTemplateStructure
} from 'blogger-spec/parser'

// Token quota calculator (BX1021)
import {
  COMPILER_QUOTA_LIMIT,
  countExpressionTokens,
  evaluateExpressionBudget,
} from 'blogger-spec/quota'

// Scope environment and symbol table
import { ScopeEnvironment } from 'blogger-spec/scope'

// Type system, modifiers, and type inference
import {
  getSkinTypeModifiers,
  getTypeModifiers,
  inferExpressionType,
  isTruthy,
  isTypeAssignable,
  resolveModifierReturnType,
  resolveOperatorReturnType,
} from 'blogger-spec/type-system'

// Layout version detection
import {
  detectTemplateVersion,
  getLayoutVersionsSpec,
} from 'blogger-spec/version'
```

Raw JSON catalogs can also be imported directly:

```typescript
import diagnostics from 'blogger-spec/diagnostics' with { type: 'json' }
import directives from 'blogger-spec/directives' with { type: 'json' }
import inclusions from 'blogger-spec/inclusions' with { type: 'json' }
import operators from 'blogger-spec/operators' with { type: 'json' }
import types from 'blogger-spec/types' with { type: 'json' }
```

### Exports by subpath

| Subpath | Key exports | Description |
| :--- | :--- | :--- |
| `blogger-spec/ast` | `parseExpression`, `tokenize`, `ExpressionParser` | Pratt parser and lexer producing expression ASTs (`BloggerExpressionNode`). |
| `blogger-spec/data-path` | `resolveDataPath`, `toSkinVarIdentifier` | Member traversal across globals, widget dictionaries, platform types, variables, and Theme Designer skin variables (`data:skin.vars.*`). |
| `blogger-spec/scope` | `ScopeEnvironment` | Compiler symbol table and scope stack with canonical precedence and variable shadowing. |
| `blogger-spec/parser` | `scanDirectiveTokens`, `validateTemplateStructure`, `validateTemplateExpressions`, `validateExpression`, `validateDirectiveNesting`, `canNest`, `BloggerStructureDiagnostic` | Directive scanner, structural validator, expression attribute auditor, and automated QuickFix provider (`BX1001-BX1049`). |
| `blogger-spec/quota` | `evaluateExpressionBudget`, `countExpressionTokens`, `tokenizeExpression`, `COMPILER_QUOTA_LIMIT` | Token quota calculator and budget evaluator against the 40-token compiler ceiling (`BX1021`). |
| `blogger-spec/type-system` | `isTypeAssignable`, `getTypeModifiers`, `getSkinTypeModifiers`, `resolveModifierReturnType`, `resolveOperatorReturnType`, `inferExpressionType`, `isTruthy` | Type assignability, modifier inheritance, Theme Designer skin modifiers, operator return type inference, and expression type deduction. |
| `blogger-spec/version` | `detectTemplateVersion`, `getLayoutVersionsSpec` | Template layout architecture detector (v1, v2, v3). |
| `blogger-spec/catalogs` | `getSpecCatalog`, `SpecCatalog`, `MemoryCatalogStore`, `getDirectiveSnippet`, `getOperatorSnippet`, `isDirective`, `isOperator`, `getDiagnostic` | Specification query facade, attribute validation, snippet generators, and in-memory catalog store. |
| `blogger-spec/runner` | `runSpecConformance`, `runConformance` | Test harness to validate engine conformance against empirical fixtures. |
| `blogger-spec/node` | `FsCatalogStore`, `getCatalogsDirectory`, `getSchemasDirectory` | Filesystem-based catalog store for Node.js environments. |
| `blogger-spec/<domain>` | `directives`, `operators`, `types`, `widgets`, `settings`, `globals`, etc. | Direct access to JSON catalogs and Draft 2020-12 schemas (`blogger-spec/schemas/*`). |

---

## Usage Examples

### 1. Parsing expressions

```typescript
import { parseExpression } from 'blogger-spec/ast'

const ast = parseExpression('data:posts filter (p => p.id == 1) take 5')
// BinaryExpression (take)
// ├── left: LambdaExpression (filter)
// └── right: Literal (5)
```

### 2. Evaluating expression token budget (`BX1021`)

The Blogger compiler aborts with `BX1021` if an expression exceeds 40 compilation tokens:

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

### 3. Type checking and member modifiers

```typescript
import { getSkinTypeModifiers, getTypeModifiers, isTypeAssignable } from 'blogger-spec/type-system'

isTypeAssignable('image', 'string') // true
const imageMods = getTypeModifiers('image')
// { isResizable: ..., length: ..., escaped: ... }

// Skin variables (b:skin) are isolated from the template string hierarchy:
isTypeAssignable('skin:color', 'string') // false
const colorMods = getTypeModifiers('skin:color')
// { red: ..., green: ..., blue: ..., alpha: ... }

// Resolve Theme Designer tag attribute types directly:
const fontMods = getSkinTypeModifiers('font')
// { family: ..., size: ... }
```

### 4. Scanning directives and tracking unclosed tags

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

const tokens = scanDirectiveTokens(xml)

const stack = getUnclosedDirectiveStack(xml)
// ['b:section', 'b:widget', 'b:includable', 'b:if']
const nearest = getNearestUnclosedDirective(xml) // 'b:if'
```

### 5. Detecting template layout versions

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

### 6. Validating template structure and nesting

```typescript
import { canNest, validateDirectiveNesting, validateTemplateStructure } from 'blogger-spec/parser'

canNest('b:section', 'b:widget') // true
canNest('div', 'b:section') // true
canNest('head', 'b:section') // false
canNest('b:template-skin', 'Variable') // false

const violation = validateDirectiveNesting('b:section', 'b:section')
// {
//   code: 'BX1035',
//   action: 'reject',
//   message: 'Tag <b:section> is not permitted inside <b:section>.',
//   rule: { name: 'NESTED_SECTION', severity: 'error', ... }
// }

const diagnostics = validateTemplateStructure(`
  <b:section id='main'>
    <b:widget id='wid1' type='Blog'/>
    <b:section id='nested'/>
  </b:section>
`)
// [ { code: 'BX1035', rule: { name: 'NESTED_SECTION' }, ... } ]
```

### 7. Data path navigation (`resolveDataPath`)

```typescript
import { resolveDataPath, toSkinVarIdentifier } from 'blogger-spec/data-path'

resolveDataPath('data:blog.url.canonical')
// { name: 'canonical', type: 'url', sourceCatalog: 'types', ... }

resolveDataPath('data:widgets.Blog1.posts[0].title')
// { name: 'title', type: 'string', sourceCatalog: 'globals', ... }

resolveDataPath('data:view.isMobile')
// { name: 'isMobile', type: 'boolean', isDeprecated: true, ... }

// With Theme Designer skin variables:
toSkinVarIdentifier('admin.name') // 'admin_name'

resolveDataPath('data:skin.vars.body_font.family', {
  skinVariables: { 'body.font': { type: 'font' } },
})
// { name: 'family', type: 'string', sourceCatalog: 'types', ... }
```

### 8. Scope tree and variable shadowing (`ScopeEnvironment`)

```typescript
import { ScopeEnvironment } from 'blogger-spec/scope'

const env = new ScopeEnvironment()
env.pushScope('widget', { widgetType: 'Blog' })
env.pushScope('loop', { symbols: { post: 'post' } })

env.resolveIdentifier('data:post') // { name: 'post', scopeType: 'loop', ... }
env.resolveIdentifier('posts') // { name: 'posts', scopeType: 'widget', ... }

// Lambda iterators prohibit the 'data:' prefix (BX1019):
env.pushScope('lambda', { symbols: { x: 'post' } })
env.resolveIdentifier('x') // { name: 'x', requiresDataPrefix: false }
env.resolveIdentifier('data:x') // undefined
```

### 9. Validating expressions in template attributes

```typescript
import { validateTemplateExpressions } from 'blogger-spec/parser'

const xml = `
  <b:if cond='data:posts === null'>
    <b:eval expr='data:posts.slice(0, 5)'/>
    <b:eval expr='data:view.isPost == "true"'/>
  </b:if>
`
const diagnostics = validateTemplateExpressions(xml)
// - BX1018: JS strict equality (===) not allowed; suggestedReplacement: '=='
// - BX1020: Prohibited 'null' literal
// - BX1017: Prohibited JavaScript native method invocation (.slice)
// - BX1038: String boolean in expression; suggestedReplacement: 'true'
```

### 10. Snippet generation

```typescript
import { getDirectiveSnippet, getOperatorSnippet } from 'blogger-spec/catalogs'

getDirectiveSnippet('b:loop')
// "<b:loop values='${1:data:items}' var='${2:item}'>\n  $0\n</b:loop>"

getOperatorSnippet('filter')
// "${1:collection} filter (${2:item} => ${3:condition})$0"

getOperatorSnippet('resizeImage')
// "resizeImage(${1:image}, ${2:size}, ${3:ratio})$0"
```

---

## Conformance test harness

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

## Empirical grounding

Catalogs and schemas do not include external documentation links. Official Blogger docs cover less than 10% of the language and promote deprecated attributes; community resources are no longer maintained. All syntax rules, diagnostics, and behaviors in this package are verified directly against the production Blogger engine via empirical fixtures (`fixtures/`).

---

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on the catalog architecture, fixture requirements, and the verification pipeline (`pnpm run test:spec`).

---

## Acknowledgments

Special credit to **Soraya Lambrechts** and [bloggercode.orbiona.com](https://bloggercode.orbiona.com), whose documentation of the Blogger XML template and expression language provided the starting point for this project.

---

## License

Code and tooling: [MIT](LICENSE).  
Catalog metadata, schemas, and test fixtures: [CC0 1.0 Universal](LICENSE).
