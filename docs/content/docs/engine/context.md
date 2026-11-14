---
title: Context
description: View state resolution, 12 canonical views, widget data synthesis, and normalizer pipeline.
weight: 3
---

Blogger templates require complex runtime data environments that vary dynamically depending on the active page view. The context normalization pipeline in `blogger-spec` provides unified online and offline context synthesis across all 12 canonical Blogger views, handling dynamic widget discovery, Atom feed normalization, and archive tree generation.

## The 12 Canonical Views

Blogger defines 12 distinct canonical view states (`CANONICAL_VIEWS`), each exposing unique boolean flags and routing properties under `data:view.*`:

1. `homepage` (Blog main index view)
2. `post_listing` (Paginated post index / multi-post stream)
3. `post` (Individual post view)
4. `static_page` (Standalone static page view)
5. `archive_yearly` (Year-level date archive view)
6. `archive_monthly` (Month-level date archive view)
7. `archive_weekly_daily` (Week- or day-level date archive view)
8. `label_search` (Tag / label filtered post view)
9. `search_query` (Search query results view)
10. `error_404` (HTTP 404 not found error view)
11. `preview` (Theme Designer / post draft preview view)
12. `layout_mode` (Layout management mode view)

## Dynamic Widget Discovery & Normalization

Secondary widgets are discovered from the template AST or configured via `config.widgets`:

- **Hierarchical Archives:** `buildArchiveHierarchy` groups posts by year, month, and day deterministically.
- **Popular Posts:** `buildPopularPostsData` ranks posts based on metadata and visit counters.
- **Byline Reactivity:** In `Blog1`, `allBylineItems` dynamically filters out items whose widget setting (`showAuthor`, `showTimestamp`, `showLabels`, etc.) is `false`.
- **Feed Normalizer:** Converts Atom feed entries into normalized `BlogPost` objects with Title Links (`post.link`) cleanly distinguished from media enclosures.
