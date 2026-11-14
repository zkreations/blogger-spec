---
title: API
description: Complete TypeScript API reference for BloggerSpec functions, types, and modular subpath packages.
icon: terminal
weight: 60
---

Comprehensive TypeScript programmatic API reference for `@hamlet/blogger-spec`. The package is published as a zero-dependency universal ESM library compatible across modern browsers, Edge runtimes, Cloudflare Workers, and Node.js environments.

## Package Architecture

BloggerSpec provides a layered export architecture:

- **Root Export (`blogger-spec`):** High-level entry point providing the primary parsing, evaluation, and context-resolution APIs. Zero runtime dependencies and 100% browser-safe.
- **Modular Subpaths (`blogger-spec/*`):** Fine-grained exports allowing bundlers to tree-shake and import only specific subsystems (such as AST types or lexical scopes).
- **Filesystem Subpath (`blogger-spec/node`):** Node.js specific loaders (`FsCatalogStore`) that read catalog JSON files dynamically from disk.

## Entry Points Reference

| Entry Point | Primary Interfaces & Functions | Target Environment |
| :--- | :--- | :--- |
| `blogger-spec` | `parseTemplate`, `parseExpression`, `evaluateExpression`, `resolveBloggerContext` | Universal |
| `blogger-spec/ast` | `BloggerDocumentNode`, `BloggerDirectiveNode`, `BloggerExpressionNode` | Universal |
| `blogger-spec/ir` | `lowerTemplate`, `compileToIR`, `BirSkinStyle`, `BirOutput` | Universal |
| `blogger-spec/context` | `resolveBloggerContext`, `getMockContext`, widget discovery | Universal |
| `blogger-spec/catalogs` | Master catalog store, schema validators | Universal |
| `blogger-spec/data-path` | `resolveDataPath` deep property traversal | Universal |
| `blogger-spec/scope` | `ScopeEnvironment` lexical scope stack | Universal |
| `blogger-spec/type-system` | Type ontology, platform subtypes, modifier lookup | Universal |
| `blogger-spec/node` | `FsCatalogStore`, `loadFixturesManifest` | Node.js only |

## Modules

{{< pagelink href="/docs/api/core" title="Core" description="Top-level functions: parseTemplate, parseExpression, evaluateExpression, and resolveBloggerContext" icon="box" >}}

{{< pagelink href="/docs/api/subpaths" title="Subpaths" description="Modular entry points: /ast, /ir, /context, /catalogs, /data-path, /scope, /type-system, and /node" icon="folder" >}}
