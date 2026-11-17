# `@bloggerspec/render`

> Structural scaffold reserved for the BIR v2 → HTML rendering engine (subsequent plan).

## Planned Scope

- From-scratch rendering engine consuming `BloggerIRDocument` (BIR v2) and normalized contexts from `@bloggerspec/spec`.
- Synchronous and streaming (`ReadableStream`) execution, DOM mutation stack (`b:class`, `b:attr`), and widget/platform singleton policies.
- 0-diff certification against the 323 fixtures via `runConformance` and permanent replacement of the transitional `BloggerReferenceRenderer` oracle.
