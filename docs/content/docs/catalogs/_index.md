---
title: Catalogs
description: Complete reference of the 11 Master JSON Catalogs defining the Blogger XML single source of truth.
icon: box-archive
weight: 50
---

All platform rules, data contracts, and domain knowledge for the Blogger XML language reside in 11 normative JSON catalogs located in `catalogs/`. This catalog architecture acts as the immutable Single Source of Truth (SSOT), ensuring that engine logic in `src/` remains strictly algorithmic and free of hardcoded magic constants, numbers, or localized strings.

## The SSOT Philosophy

- **Zero Hardcoded Constants:** UI fallbacks, pagination limits, and snippet thresholds derive directly from catalogs, never hardcoded strings or numbers.
- **Formal Schema Validation:** Every catalog conforms to strict Draft 2020-12 JSON schemas in `catalogs/schemas/`.
- **In-Memory Freshness:** Catalogs are embedded into typed in-memory stores during build (`src/generated/embedded.generated.ts`), ensuring universal zero-dependency runtime execution.

## Catalog Groups

| Group | Master Catalogs | Normative Scope |
| :--- | :--- | :--- |
| Syntax & Operators | `directives.json`, `operators.json`, `scopes.json` | Directives, 10-tier Pratt precedence, and lexical resolution. |
| Type System | `types.json` | Platform subtypes, modifiers, and Theme Designer isolation. |
| Widgets & Settings | `widgets.json`, `settings.json`, `inclusions.json` | Gadget schemas, setting coercions, and server subroutines. |
| Environment & Locales | `globals.json`, `messages.json`, `locales.json` | Global objects, localized messages, and BCP 47 locale data. |
| Diagnostics Registry | `diagnostics.json` | Codes `BX1001`–`BX1062`, severities, and suggested replacements. |

## Catalog Modules

{{< pagelink href="/docs/catalogs/system" title="System" description="Architecture of the 11 catalogs, schema validation, and generated artifacts" icon="file-text" >}}

{{< pagelink href="/docs/catalogs/diagnostics" title="Diagnostics" description="Unified diagnostic codes reference (BX1001-BX1062) and mitigations" icon="triangle-exclamation" >}}

{{< pagelink href="/docs/catalogs/widgets" title="Widgets" description="Gadget schemas, canonical IDs, and widget settings coercion" icon="gear" >}}

{{< pagelink href="/docs/catalogs/globals" title="Globals" description="Global objects, view state flags, messages, and BCP 47 locale data" icon="globe" >}}
