---
title: Globals
description: Schema and properties of the 6 canonical global objects, localized messages, and BCP 47 locale data.
weight: 4
---

Every template execution environment exposes a set of standard global singleton objects, view state indicators, Theme Designer variables, and localized platform messages. This catalog defines their properties, traversal paths, and internationalization schemas according to `catalogs/globals.json`.

## The 6 Canonical Global Objects

The root template execution environment defines exactly six universal global datasets:

- **`blog` (`data:blog.*`):** Universal blog metadata, configurations, locale, and platform endpoints (`title`, `homepageUrl`, `locale`, `pageType`, `searchUrl`, `analyticsAccountNumber`, `analytics4`, `languageDirection`).
- **`view` (`data:view.*`):** Request routing and active view classification state in Layouts v3 (`isHomepage`, `isPost`, `isPage`, `isArchive`, `isLabelSearch`, `isSearch`, `isError`, `isPreview`, `isLayoutMode`, `isMultipleItems`, `isSingleItem`, `search.query`, `archive.year`, `url.canonical`).
- **`messages` (`data:messages.*`):** Localized platform UI strings evaluated as scalar properties matching the blog's BCP 47 language (`home`, `olderPosts`, `noTitle`, `readMore`, etc.).
- **`skin` (`data:skin.*`):** Theme Designer skin container, exposing `data:skin.override` (custom CSS injected via "Add CSS") and `data:skin.vars.*` (resolved theme tokens projected with dot-to-underscore normalization: `body.font` → `body_font`).
- **`template` (`data:template.*`):** Active theme package manifest, compiler version flags, and responsive layout indicators (`isResponsive`, `version`).
- **`widgets` (`data:widgets.*`):** Global cross-widget layout registry in Layouts v3. Exposes descriptor objects (`id`, `sectionId`, `title`, `type`) for visible widgets across the page; does not leak full private widget data dictionaries.

{{< hint info >}}
**`data:widgets` vs. `data:widget`:**
`data:widgets` (plural) is a universal global singleton accessible anywhere in the template. In contrast, `data:widget` (singular) is private to the **Host Widget Scope** (`scopes.json`), available strictly inside `<b:includable>` elements to inspect the active gadget's instance metadata (`instanceId`, `sectionId`, `type`, `version`).
{{< /hint >}}

## The 12 Canonical Views Matrix

Blogger Layouts v3 formally classifies template request contexts into **12 deterministic views** (`domain_metadata.views` in `catalogs/globals.json`). Each view configures `blog.pageType`, `view.type`, and specific active boolean flags:

| View ID | `blog.pageType` | `view.type` | URL Pattern | Active Truthy Flags (`data:view.*`) |
| :--- | :---: | :---: | :--- | :--- |
| `homepage` | `index` | `feed` | `/` | `isHomepage`, `isMultipleItems` |
| `post_listing` | `index` | `feed` | `/search?updated-max={TIMESTAMP}` | `isSearch`, `isMultipleItems` |
| `search_query` | `index` | `feed` | `/search?q={QUERY}` | `isSearch`, `isMultipleItems` |
| `label_search` | `index` | `feed` | `/search/label/{LABEL}` | `isSearch`, `isLabelSearch`, `isMultipleItems` |
| `archive_yearly` | `archive` | `feed` | `/{YYYY}/` | `isArchive`, `isMultipleItems` |
| `archive_monthly` | `archive` | `feed` | `/{YYYY}/{MM}/` | `isArchive`, `isMultipleItems` |
| `archive_weekly_daily` | `archive` | `feed` | `/{YYYY}_{MM}_{DD}_archive.html` | `isArchive`, `isMultipleItems` |
| `post` | `item` | `item` | `/{YYYY}/{MM}/{SLUG}.html` | `isPost`, `isSingleItem` |
| `static_page` | `static_page` | `item` | `/p/{SLUG}.html` | `isPage`, `isSingleItem` |
| `error_404` | `error_page` | `error` | HTTP 404 handler | `isError` |
| `preview` | `index` | `feed` | Draft post/template preview | `isHomepage`, `isPreview`, `isMultipleItems` |
| `layout_mode` | `index` | `feed` | Blogger Layout editor frame | `isHomepage`, `isLayoutMode`, `isMultipleItems` |

## Dynamic Locale Resolution

Platform strings are resolved dynamically from `catalogs/messages.json` and `catalogs/locales.json` according to the blog's BCP 47 locale. Date format replacement tokens utilize Unicode-aware pattern matching (`/\p{L}/u`, `\p{N}`) to support non-Latin scripts cleanly.
