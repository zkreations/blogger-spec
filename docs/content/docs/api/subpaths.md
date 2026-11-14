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
| `blogger-spec/parser` | XML template parser (`parseTemplate`) and Pratt expression parser (`parseExpression`). | Universal |
| `blogger-spec/data-path` | Deep property traversal engine (`resolveDataPath`). | Universal |
| `blogger-spec/scope` | Lexical scope stack (`ScopeEnvironment`). | Universal |
| `blogger-spec/type-system` | Type hierarchy, modifiers, and Theme Designer isolation. | Universal |
| `blogger-spec/quota` | Expression complexity token budget calculators. | Universal |
| `blogger-spec/version` | Layout version detection and conformance (`detectTemplateVersion`). | Universal |
| `blogger-spec/inclusion-expander` | Server macro expansion (`expandServerInclusion`, `super.*`). | Universal |
| `blogger-spec/includable-resolver` | 6-tier ontological subroutine resolver (`resolveIncludable`). | Universal |
| `blogger-spec/skin-compiler` | Theme Designer CSS compilation and variable evaluation (`compileSkinCss`). | Universal |
| `blogger-spec/runner` | Test runner and HTML normalization utilities (`normalizeHtmlString`). | Universal |
| `blogger-spec/node` | Node.js filesystem loaders (`FsCatalogStore`, `loadFixturesManifest`). | Node.js only |
| `blogger-spec/directives` | Direct JSON catalog import for directives. | Universal |
| `blogger-spec/operators` | Direct JSON catalog import for expression operators. | Universal |
| `blogger-spec/types` | Direct JSON catalog import for platform types and modifiers. | Universal |
| `blogger-spec/widgets` | Direct JSON catalog import for widget schemas. | Universal |
| `blogger-spec/settings` | Direct JSON catalog import for widget settings. | Universal |
| `blogger-spec/globals` | Direct JSON catalog import for global objects and view matrices. | Universal |
| `blogger-spec/messages` | Direct JSON catalog import for platform messages. | Universal |
| `blogger-spec/scopes` | Direct JSON catalog import for scoping rules. | Universal |
| `blogger-spec/diagnostics` | Direct JSON catalog import for diagnostics registry (BX1001-BX1062). | Universal |
| `blogger-spec/inclusions` | Direct JSON catalog import for platform inclusions. | Universal |
| `blogger-spec/locales` | Direct JSON catalog import for BCP 47 locale data. | Universal |
| `blogger-spec/fixtures` | Master manifest for conformance fixtures. | Universal |
