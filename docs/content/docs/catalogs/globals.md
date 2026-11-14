---
title: Globals
description: Schema and properties of global objects, canonical localized messages, and BCP 47 locale data.
weight: 4
---

Every template execution environment exposes a set of standard global objects, view state indicators, Theme Designer variables, and localized platform messages. This catalog defines their properties, traversal paths, and internationalization schemas.

## Global Scope Objects

- **`blog` (`data:blog.*`):** Universal blog metadata (`title`, `homepageUrl`, `locale`, `pageType`, `searchUrl`, `analyticsCustomerId`).
- **`view` (`data:view.*`):** Active view state flags (`isHomepage`, `isPost`, `isPage`, `isArchive`, `isLabelSearch`, `search.query`, `archive.year`).
- **`skin` (`data:skin.vars.*`):** Resolved Theme Designer variable bindings projected into expressions with dot-to-underscore normalization (`body.font` → `body_font`).
- **`messages` (`data:messages.*`):** Localized platform strings (`messages.home`, `messages.olderPosts`, `messages.noResultsFound`).

## Dynamic Locale Resolution

Platform strings are resolved dynamically from `catalogs/messages.json` and `catalogs/locales.json` according to the blog's BCP 47 locale. Date format replacement tokens utilize Unicode-aware pattern matching to support non-Latin scripts cleanly.
