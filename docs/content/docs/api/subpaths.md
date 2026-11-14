---
title: Subpaths
description: Specialized entry points and subpath exports for tree-shaking and targeted imports.
weight: 2
---

BloggerSpec provides fine-grained, modular subpath exports that allow bundlers to tree-shake unused code and import only specific subsystems, such as AST types, intermediate representations, or lexical scoping.

| Subpath | Scope & Primary Exports | Environment |
| :--- | :--- | :--- |
| `blogger-spec/ast` | AST node interfaces (`BloggerDocumentNode`, `BloggerDirectiveNode`). | Universal |
| `blogger-spec/ir` | BIR v2 structures, lowering utilities (`lowerTemplate`, `compileToIR`). | Universal |
| `blogger-spec/context` | Context resolution (`resolveBloggerContext`, `getMockContext`). | Universal |
| `blogger-spec/catalogs` | In-memory access to the 11 catalogs and Draft 2020-12 schemas. | Universal |
| `blogger-spec/data-path` | Deep property traversal engine (`resolveDataPath`). | Universal |
| `blogger-spec/scope` | Lexical scope stack (`ScopeEnvironment`). | Universal |
| `blogger-spec/type-system` | Type hierarchy, modifiers, and Theme Designer isolation. | Universal |
| `blogger-spec/quota` | Expression complexity token budget calculators. | Universal |
| `blogger-spec/node` | Node.js filesystem loaders (`FsCatalogStore`, `loadFixturesManifest`). | Node.js only |
