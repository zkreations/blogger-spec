# Contributing to blogger-spec

`blogger-spec` is the canonical, standalone, zero-runtime-dependency specification authority and execution engine for Blogger XML templates and expressions.

---

## Core Invariants

1. **Catalogs are the SSOT**: All directive grammar, operator precedence tiers, types, globals, and system inclusion rules live in [`catalogs/<catalog>.json`](catalogs/). Never hardcode domain knowledge in `src/`.
2. **Never Edit Generated Artifacts Directly**: `dist/`, `fixtures/index.json`, and `src/catalogs/embedded.generated.ts` are generated automatically via `pnpm run build`.
3. **Zero Runtime Dependencies**: Production exports must strictly maintain `"dependencies": {}` in `package.json`.
4. **Empirical Verification**: Any spec change or fix requires empirical verification against the Google Blogger production engine and a corresponding test fixture under [`fixtures/`](fixtures/) with evidence attribution (`official` or `observed`).
5. **Flat Type Hierarchy & Skin Variable Isolation**: Platform subtypes (`url`, `image`, `date`, `locale`, `message`) inherit directly from `string` (1-level depth). Theme variables (`skin:*`) have `parent_type: null` and must remain strictly isolated from template string modifiers (`.length`, `.escaped`).

---

## Architecture Overview

```
blogger-spec/
├── catalogs/                 # Canonical Single Source of Truth (10 Master JSON Catalogs)
│   ├── directives.json       # b:* tags, attributes, closure modes, constraints, layout versions
│   ├── operators.json        # Operators, 10 precedence tiers, dual syntax, token costs
│   ├── types.json            # Types ontology, modifiers, truthiness matrix, coercion rules
│   ├── widgets.json          # Widget definitions, schema declarations, allowed sections
│   ├── settings.json         # Widget settings configuration dictionaries
│   ├── globals.json          # Global data objects (data:blog, data:view, data:skin...)
│   ├── messages.json         # Localized UI string definitions (data:messages.*)
│   ├── scopes.json           # Variable scope resolution rules & precedence
│   ├── diagnostics.json      # Diagnostic compiler/linter rules (BX1001-BX1040)
│   ├── inclusions.json       # System inclusions, layouts versions 1-3, super.* prefix
│   └── schemas/              # Draft 2020-12 canonical JSON schemas
├── fixtures/                 # Empirical conformance test cases
│   ├── expressions/          # Expression evaluation fixtures
│   ├── templates/            # Template rendering fixtures
│   ├── diagnostics/          # Negative validation fixtures (rejected by Blogger)
│   └── index.json            # Compiled fixtures manifest (generated)
├── src/                      # Spec modules, runtime helpers, parser, and tooling
│   ├── ast.ts                # Formal AST interfaces and parseExpression export
│   ├── parser/               # Pratt expression parser, directive scanner, and lexer
│   │   ├── lexer.ts          # Deterministic expression lexer with loc tracking
│   │   ├── expr-parser.ts    # Pratt parser guided by operators.json precedence
│   │   └── directive-scanner.ts # Fault-tolerant XML directive & tag tokenizer
│   ├── version.ts            # Canonical template layout version detector (v1, v2, v3)
│   ├── quota.ts              # Canonical token quota calculator (BX1021 rules)
│   ├── type-system.ts        # Type assignability, modifiers, and operator compatibility
│   ├── catalogs/             # Typed CatalogStore and SpecCatalog domain models
│   ├── helpers.ts            # High-level query & validation utilities
│   ├── runner.ts             # Conformance test runner engine
│   └── tooling/              # Build pipeline, schema validator, and compiler
└── dist/                     # ESM bundles and generated type definitions
```

---

## Contribution Workflow

### 1. Catalog Changes
- **Directives & Attributes**: Edit [`catalogs/directives.json`](catalogs/directives.json).
- **Operators & Precedence**: Edit [`catalogs/operators.json`](catalogs/operators.json). Ensure both `precedence_hierarchy` and the `operators` dictionary remain synchronized.
- **Data Types & Modifiers**: Edit [`catalogs/types.json`](catalogs/types.json).
- **System Inclusions**: Edit [`catalogs/inclusions.json`](catalogs/inclusions.json).
- **Schemas**: If metadata structures change, update [`catalogs/schemas/`](catalogs/schemas/).

### 2. Engine & Parser Changes
- **Expression Parser**: If grammar, lexing, or operator binding power changes, update [`src/parser/lexer.ts`](src/parser/lexer.ts) and [`src/parser/expr-parser.ts`](src/parser/expr-parser.ts).
- **Directive Scanner**: If XML tag tokenization, attribute parsing, or CDATA/comment masking changes, update [`src/parser/directive-scanner.ts`](src/parser/directive-scanner.ts).
- **Layout Versions**: If layout version heuristics change, update `domain_metadata.layout_versions` in [`catalogs/directives.json`](catalogs/directives.json) and [`src/version.ts`](src/version.ts).
- **Token Quota**: If token cost rules or quota thresholds change, update [`src/quota.ts`](src/quota.ts).
- **Type Checking**: If coercion matrices, truthiness, or assignability change, update [`src/type-system.ts`](src/type-system.ts).
- **Structural Validation & Helpers**: If directive nesting or template structure validation rules change, update [`src/catalogs/spec-catalog.ts`](src/catalogs/spec-catalog.ts) and [`src/helpers.ts`](src/helpers.ts).

### 3. Add Conformance Fixtures
Add empirical test cases under [`fixtures/`](fixtures/) adhering to the `BloggerFixture` discriminated union contract (`input.kind`, `expected.outcome`, `covers[]`, `verifiedAt`).

### 4. Build & Verify Loop
Run the complete verification pipeline before submitting any changes:

```bash
pnpm run build        # Compiles dist/, embedded.generated.ts, and fixtures/index.json
pnpm run test:spec    # Validates schemas (AJV Draft 2020-12), referential integrity & d.ts
pnpm run typecheck    # Strict TypeScript typecheck (tsc --noEmit)
pnpm run lint         # ESLint code style check
pnpm run test         # Runs Vitest unit and conformance test suites
```

---

## Reporting Issues

Use the GitHub Issue templates when submitting reports:

- **[Specification Inconsistency](.github/ISSUE_TEMPLATE/spec_inconsistency.md)**: Discrepancies between `blogger-spec` and the actual Blogger engine behavior.
- **[New Spec Entity Discovery](.github/ISSUE_TEMPLATE/new_spec_entity.md)**: Newly discovered operators, directive attributes, inclusions, or globals.

---

## Commit Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(catalog)`: New directive, operator, type, or system inclusion.
- `feat(parser)`: Parser enhancements or grammar features.
- `feat(type-system)`: Type assignability, modifiers, or coercion rules.
- `fix(catalog)`: Correction to an existing attribute, precedence level, or constraint.
- `test(fixtures)`: New or updated conformance fixtures.
- `docs`: Documentation updates.
- `chore`: Tooling or build pipeline maintenance.
