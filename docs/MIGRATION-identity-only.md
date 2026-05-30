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
  `eden memory` commands route through the delegation client (`src/memory-client.ts`) to the live `rbx-memory` `/v1` API. Write operations also require `RBX_MEMORY_TOKEN` and call the bearer-token protected endpoints.

- **`RBX_MEMORY_URL` is unset** (default today)  
  `eden memory` commands continue to use the existing direct-S3 path. Behavior is **identical** to today.

## Timeline

1. **Increment 1** — Delegation client and config switch were added. Direct-S3 path remained the default and fully functional.
2. **This increment** — The delegation client is aligned to the real `rbx-memory` `/v1` contract: `POST /v1/memory`, `GET /v1/memory/{id}`, `GET /v1/memory?domain=&entity_type=&status=`, and `POST /v1/memory/{id}/supersede`.
3. **Final step, after deployment validation** — Once `rbx-memory` is deployed and validated in an environment, remove Eden's direct-S3 path. That removal is out of scope here; no live S3 or live HTTP calls are required for this increment.

## References

- [ADR-0200: rbx-memory as a Standalone First-Class Service](../../../rbx-governance/docs/adr/ADR-0200-rbx-memory-standalone-service.md)
- [ADR-0010: Thalamus Slim-Down and Ecosystem Reorganization](../../../rbx-governance/docs/adr/ADR-0010-thalamus-slim-down-and-ecosystem-reorganization.md)
- [rbx-memory Architecture](../../../../rbx-memory/docs/adr/ADR-0001-rbx-memory-architecture.md)
