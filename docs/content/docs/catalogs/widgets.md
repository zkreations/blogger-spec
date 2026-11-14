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

## Setting Coercion

`<b:widget-setting>` values are coerced deterministically (boolean, string, integer, or JSON array/object) per `catalogs/settings.json`. The deserializer in `src/widget-settings.ts` serves as the sole Single Source of Truth for settings parsing across both IR lowering and context extraction pipelines.
