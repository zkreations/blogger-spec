---
title: BIR
description: Blogger Intermediate Representation (BIR v2), symbol tables, skin styles, and widget settings hydration.
weight: 2
---

To decouple high-level XML template syntax from runtime execution, BloggerSpec lowers `BloggerDocumentNode` ASTs into Blogger Intermediate Representation (BIR v2). This intermediate model simplifies template analysis, accelerates subroutine lookup via symbol tables, and isolates Theme Designer styles and widget configurations into typed records.

## Lowering Transformations

- **Skin Styles (`BirSkinStyle`):** Lowers `<b:skin>` and `<b:template-skin>` into structured style descriptors containing parsed variables and CSS text.
- **Symbol Table:** Indexes subroutines with prefixed keys to accelerate lookup:
  - `widget:${widgetId}:${id}` (local widget subroutine)
  - `gadget:${gadgetType}:${id}` (gadget-specific default markup)
  - `all:${id}` (universal widget default markup)
  - `common:${id}` (shared common default markup)
  - `server:${id}` (platform server inclusions and `super.*` macros)
  - Subroutines failing to resolve across all 5 tiers fall back to level 6 (`unresolved`), which aborts rendering of the host gadget with an HTML comment: `<!--Failed to render gadget '[WidgetId]'...-->` (`BX1037`).
- **Widget Settings Deserialization:** Hydrates `<b:widget-settings>` through `src/widget-settings.ts`, coercing boolean values, numeric limits, and structured JSON arrays for `LinkList` and `TextList`.

## Output Delineation

BIR v2 distinguishes output directives by source (`data`, `eval`, or `message`):

{{< annotated >}}
```xml
<data:missingTag/>
<data:complexObject/>
<b:eval expr='data:missingTag'/>
<b:message name='messages.olderPosts'/>
<b:message name='messages.archiveRangeMessage'>
  <b:param expr:value='data:currentYear'/>
</b:message>
```
---
**Runtime Output Evaluation:**
- `<data:.../>` on missing data emits `globals.json` `MISSING`: `<!--Can't find substitution for tag [missingTag]-->`.
- `<data:.../>` on unflattenable non-singleton objects emits `NOT_SINGLETON`: `<!--Substitution is not a singleton for tag [complexObject]-->`.
- `<b:eval expr='...'/>` evaluates cleanly to empty string `""` on null or missing data.
- `<b:message name='...'/>` resolves localized platform strings matching the blog's BCP 47 locale from `catalogs/messages.json` and `catalogs/locales.json`.
- `<b:message>` with `<b:param/>` children evaluates positional or named parameter expressions via ICU message patterns.
{{< /annotated >}}
