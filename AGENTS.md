# Blogger Spec — Agent Guidelines

Zero-runtime-dependency specification authority for Blogger XML templates and expressions. Houses canonical catalogs and empirical conformance fixtures.

## Architecture

- `catalogs/*.json`: **Single Source of Truth** (SSOT for all 9 domains).
- `catalogs/schemas/`: Draft 2020-12 canonical validation schemas.
- `fixtures/`: Empirical test suite (`expressions/`, `templates/`, `diagnostics/`).
- `src/`: Spec modules (`ast.ts`, `catalogs/`, `helpers.ts`, `runner.ts`, `tooling/`, `types.ts`).
- `dist/`: Bundles and `.d.ts` generated via `pnpm run build`.

## Verification Loop

Run via `pnpm` (`pnpm.cmd` on Windows):

```bash
pnpm run build        # Compile dist/ and sync fixtures manifest
pnpm run test:spec    # Validate schemas (AJV Draft 2020-12), integrity & .d.ts freshness
pnpm run typecheck    # Strict TypeScript check (tsc --noEmit)
pnpm run lint         # ESLint check (@antfu/eslint-config)
pnpm run test         # Vitest conformance suite
```

## Invariants

- **Catalog edit cycle**: Edit `catalogs/<catalog>.json` -> `pnpm run build` -> `pnpm run test:spec`.
- **Fixture contract**: Conforms to `BloggerFixture` union (`input.kind`, `expected.outcome`, `covers[]`, `verifiedAt`).
- **Zero runtime dependencies**: Production export requires `dependencies: {}`.
