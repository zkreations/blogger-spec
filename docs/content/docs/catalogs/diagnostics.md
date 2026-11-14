---
title: Diagnostics
description: Unified diagnostic codes reference (BX1001-BX1062), causes, and automated mitigations.
weight: 2
---

The BloggerSpec diagnostics catalog (`BX1001` through `BX1062`) provides an exhaustive, machine-readable registry of syntax, structural, typing, and schema violations across templates, expressions, and Theme Designer variables. Every diagnostic code includes a standardized severity tier, root cause explanation, specification reference, and automated fix recommendations (`suggestedReplacement`) for IDEs and language servers.

## Severity Levels

- **`error`:** Fatal specification violations that prevent compilation or would produce runtime crashes on Blogger.
- **`warning`:** Deprecated patterns, suboptimal performance, or layout version deviations.
- **`info`:** Optimization recommendations and modern Layouts v3 suggestions.

## Key Compiler Diagnostic Codes

| Code | Severity | Description & Cause | Mitigation / Suggested Replacement |
| :--- | :---: | :--- | :--- |
| `BX1019` | `error` | Lambda iterator declared with forbidden `data:` prefix (e.g., `p => data:p.title`). | Remove `data:` prefix from iterator reference (`p => p.title`). |
| `BX1021` | `error` | Expression token budget / complexity quota exceeded. | Simplify expression or decompose into `<b:with>` scopes. |
| `BX1023` | `error` | `<Variable>` or `<Group>` declared outside `<b:skin>` CDATA. | Relocate Theme Designer tags strictly inside `<b:skin>` CDATA. |
| `BX1035` | `error` | `<b:section>` declared inside forbidden container (widget, loop, or nested section). | Move `<b:section>` directly under `<body>` or structural containers. |
| `BX1037` | `error` | `<b:include>` references a subroutine that does not exist in Tiers 1–5 (`UNRESOLVED_INCLUDE_TARGET`). | Declare the missing `<b:includable>` or correct the subroutine name. |
| `BX1047` | `error` | Widget `id` violates canonical pattern `^[Type][1-9][0-9]{0,2}$`. | Rename widget ID to match its type (e.g., `Blog1`, `PageList1`). |
| `BX1056` | `error` | Widget contains an invalid or unknown setting (`INVALID_WIDGET_SETTING`). | Remove or correct the setting name against `settings.json`. |
| `BX1061` | `warning` | Modern template missing required Layouts v3 root HTML attributes. | Add `b:css='false' b:js='false' b:defaultwidgetversion='2' b:layoutsVersion='3'`. |
| `BX1062` | `warning` | Legacy Layouts v1/v2 widget or deprecated table tags detected. | Upgrade widget markup to Layouts v3 clean structures. |

## Automated Mitigations

Diagnostics provide machine-readable automated fix recommendations whenever possible, facilitating quick fixes in language servers and IDE extensions.
