---
title: BIR
description: Blogger Intermediate Representation (BIR v2), symbol tables, skin styles, and widget settings hydration.
weight: 2
---

To decouple high-level XML template syntax from runtime execution, BloggerSpec lowers `BloggerDocumentNode` ASTs into Blogger Intermediate Representation (BIR v2). This intermediate model simplifies template analysis, accelerates subroutine lookup via symbol tables, and isolates Theme Designer styles and widget configurations into typed records.

## Lowering Transformations

- **Skin Styles (`BirSkinStyle`):** Lowers `<b:skin>` and `<b:template-skin>` into structured style descriptors containing parsed variables and CSS text.
- **Symbol Table:** Indexes subroutines with prefixed keys to accelerate lookup:
  - `widget:${widgetId}:${id}`
  - `gadget:${gadgetType}:${id}`
  - `all:${id}`
  - `common:${id}`
  - `server:${id}`
- **Widget Settings Deserialization:** Hydrates `<b:widget-settings>` through `src/widget-settings.ts`, coercing boolean values, numeric limits, and structured JSON arrays for `LinkList` and `TextList`.

## Output Delineation

BIR v2 distinguishes output directives by source (`data`, `eval`, or `message`):

{{< annotated >}}
```xml
<data:missingTag/>
<b:eval expr='data:missingTag'/>
```
---
**Runtime Output on Missing/Null Data:**
- `<data:.../>` emits Blogger's canonical comment: `<!--Can't find substitution for tag [missingTag]-->`.
- `<b:eval expr='...'/>` evaluates cleanly to empty string `""`.
{{< /annotated >}}
