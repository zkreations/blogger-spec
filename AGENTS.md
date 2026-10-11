# Blogger Spec — Agent Guidelines

Standalone, zero-runtime-dependency specification authority for Blogger XML templates and expressions. Houses canonical catalogs and empirical conformance fixtures.

## Architecture Pointers

- `catalogs/*.json`: **Canonical Single Source of Truth** (Master JSON catalogs for all 9 domains). Edit here!
- `catalogs/schemas/`: Draft 2020-12 canonical schemas for validating each catalog.
- `fixtures/`: Empirical conformance suite (`expressions/`, `templates/`, `diagnostics/`, and generated manifest `index.json`).
- `src/`: Core specification modules (`ast.ts`, `helpers.ts`, `catalogs/`, `runner.ts`, `types.ts`, `tooling/`).
- `dist/`: Generated TypeScript definitions and ESM distribution bundles. Never edit manually.

## Verification Loop

Run all commands using `pnpm` (`pnpm.cmd` on Windows):

```bash
pnpm run lint         # ESLint check (@antfu/eslint-config)
pnpm run typecheck    # TypeScript strict check (tsc --noEmit)
pnpm run test:spec    # AJV Draft 2020-12 schema validation, d.ts freshness
pnpm run test         # Vitest conformance test suite
pnpm run build        # Recompile fixtures manifest and dist/
```

## Change Invariants

- **Catalog edit cycle**: Edit JSON in `catalogs/<catalog>.json` -> run `pnpm run test:spec` -> run `pnpm run build`.
- **Fixture contract**: All fixtures must follow the `BloggerFixture` discriminated union (`input.kind`, `expected.outcome`, `covers[]`, `verifiedAt`).
- **Zero runtime dependencies**: Production export must maintain `dependencies: {}`.

