# `@bloggerspec/spec`

> Canonical specification, data catalogs, AST parser, BIR v2 compiler, and conformance runner for the Blogger XML template language.

Zero runtime dependencies (`dependencies: {}`) and Universal ESM (browser, Node.js, Cloudflare Workers, Web Workers).

## Installation

```bash
pnpm add @bloggerspec/spec
```

## Subpath Exports

| Subpath | Purpose |
| :--- | :--- |
| `@bloggerspec/spec` | Root barrel export (catalogs, AST, parser, evaluator, IR, context). |
| `@bloggerspec/spec/ast` | `parseTemplate` and `parseExpression` (Pratt parser, `maxDepth: 50`). |
| `@bloggerspec/spec/parser` | Lexer, `evaluateExpression`, directive scanner, structure/expression validators (`BX1001`–`BX1062`). |
| `@bloggerspec/spec/quota` | Expression token budget checker (`BX1021`, 40-token limit). |
| `@bloggerspec/spec/type-system` | Assignability, modifiers, skin modifiers, and type inference. |
| `@bloggerspec/spec/data-path` | `resolveDataPath` across globals, widgets, types, scopes, and skin variables. |
| `@bloggerspec/spec/scope` | `ScopeEnvironment` stack (`lambda → loop → with → includable → widget → global`). |
| `@bloggerspec/spec/version` | Layout version detection (v1, v2, v3). |
| `@bloggerspec/spec/context` | `resolveBloggerContext`, Atom feed normalizer, `formatIcuDate`, URL mapper, dynamic widgets. |
| `@bloggerspec/spec/ir` | BIR v2 lowering (`compileToIR`, `serializeIR`, `parseIR`). |
| `@bloggerspec/spec/catalogs` | Query facade, `getMockContext`, and snippet generators. |
| `@bloggerspec/spec/runner` | Universal `runConformance` and `normalizeHtmlString`. |
| `@bloggerspec/spec/node` | Node-only helpers (`FsCatalogStore`, `loadFixturesManifest`, `getWorkspacePaths`). |

Raw JSON catalogs (`@bloggerspec/spec/directives`, `.../operators`, etc.) and Draft 2020-12 schemas (`@bloggerspec/spec/schemas/*`) are also exported directly.

## Quick Usage

```typescript
import { compileToIR, evaluateExpression, parseExpression, resolveBloggerContext } from '@bloggerspec/spec'

// 1. Parse and evaluate expressions
const ast = parseExpression('data:posts filter (p => p.labels any (l => l.name == "News"))')
const matches = evaluateExpression(ast, { posts: [{ labels: [{ name: 'News' }] }] })

// 2. Resolve offline mock or live context
const ctx = await resolveBloggerContext({ offline: true, view: 'homepage' })

// 3. Lower Blogger XML template into BIR v2
const ir = compileToIR('<html b:layoutsVersion="3"><body><b:section id="main"/></body></html>')
```

## Conformance Testing

```typescript
import { loadFixturesManifest } from '@bloggerspec/spec/node'
import { runConformance } from '@bloggerspec/spec/runner'

const report = runConformance(engineAdapter, {
  fixtures: loadFixturesManifest().fixtures,
})
```

## License

Code and tooling: MIT. Catalog metadata, schemas, and fixtures: CC0 1.0.
