# Migration: Eden Identity-Only + Memory Delegation

## Goal

Eden IDP is becoming **identity-only** (auth, tokens, "who"). All memory operations are moving to the standalone `rbx-memory` service per **ADR-0200** and the broader ecosystem reorganization in **ADR-0010**.

## What is changing

| Concern | Before | After |
|---|---|---|
| Memory runtime | Eden CLI talks directly to S3 (`rbx-memory` bucket) | Eden CLI delegates to `rbx-memory` service over HTTP |
| Eden scope | Identity + Memory | Identity only |
| Memory ownership | Eden (direct S3 credentials) | `rbx-memory` (single writer) |

## Delegation switch

The CLI now contains a **delegation seam** controlled by the environment variable `RBX_MEMORY_URL`:

- **`RBX_MEMORY_URL` is set** (e.g. `http://rbx-memory.internal`)  
  `eden memory` commands route through the delegation client (`src/memory-client.ts`) to the `rbx-memory` service.

- **`RBX_MEMORY_URL` is unset** (default today)  
  `eden memory` commands continue to use the existing direct-S3 path. Behavior is **identical** to today.

## Timeline

1. **This increment** — Delegation client and config switch are added. Direct-S3 path remains the default and is fully functional.
2. **Once `rbx-memory` is live** — Set `RBX_MEMORY_URL` in Eden environments to cut over to delegation.
3. **After cutover is verified** — The direct-S3 path in Eden will be removed. Eden becomes identity-only.

## References

- [ADR-0200: rbx-memory as a Standalone First-Class Service](../../../rbx-governance/docs/adr/ADR-0200-rbx-memory-standalone-service.md)
- [ADR-0010: Thalamus Slim-Down and Ecosystem Reorganization](../../../rbx-governance/docs/adr/ADR-0010-thalamus-slim-down-and-ecosystem-reorganization.md)
- [rbx-memory Architecture](../../../../rbx-memory/docs/adr/ADR-0001-rbx-memory-architecture.md)
