---
title: Widgets
description: Canonical definitions for the 26 official Blogger gadgets, section constraints, and widget-settings schemas.
weight: 3
---

Blogger templates organize layout containers and functional presentation units into `<b:widget>` elements. This catalog defines canonical gadget types, allowable section constraints, schema structures, and setting configurations according to official platform behavior.

## Canonical Gadget Types

`catalogs/widgets.json` formally specifies **26 official canonical gadget types**:

- **Core & Article:** `Blog` (core post feed, pagination, bylines, comments), `FeaturedPost` (highlighted editorial post), `PopularPosts` (ranked posts by timeframe).
- **Navigation & Categorization:** `Header` (blog title, description, header image), `PageList` (static pages), `Label` (tag cloud and lists), `BlogArchive` (hierarchical, flat, or dropdown date navigation), `BlogList` (curated blog roll).
- **Custom Content & Lists:** `LinkList` (custom link lists), `TextList` (bulleted lists), `HTML` (arbitrary user markup), `Text` (formatted text), `Image` (standalone image).
- **Social, Interaction & Feeds:** `ContactForm` (direct email messaging), `Subscribe` (subscription links), `Feed` (external Atom/RSS reader), `Followers` (Friend Connect community), `BloggerButton` (official platform badge).
- **Discovery, Monetization & Utilities:** `BlogSearch` (in-blog search engine), `AdSense` (advertising units), `Attribution` (copyright and platform credits), `Profile` (author info), `Stats` (hit counters), `Translate` (Google Translate widget), `ReportAbuse` (platform compliance), `Wikipedia` (reference lookup).

## Canonical Widget ID Invariant (`BX1047`)

Every widget `id` must strictly match the regex pattern:

```text
^[Type][1-9][0-9]{0,2}$
```

Examples: `Blog1`, `Header2`, `PageList1`. This pattern enables deterministic widget type inference directly from the identifier without requiring redundant metadata.

## Secondary Widget Synthesis

Secondary gadgets (`BlogArchive`, `PopularPosts`, `FeaturedPost`, `PageList`, `Label`, `LinkList`) are synthesized conditionally:
- **Template Discovery:** They are only instantiated if their `<b:widget>` tag is discovered in the parsed template AST/XML, or if explicitly configured in `config.widgets`.
- **Headless Mode:** In standalone execution without a template, discovery defaults safely to instances present in the active feed payload.
- **Deterministic Structures:** Aggregation trees such as `BlogArchive` year/month hierarchies and `PopularPosts` ranking arrays are synthesized deterministically from post publication dates and metadata.

## 5-Tier Data Hydration Cascade

Widget data and configurations resolve through a strict 5-tier cascade:

1. **Catalog Defaults:** Baseline schema types and defaults from `catalogs/settings.json`.
2. **Type Configurations:** Global widget defaults configured via `config.widgets[type]`.
3. **Template Settings:** Inlined `<b:widget-setting>` tags parsed and deserialized from template XML.
4. **Instance Configurations:** Specific widget ID configurations via `config.widgets[id]`.
5. **Runtime Overrides:** View-level explicit data injections via `overrides.widgetData[id]`.

## Setting Coercion & Special Patterns

`<b:widget-setting>` values are coerced deterministically (boolean, string, integer, or JSON array/object) per `catalogs/settings.json`. The deserializer in `src/widget-settings.ts` serves as the sole Single Source of Truth for settings parsing across both IR lowering and context extraction pipelines.

Special patterns include:
- **`LinkList` (`link-{index}` & `text-{index}`):** Paired index entries are automatically collected, sorted according to the `sorting` setting (`alphabetical` or `reverse_alphabetical`), truncated by `shownum`, and exposed as `links: [{ name, target }]`.
- **`TextList` (`item-{index}`):** Indexed items are merged into a unified string list `items: string[]`, respecting sorting and limits.
