# Eden — Glossary

**Version:** 0.3.0
**Last updated:** 2026-05-17
**Maintained by:** RBX Systems
**Authority:** rbx-governance ADR-0001 (Institutional Memory Architecture)

This glossary defines the canonical nomenclature for Eden and all repositories
that consume its definitions (rbx-infra, rbx-harness, rbx-catalog-registry,
rbx-catalog-api, rbx-catalog-console, rbx-governance, strategos, thalamus-core).

When multiple terms exist for the same concept, the "Canonical" column marks
the preferred form. Aliases may appear in code or CLI flags for ergonomics but
should not be used in documentation or cross-repo contracts.

---

## 1. Product Types

Products are the fundamental units Eden manages. Each type determines the
scaffolding strategy and the resulting Kubernetes manifests.

| Type | CLI Flag | Scaffold | K8s Deployment | Description |
|---|---|---|---|---|
| `api` | `--type=api` | Template-based (rbx-infra) | Yes | REST/gRPC service with HTTP ingress |
| `web-static` | `--type=web-static` | Template-based (rbx-infra) | Yes | Static frontend (Next.js, Astro, SPA) |
| `fullstack` | `--type=fullstack` | Inline | Yes | Frontend + backend + Redis in one namespace |
| `agent` | `--type=agent` | Inline + rbx-harness | Yes | AI agent with governance manifest |
| `cli` | `--type=cli` | None | No | CLI tool — catalog registration only |

---

## 2. Maturity Phases

Every product tracked by Eden progresses through lifecycle phases. Phase
assignment starts at `seed` on creation and advances manually.

| Phase | Runtime Mapping | Meaning |
|---|---|---|
| `seed` | `experimental` | Just created — infrastructure provisioned, product in active development |
| `structuring` | `experimental` | Roadmap defined, first internal users onboarded |
| `expansion` | `active` | Active growth, acquiring external users or dependencies |
| `institutionalized` | `active` | Stable product with SLA, maintenance processes, and established ops |

The "Runtime Mapping" column shows how phases translate in the
`rbx-catalog-registry` entities consumed by the API and console.

---

## 3. Agent Roles

Agents are a specialized product type (`--type=agent`). Every agent declares a
role that determines its behavioral contract within the rbx-harness framework.

| Role | CLI Flag | Description |
|---|---|---|
| `executor` | `--role=executor` | Executes concrete actions (trades, deployments, writes) |
| `advisor` | `--role=advisor` | Provides recommendations without direct action |
| `analyst` | `--role=analyst` | Analyzes data and produces reports/signals |
| `signal-generator` | `--role=signal-generator` | Emits events/triggers for other agents or systems |
| `router` | `--role=router` | Routes requests between agents or services |
| `orchestrator` | `--role=orchestrator` | Coordinates multi-agent workflows |

---

## 4. Agent Status

Agents have a two-stage activation model enforced by rbx-harness.

| Status | Meaning |
|---|---|
| `draft` | Scaffolded but incomplete — TODO fields must be filled before activation |
| `active` | Fully specified and receiving requests via the harness |

---

## 5. RBX Products

The top-level products in the RBX ecosystem. Each product owns namespaces,
agents, and catalog entries.

| Product | Description |
|---|---|
| `robson` | Crypto trading engine — position management, exchange integration |
| `strategos` | AI agent orchestration — agent lifecycle, channel management (WhatsApp, etc.) |
| `thalamus` | Semantic control layer for AI traffic — pre-call decisions, post-call validation |
| `truthmetal` | Data verification and integrity layer |
| `eden` | Internal Developer Platform — product lifecycle management, scaffolding, memory, catalog, portal |
| `platform` | Shared platform infrastructure (rbx-infra, rbx-harness, catalog stack) |

---

## 6. Eden Operations

The commands Eden exposes for product lifecycle management.

| Operation | CLI | Description |
|---|---|---|
| Create | `eden new` | Scaffold product, register catalogs, apply GitOps |
| List | `eden list` | Display registered products with phase and metadata |
| Dry Run | `eden new --dry-run` | Generate artifacts without committing or applying |
| Memory Write | `eden memory write` | Write memory entity to S3 (interactive or via flags) |
| Memory Read | `eden memory read <id>` | Read and display a memory entity from S3 |
| Memory List | `eden memory list` | List memory entities under a domain/product prefix |
| Memory Seed | `eden memory seed --product=<n>` | Create initial memory for a product |
| Evaluate | (API / Portal) | Assess product maturity and advance lifecycle phase |
| Classify | (Future) | LLM-powered decomposition of text input into product scaffold |

---

## 7. Eden Architecture Layers

Eden operates across four layers. Layers 1–2 are implemented. Layers 3–4 are
planned.

