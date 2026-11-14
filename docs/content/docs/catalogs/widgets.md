---
title: Widgets
description: Canonical definitions for official Blogger gadgets, section constraints, and widget-settings schemas.
weight: 3
---

Blogger templates organize layout containers and functional presentation units into `<b:widget>` elements. This catalog defines canonical gadget types, allowable section constraints, schema structures, and setting configurations according to official platform behavior.

## Canonical Gadget Types

- **`Blog`:** Core post feed, pagination, byline items, comments, and post body.
- **`Header`:** Blog title, header description, and optional header image.
- **`BlogArchive`:** Hierarchical archive navigation (flat, hierarchy, dropdown).
- **`PopularPosts`:** Ranked posts based on visit metrics and timeframes.
- **`FeaturedPost`:** Highlighted editorial post snippet.
- **`PageList`:** Static pages navigation links.
- **`Label`:** Tag cloud and category lists.
- **`LinkList` & `TextList`:** Custom lists deserialized from settings.
- **`HTML`:** Arbitrary user-defined HTML/JS snippets.

## Canonical Widget ID Invariant

Every widget `id` must strictly match the regex pattern:

```text
^[Type][1-9][0-9]{0,2}$
```

Examples: `Blog1`, `Header2`, `PageList1`. This pattern enables deterministic widget type inference directly from the identifier without requiring redundant metadata.

## Setting Coercion

`<b:widget-setting>` values are coerced deterministically (boolean, string, integer, or JSON array/object) per `catalogs/settings.json`. The deserializer in `src/widget-settings.ts` serves as the sole Single Source of Truth for settings parsing across both IR lowering and context extraction pipelines.
