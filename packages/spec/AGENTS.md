# `@bloggerspec/spec` — Package Guidelines

Zero-runtime-dependency specification authority, parser, expression evaluator, context resolver, BIR v2 lowering engine, and empirical conformance fixtures.

## Structure

- `catalogs/*.json`: Single Source of Truth (11 canonical domains). Never hardcode domain knowledge in `src/`.
- `catalogs/schemas/`: Draft 2020-12 JSON schemas.
- `fixtures/`: Empirical test suite (`expressions/`, `templates/`, `diagnostics/`, `contexts/`, `feeds/`).
- `src/`: Universal ESM engine (`src/node/` and `src/node.ts` hold Node-only filesystem utilities).
- `src/generated/` & `fixtures/index.json`: Generated via `pnpm --filter @bloggerspec/spec run codegen`. Never edit manually.

## Domain Invariants

- **Zero runtime dependencies & Universal ESM**: Keep `"dependencies": {}`. Entrypoints `.`, `./ir`, `./context`, `./runner` must have zero `node:*` imports.
- **Catalog edit cycle**: Edit `catalogs/<catalog>.json` -> `pnpm --filter @bloggerspec/spec run build` -> `pnpm --filter @bloggerspec/spec run test:spec`.
- **Fixture contract**: Conforms to `BloggerFixture` union (`input.kind`, `expected.outcome`, `covers[]`, `verified_at`).
- **Boolean values**: Strictly `yes`, `no`, `true`, `false`.
- **Canonical widget ID (`BX1047`) & settings**: `src/widget-settings.ts` is the sole SSOT deserializer for `<b:widget-setting>`. Pagination, snippet thresholds, and UI messages derive from `catalogs/settings.json`, `locales.json`, and `messages.json`.
- **Strict type & scope isolation**: `skin:*` types have `parent_type: null` (never receive template string modifiers). `ScopeEnvironment` enforces `lambda` -> `loop` -> `with` -> `includable` -> `widget` -> `global` without leaking widget members into global scopes.
- **Semantic diagnostic lookups**: Resolve codes via `spec.getStandardDiagnostic(...)`, `getInclusionDiagnostic(...)`, `getMessageDiagnostic(...)` without raw string casts or `as any` on AST nodes.
- **Transitional oracle**: `BloggerReferenceRenderer` (`src/ir/reference-renderer.ts`) is preserved transitionally until `@bloggerspec/render` reaches 0-diff parity in its dedicated plan.
- **Sample isolation**: Sample-specific providers reside under `tests/helpers/` or `fixtures/`, never exported in production `src/`.
