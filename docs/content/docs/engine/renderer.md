---
title: Renderer
description: Testing oracle, zero-dependency renderer implementation, and recursion depth limits.
weight: 4
---

The `BloggerReferenceRenderer` class is the zero-dependency canonical reference implementation and testing oracle for the Blogger template execution pipeline. It provides a normative benchmark to certify that external compiler implementations produce output 100% byte-for-byte identical to Blogger's native platform behavior.

## Role & Responsibilities

- **Testing Oracle:** Certifies that external compiler implementations produce output 100% byte-for-byte identical to Blogger's native platform behavior.
- **Pure Universal ESM:** Implemented with zero runtime dependencies or Node.js filesystem bindings.
- **XML Entity Decoding:** Text nodes lowered to BIR decode W3C XML character entities (`unescapeXmlEntities`). Templates generating markup across conditional branches (e.g., `&lt;li class=&quot;nav-item&quot;&gt;` and `&lt;/li&gt;`) emit native unescaped HTML elements matching Blogger's live server output.

{{< hint danger >}}
**Recursion Depth Ceiling (`maxIncludeDepth: 43`):** To prevent stack overflow crashes caused by circular subroutine invocations, the renderer strictly enforces a limit of 43 recursive calls (defined in `catalogs/directives.json`). Exceeding this limit aborts further recursion and emits a diagnostic comment.
{{< /hint >}}