| Layer | Name | Description | Status |
|---|---|---|---|
| **L1** | CLI Scaffolding | `eden new`, `eden list` — generates manifests, registers catalogs, applies GitOps | Implemented |
| **L2** | Memory & Lifecycle | Product memories, specs, maturity evaluation, integration with rbx-governance memory layer | Planned |
| **L3** | Portal (Web UI) | Independent frontend — text-based product creation, lifecycle dashboard, permission gates before K8s operations | Planned |
| **L4** | AI Classification | LLM-powered text-to-scaffold decomposition, Thalamus integration for agent routing | Roadmap |

---

## 7. Memory Integration

Eden integrates with the RBX Institutional Memory Layer (defined in
rbx-governance ADR-0001) to store and retrieve product knowledge.

### Storage

| Property | Value |
|---|---|
| **Backend** | S3 bucket (`rbx-memory`) — same storage as all RBX memory |
| **Namespace** | `product/eden/` — product memories managed by Eden |
| **Per-product path** | `product/{product-name}/` — each product gets a sub-namespace |
| **Format** | Markdown + YAML frontmatter (per `memory-frontmatter-schema.yaml`) |
| **Schema authority** | `rbx-governance/docs/standards/memory-frontmatter-schema.yaml` |
| **Governance** | `rbx-governance/docs/standards/namespace-rules.yaml` |

### Memory Entity Types Used by Eden

| Entity Type | Path Pattern | Description |
|---|---|---|
| `decision` | `product/{name}/decisions/{id}.md` | Product-level architecture decisions |
| `snapshot` | `product/{name}/snapshots/{date}.md` | Periodic state capture of product maturity |
| `standard` | `product/{name}/standards/{topic}.md` | Product-specific standards derived from governance |
| `template` | `product/{name}/templates/{name}.md` | Reusable spec templates for agent scaffolding |
| `runbook` | `product/{name}/runbooks/{name}.md` | Operational procedures for the product |
| `roadmap` | `product/{name}/roadmap/{name}.md` | Product roadmap and milestone tracking |

### Frontmatter Convention

Eden-written memory entities follow the standard frontmatter from
`memory-frontmatter-schema.yaml`:

```yaml
---
id: mem-2026-XXXXX           # Unique ID (rbx-governance namespace)
domain: product               # Eden writes to the "product" domain
entity_type: decision         # From controlled vocabulary
created_at: 2026-05-17T10:00:00Z
updated_at: 2026-05-17T10:00:00Z
author: "@leandrodamasio"     # or agent:eden for automated entries
owner: eden                   # Eden is responsible for these entities
status: active                # draft | active | superseded | archived
tags: [product, lifecycle]
related: [mem-2026-YYYYY]    # Cross-references to other memory entities
source_system: eden
retention_class: permanent    # Product memories are permanent
---
```

### Open Metadata Cataloging

Eden product memories are registered in Open Metadata (via Thalamus integration):

- Each `product/{name}/` path is a **dataset** in Open Metadata
- Schema derived from `memory-frontmatter-schema.yaml`
- Enables **lineage tracking**: product decision → agent spec → deployed agent
- Eden registers new datasets when `eden new` creates a product

---

## 8. Portal (Eden Web UI)

Eden will have an independent web frontend — the **Eden Portal** — serving as
the primary human interface for product lifecycle management.

### Identity

| Property | Value |
|---|---|
| **Name** | Eden Portal |
| **Domain** | TBD (suggested: `eden.rbx.ia.br` or `portal.rbx.ia.br`) |
| **Stack** | TBD (SvelteKit aligned with RBX frontend convention per ADR-0033) |
| **Deployment** | k3s in-cluster via rbx-infra GitOps |
| **Auth** | TBD (Bearer token or SSO aligned with RBX platform) |

### Relationship to rbx-catalog-console

| Aspect | Eden Portal | rbx-catalog-console |
|---|---|---|
| **Purpose** | Create, manage, evaluate products | Browse product catalog (read-only) |
| **Access** | Internal, permissioned | Public or internal read |
| **Operations** | Write (memory, specs, K8s with gates) | Read only |
| **Cross-link** | Links to catalog console for public view | Links to Eden portal for product owners |
| **Independence** | Separate app, separate deployment | Separate app, separate deployment |

### Permission Gates

K8s operations (`eden new`, deploy, scale) require explicit permission steps:

| Gate | Description | Enforced By |
|---|---|---|
| `text-input` | User describes intent in natural language | Portal UI |
| `review` | User reviews generated scaffold before submission | Portal UI |
| `approve` | Explicit approval to apply K8s changes | Portal UI + API |
| `apply` | K8s manifest applied with audit trail | Eden API |

---

## 10. Catalog Types

Eden writes to two catalog systems with distinct purposes.

| Catalog | Location | Purpose |
|---|---|---|
| Legacy Catalog | `rbx-infra/catalog/products.yml` | Portfolio metadata consumed by Eden CLI (`eden list`) |
| Runtime Catalog | `rbx-catalog-registry/catalog/` | Entity registry consumed by `rbx-catalog-api` and `rbx-catalog-console` |

Runtime catalog entity types:

