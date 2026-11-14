---
title: Layouts
description: Layout versions (v1-v3), section containers, widget types, and 6-tier subroutine resolution.
weight: 4
---

Blogger template architecture is organized around Layout versioning standards (v1, v2, v3), structural `<b:section>` containers, and modular `<b:widget>` instances. This document formalizes container expansion rules, tag nesting constraints, canonical identifier patterns, and the 6-tier ontological subroutine resolution chain.

## Layout Versions

- **Layouts v1 (Legacy):** Requires inline `<style>` and JavaScript bundles.
- **Layouts v2:** Introduces enhanced widgets and Theme Designer support.
- **Layouts v3 (Modern):** Clean templates enforcing root attributes `b:css='false'`, `b:js='false'`, `b:defaultwidgetversion='2'`, and `b:layoutsVersion='3'` (`BX1061`, `BX1062`).

## Section Constraints

- **Rendering:** Expands to `<div class='section' id='[id]'>` or a semantic tag when declared via `tag='div' | 'header' | 'nav' | 'main' | 'aside' | 'footer' | 'section' | 'article'`.
- **Nesting Rules (`BX1035`):** Permitted only under `<body>`, `<b:tag>`, structural HTML containers, or conditional branches. Forbidden under `<head>`, inside widgets, within loops, or nested within another section.

## Widgets

Every widget `id` must strictly match the canonical format `^[Type][1-9][0-9]{0,2}$` (e.g. `Blog1`, `Header1`, `PageList1`), allowing deterministic type inference (`BX1047`).

Widgets expand into a versioned wrapper element:

```html
<div class='widget [Type]' data-version='2' id='[id]'>
```

Execution begins by resolving and evaluating the widget's `main` includable subroutine.

## Subroutine Dispatch (Includables)

`<b:include>` invocations resolve through a 6-tier ontological resolution chain (first match wins):

| Tier | Level | Source | Description |
| :---: | :--- | :--- | :--- |
| **1** | `local_widget` | Direct child of `<b:widget>` | Private subroutine of the calling widget. |
| **2** | `gadget_specific` | `<b:defaultmarkup type='WidgetType'>` | Markup for a specific widget type or list of types. |
| **3** | `universal_widget` | `<b:defaultmarkup type='All'>` | Markup shared by all widgets. |
| **4** | `shared_common` | `<b:defaultmarkup type='Common'>` | Cross-cutting subroutines (icons, macros, components). |
| **5** | `platform_server` | Platform built-ins | Server macros (`all-head-content`) and platform subroutines. |
| **6** | `unresolved` | Exhaustion | Resolution failure (`BX1037`). |

### Collision Handling

When identical subroutine identifiers exist at the same tier:
1. **`last_block_wins`:** If duplicate `<b:defaultmarkup>` blocks declare the same `id`, the last block wins.
2. **`last_container_wins`:** Later container blocks override earlier definitions.
