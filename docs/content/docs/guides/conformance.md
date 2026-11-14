---
title: Conformance
description: Verifying external engines against BloggerSpec fixtures and contributing empirical tests.
weight: 3
---

Learn how to certify custom rendering engines, external compilers, or third-party parsers against BloggerSpec's official empirical test suite and contribution workflow.

## The BloggerFixture Contract

Every test fixture in `fixtures/` adheres to a strict JSON schema:

- **`input`:** Input XML snippet or expression string and test context.
- **`expected`:** Canonical expected outcome (HTML output, evaluated primitive, or diagnostic code).
- **`verified_at`:** Empirical platform verification timestamp proven on Blogger's live server.

## Running Conformance Tests

Use the conformance runner to certify compatibility:

```typescript
import { runConformance } from 'blogger-spec'
import { loadFixturesManifest } from 'blogger-spec/node'

const fixtures = loadFixturesManifest()
const report = runConformance(
  {
    renderTemplate: (template, context) => myCompilerRenderFunction(template, context),
  },
  { fixtures }
)

console.log(`Passed: ${report.passed}/${report.total}`)
```