| Entity Type | Directory | Source Product Type |
|---|---|---|
| `agents` | `catalog/agents/<name>.yaml` | `agent` |
| `services` | `catalog/services/<name>.yaml` | `api` |
| `products` | `catalog/products/<name>.yaml` | `web-static`, `fullstack`, `cli` |

---

## 11. Infrastructure Concepts

Terms related to the Kubernetes and GitOps layer Eden manages.

| Term | Description |
|---|---|
| `AppProject` | ArgoCD resource grouping namespaces — Eden adds products to `rbx-applications` |
| `ArgoApp` | ArgoCD Application manifest — Eden generates per-product and applies via kubectl |
| `App of Apps` | Pattern in `rbx-infra/gitops/app-of-apps/` — each product gets one YAML |
| `Scaffold` | Set of generated Kubernetes manifests for a product type |
| `Template` | Parameterized YAML files in `rbx-infra/apps/base/` used by api and web-static scaffolders |
| `Namespace` | Kubernetes namespace — generated with environment and Istio labels |
| `Kustomization` | Resource list — generated per product to reference all manifests |

---

## 12. Configuration

| Key | File | Description |
|---|---|---|
| `infra_path` | `~/.eden.yml` | Local path to rbx-infra repository |
| `catalog_registry_path` | `~/.eden.yml` | Local path to rbx-catalog-registry repository |
| `github_org` | `~/.eden.yml` | GitHub organization for repository URLs |
| `default_registry` | `~/.eden.yml` | Container image registry |
| `kubeconfig` | `~/.eden.yml` | Kubeconfig path for cluster access |

---

## 13. Cross-Repo References

How Eden relates to other RBX repositories.

| Repository | Relation | Eden Interaction |
|---|---|---|
| `rbx-infra` | GitOps source of truth | Eden writes manifests, ArgoApps, AppProject entries, legacy catalog |
| `rbx-harness` | Agent governance schema | Eden generates `manifest.yaml` per rbx-harness spec for `--type=agent` |
| `rbx-catalog-registry` | Runtime entity storage | Eden writes entities to `catalog/<entity-type>/<name>.yaml` |
| `rbx-catalog-api` | Catalog REST API | Reads what Eden writes (no direct Eden interaction) |
| `rbx-catalog-console` | Catalog web UI (catalog.rbx.ia.br) | Cross-linked but independent — Eden Portal links to console for public view |
| `rbx-governance` | Memory layer contracts | Eden reads frontmatter schema, namespace rules, retention policies; writes memories to S3 under `product/eden/` |
| `strategos-core` | Agent orchestration | Eden agents register under `--product=strategos`; Eden memory integrates with Strategos strategic memory |
| `thalamus-core` | AI traffic control | Agent manifests reference Thalamus protocol (ADR-0001); future LLM routing via Thalamus for text-to-scaffold |

---

## Conventions

- **Canonical nomenclature** follows the pattern: the term as written in this
  glossary is the authoritative form for all documentation, ADRs, and
  cross-repo contracts.
- **CLI flags** may use kebab-case aliases (e.g., `--catalog-domain`) but
  documentation should use the canonical term.
- **Versioning**: when this glossary changes in ways that affect code contracts
  (product types, phases, roles), bump the version header and note the change.
  Additive changes (new terms) are minor. Removal or rename of existing terms
  is major.

---

## Changelog

### v0.3.0 (2026-05-17) — Minor (additive)

- Added memory CLI commands: write, read, list, seed
- Updated section 6 with concrete CLI syntax
- Memory write supports inline body and `--editor` flag

### v0.2.0 (2026-05-17) — Minor (additive)

- Added Eden Architecture Layers (L1–L4) with implementation status
- Added Memory Integration section: S3 storage, namespace convention,
  frontmatter alignment with rbx-governance ADR-0001
- Added Portal section: Eden Web UI identity, relationship with
  rbx-catalog-console, permission gates
- Added `rbx-governance` to cross-repo references
- Added operations: Memory Write, Memory Read, Evaluate, Classify
- Updated Eden product description to include memory and portal
- Added Open Metadata cataloging convention

### v0.1.0 (2026-05-17) — Initial

- Product types, maturity phases, agent roles, agent status
- RBX products, Eden operations, catalog types
- Infrastructure concepts, configuration, cross-repo references

---

## Roadmap

| Phase | Scope | Dependencies | Status |
|---|---|---|---|
| **E1** | CLI v0.1 (scaffolding, catalog) | rbx-infra, rbx-catalog-registry | Done |
| **E2** | Memory write/read via S3 | rbx-governance ADR-0001, S3 bucket, frontmatter schema | Planned |
| **E3** | Memory API (read/write for agents and portal) | E2, Eden API service | Planned |
| **E4** | Eden Portal (web UI) | E3, SvelteKit, auth | Planned |
| **E5** | Text-to-scaffold classification (LLM) | E4, Thalamus integration | Roadmap |
| **E6** | External product potential | E5, multi-tenancy, billing | Future |
