---
title: Context
description: View state resolution, 12 canonical views, widget data synthesis, and normalizer pipeline.
weight: 3
---

Blogger templates require complex runtime data environments that vary dynamically depending on the active page view. The context normalization pipeline in `blogger-spec` provides unified online and offline context synthesis across all 12 canonical Blogger views, handling dynamic widget discovery, Atom feed normalization, and archive tree generation.

## The 12 Canonical Views

Blogger defines 12 distinct view states, each exposing unique boolean flags and routing properties under `data:view.*`:

1. `item` (Single post view)
2. `static_page` (Standalone page)
3. `multiple_items` (Multi-post index)
4. `archive` (Date-based archive)
5. `author` (Author-filtered posts)
6. `label` (Tag/label filter)
7. `search` (Search query results)
8. `default` (Blog homepage)
9. `feed` (Syndication view)
10. `preview` (Draft preview)
11. `status` (Admin status notices)
12. `error` (HTTP 404 error page)

## Dynamic Widget Discovery & Normalization

Secondary widgets are discovered from the template AST or configured via `config.widgets`:

- **Hierarchical Archives:** `buildArchiveHierarchy` groups posts by year, month, and day deterministically.
- **Popular Posts:** `buildPopularPostsData` ranks posts based on metadata and visit counters.
- **Byline Reactivity:** In `Blog1`, `allBylineItems` dynamically filters out items whose widget setting (`showAuthor`, `showTimestamp`, `showLabels`, etc.) is `false`.
- **Feed Normalizer:** Converts Atom feed entries into normalized `BlogPost` objects with Title Links (`post.link`) cleanly distinguished from media enclosures.
