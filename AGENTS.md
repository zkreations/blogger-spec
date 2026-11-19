# Blogger Spec — Monorepo Guidelines

Modular TypeScript monorepo (`@bloggerspec`) built with pnpm workspaces, Turborepo, `tsdown`, TypeScript Project References (`tsc -b`), and Release Please.

## Workspace Topology

- `packages/spec` (`@bloggerspec/spec`): Canonical Single Source of Truth (SSOT) — 11 master JSON catalogs, Draft 2020-12 schemas, AST parsers, expression evaluator, context resolver, BIR v2 lowering, and conformance harness. **Zero runtime dependencies (`dependencies: {}`).** See `packages/spec/AGENTS.md` for spec-internal invariants.
- `packages/render` (`@bloggerspec/render`): *[Scaffold]* Future BIR v2 → HTML rendering engine (streaming & sync).
- `packages/builder` (`@bloggerspec/builder`): *[Scaffold]* Future Handlebars-based Blogger XML template builder.
- `packages/cli` (`@bloggerspec/cli`): *[Scaffold]* Future unified CLI entrypoint (`check`, `render`, `build`, `dev`).
- `tooling/tsconfig`, `tooling/eslint`: Shared workspace TypeScript and ESLint (`@antfu/eslint-config`) presets.

## Architectural Rules

- **Strict Acyclic DAG**: `@bloggerspec/spec` is the root dependency and must NEVER depend (runtime or dev) on `render`, `builder`, or `cli`.
- **SSOT Reuse**: Consumer packages must consume catalogs, parsers, validators, types, and context resolution from `@bloggerspec/spec` rather than duplicating domain logic.
- **Breaking Changes Policy**: Breaking API and boundary changes are permitted when justified by SOLID principles, tighter cohesion, lower coupling, or elimination of technical debt.
- **Transitional Renderer Boundary**: `BloggerReferenceRenderer` currently remains inside `packages/spec` as a transitional oracle (`@deprecated`) until `@bloggerspec/render` is implemented and certified 0-diff in its dedicated plan.
- **Generated Artifacts & Private Workbench**: `packages/*/dist/`, `packages/spec/src/generated/`, `packages/spec/fixtures/index.json`, and `.turbo/` are gitignored and generated via `pnpm run build` / `codegen`. `.workbench/` is private and must never be referenced from `packages/*`.

## Verification Loop

Run via `pnpm.cmd` on Windows (`pnpm` on POSIX):

```bash
pnpm.cmd run build           # Run codegen & tsdown across workspace packages
pnpm.cmd run verify          # Run check:hermetic, test:spec, typecheck (tsc -b), lint & test
pnpm.cmd run typecheck       # Incremental Project References check (tsc -b)
pnpm.cmd run lint            # Unified ESLint check across the monorepo
pnpm.cmd run test            # Vitest suites across workspace packages
```
