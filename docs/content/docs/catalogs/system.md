---
title: System
description: Architecture of the 11 JSON catalogs, JSON Schema validation, and in-memory artifact generation.
weight: 1
---

The 11 Master JSON Catalogs in `catalogs/` constitute the immutable normative foundation of BloggerSpec. They define every syntactic, operational, and structural rule of the Blogger platform. To guarantee consistency and backward compatibility, all catalogs are validated against strict Draft 2020-12 JSON schemas and compiled directly into in-memory stores during build.

## The 11 Master Catalogs

| Catalog | Responsibility |
| :--- | :--- |
| `directives.json` | Directives, allowed attributes, nesting policies, and Layout versions. |
| `operators.json` | Expression operators, 10-tier Pratt precedence hierarchy, and aliases. |
| `types.json` | Type system ontology, modifiers, and Theme Designer isolation. |
| `widgets.json` | Official gadgets (`Blog`, `Header`, etc.), section placement, and schemas. |
| `settings.json` | Allowed keys and value types for `<b:widget-settings>`. |
| `globals.json` | Global scope objects (`blog`, `view`, `skin`), flags, and endpoints. |
| `messages.json` | Canonical UI string identifiers (`data:messages.*`). |
| `scopes.json` | Scoping hierarchy, resolution precedence, and shadowing rules. |
| `diagnostics.json` | Compiler diagnostics registry (`BX1001`–`BX1062`) and error templates. |
| `inclusions.json` | Platform server subroutines (`all-head-content`) and canonical stubs. |
| `locales.json` | Supported language metadata, BCP 47 codes, and regional format rules. |

## Schema Validation & Artifact Generation

Each catalog is validated against strict JSON Schema (Draft 2020-12) specifications in `catalogs/schemas/`. 

During compilation (`pnpm run build`), the build pipeline embeds the catalogs directly into in-memory TypeScript modules (`src/generated/embedded.generated.ts` and `src/generated/types.generated.ts`), ensuring zero filesystem dependencies at runtime.
