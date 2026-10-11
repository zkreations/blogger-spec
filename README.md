# blogger-spec

> The canonical single source of truth for the Blogger XML template language, expression grammar, data dictionary, and conformance suite.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Runtime Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)](package.json)

`blogger-spec` is a standalone, runtime-dependency-free package that formalizes the syntax, semantics, type ontology, directive hierarchy, operator rules, and runtime data paths of Google Blogger XML templates.

It is designed to be consumed by external tools—such as IDE extensions (VS Code), linters, template compilers, AST engines, and headless validators—ensuring that all consumers share an identical, versioned understanding of the language.

---

## Architecture Overview

```
blogger-spec/
├── catalogs/                 # Canonical Single Source of Truth (Master JSON Catalogs)
│   ├── directives.json       # b:* tags, attributes, required flags, types, self-closing
│   ├── operators.json        # Operators, precedence hierarchy, arity, dual syntax
│   ├── types.json            # Primitive types, composite collections, coercion matrix
│   ├── widgets.json          # Widget definitions and schema declarations
│   ├── settings.json         # Widget settings configuration dictionaries
│   ├── globals.json          # Global data objects (data:blog, data:view, data:skin...)
│   ├── messages.json         # Localized UI string definitions (data:messages.*)
│   ├── scopes.json           # Variable scope resolution rules & precedence
│   ├── diagnostics.json      # Diagnostic compiler/linter rules (BX1001+)
│   └── schemas/              # JSON Schemas Draft 2020-12 for each catalog
├── fixtures/                 # Empirical test fixtures (discriminated union format)
│   ├── expressions/          # Expression evaluation cases & edge cases
│   ├── templates/            # Rendering and scoping fixtures
│   ├── diagnostics/          # Negative fixtures (code Blogger server rejects)
│   └── index.json            # Consolidated manifest (compiled via build)
├── src/                      # Spec modules, runtime helpers, and tooling
│   ├── ast.ts                # Formal AST specification interfaces
│   ├── catalogs/             # Typed CatalogStore and SpecCatalog domain models
│   ├── helpers.ts            # Zero-runtime-dependency query & validation utilities
│   ├── paths.ts              # Workspace path resolution utilities
│   ├── runner.ts             # Conformance harness engine
│   ├── tooling/              # Build pipeline, schema validator, and compiler
│   ├── types.ts              # Canonical models, catalog types, and fixture interfaces
│   └── index.ts              # Canonical root package entry point
└── dist/                     # Distribution package artifacts (zero runtime dependencies)
    ├── index.js / index.d.ts # Canonical entry point and TypeScript types
    ├── ast.js / ast.d.ts     # AST interfaces
    ├── helpers.js / .d.ts    # Spec query helpers
    └── runner.js / .d.ts     # Conformance harness
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
// Query helpers & canonical AST nodes
import type { BloggerDirectiveName, BloggerFixture } from 'blogger-spec'
import type { BloggerDirectiveNode, BloggerExpressionNode } from 'blogger-spec/ast'
import {
  getDiagnosticRule,
  isDirective,
  validateDirectiveAttributes,
} from 'blogger-spec/helpers'
```

Or import raw JSON catalogs directly:

```typescript
import diagnostics from 'blogger-spec/diagnostics'
import directives from 'blogger-spec/directives'
import operators from 'blogger-spec/operators'
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
