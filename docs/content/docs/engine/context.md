---
title: Context
description: View state resolution, 12 canonical views, widget data synthesis, and normalizer pipeline.
weight: 3
---

Blogger templates require complex runtime data environments that vary dynamically depending on the active page view. The context normalization pipeline in `blogger-spec` provides context synthesis across all 12 canonical Blogger views, handling dynamic widget discovery, Atom feed normalization, and archive tree generation.

## Architectural Boundary: Live Resolution vs. Mock Oracles

To preserve test determinism and prevent test pollution in live environments:
- **`resolveBloggerContext` (Production & Live):** Asynchronously builds pure canonical contexts from live or local configurations, catalogs, and feeds without mock fixture inheritance.
- **`getMockContext` (Offline Oracle):** Synchronously retrieves static, canonical test fixtures from `fixtures/contexts/` exclusively for hermetic tests and fallback without template or project configuration.

## The 12 Canonical Views

`catalogs/globals.json` (`domain_metadata.views`) formally specifies the 12 canonical view states, their platform page types (`data:blog.pageType`), view types (`data:view.type`), and routing flag matrices:

| View ID | `blog.pageType` | `view.type` | Primary Characteristics & Active Flags |
| :--- | :--- | :--- | :--- |
| `homepage` | `index` | `feed` | Root post feed index (`isHomepage: true`, `isMultipleItems: true`). |
| `post_listing` | `index` | `feed` | Paginated post listing (`isSearch: true`, `isMultipleItems: true`). |
| `search_query` | `index` | `feed` | Search query results (`isSearch: true`, `search.query` populated). |
| `label_search` | `index` | `feed` | Label/tag filtered feed (`isSearch: true`, `isLabelSearch: true`). |
| `archive_yearly` | `archive` | `feed` | Yearly archive feed (`isArchive: true`, `archive.year` populated). |
| `archive_monthly` | `archive` | `feed` | Monthly archive feed (`isArchive: true`, `archive.year` and `archive.month` populated). |
| `archive_weekly_daily` | `archive` | `feed` | Weekly or daily archive route (`isArchive: true`). |
| `post` | `item` | `item` | Individual blog post permalink (`isPost: true`, `isSingleItem: true`). |
| `static_page` | `static_page` | `item` | Standalone static page (`isPage: true`, `isSingleItem: true`). |
| `error_404` | `error_page` | `error` | HTTP 404 error page (`isError: true`, single and multiple items false). |
| `preview` | `index` | `feed` | Theme Designer interactive preview (`isPreview: true`, `isHomepage: true`). |
| `layout_mode` | `index` | `feed` | Admin drag-and-drop Layout management mode (`isLayoutMode: true`). |

## Dynamic Widget Discovery & Normalization

Secondary widgets are discovered from the template AST or configured via `config.widgets`:

- **Hierarchical Archives:** `buildArchiveHierarchy` groups posts by year, month, and day deterministically.
- **Popular Posts:** `buildPopularPostsData` ranks posts based on metadata and visit counters.
- **Byline Reactivity:** In `Blog1`, `allBylineItems` dynamically filters out items whose widget setting (`showAuthor`, `showTimestamp`, `showLabels`, etc.) is `false`.
- **Feed Normalizer:** Converts Atom feed entries into normalized `BlogPost` objects with Title Links (`post.link`) cleanly distinguished from media enclosures.
- **External Image Proxying & YouTube Resolution:** Normalizes YouTube thumbnails (`img.youtube.com`, `ytimg.com`) and supports optional proxying via `imageProxyUrl` in `blogger.config.json` (`blog.imageProxyUrl`) to emulate Blogger's internal `blogger_img_proxy` pipeline in local environments.
