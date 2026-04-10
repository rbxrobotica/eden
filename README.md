# Eden

**RBX Internal Developer Platform — CLI**

Eden automates provisioning of new products on the RBX Kubernetes infrastructure using GitOps. It scaffolds Kubernetes manifests, registers the product in the RBX catalog, commits to `rbx-infra`, and applies the ArgoCD Application in one command.

---

## Install

```bash
# From source (requires Bun)
git clone https://github.com/rbxrobotica/eden
cd eden
bun install
bun run build        # produces ./eden binary
```

---

## Usage

```bash
# Interactive
eden new

# Non-interactive
eden new my-api       --type=api       --domain=my-api.rbx.ia.br
eden new my-front     --type=web-static --domain=my-front.rbx.ia.br
eden new my-app       --type=fullstack  --domain=my-app.rbx.ia.br --backend-domain=api.my-app.rbx.ia.br
eden new my-agent     --type=agent     --product=strategos --role=analyst
eden new my-tool      --type=cli

# Dry run (generates output without committing or applying)
eden new my-api --type=api --domain=my-api.rbx.ia.br --dry-run

# List registered products
eden list
```

### Product types

| Type | Description |
|---|---|
| `api` | Backend API / service with HTTP ingress |
| `web-static` | Static frontend (Next.js, etc.) |
| `fullstack` | Frontend + backend + Redis |
| `agent` | AI agent — scaffolds rbx-harness manifest + K8s deployment |
| `cli` | CLI tool — registers in catalog, no K8s deployment |

### Agent-specific flags

| Flag | Values | Description |
|---|---|---|
| `--product` | `robson` `strategos` `thalamus` `truthmetal` `eden` `platform` | Which RBX product the agent belongs to |
| `--role` | `executor` `advisor` `analyst` `signal-generator` `router` `orchestrator` | Agent role per rbx-harness spec |

---

## What `eden new --type=agent` generates

```
apps/prod/<name>/
├── manifest.yaml            ← rbx-harness agent manifest (fill in the TODOs)
├── schemas/
│   ├── request.schema.json  ← request payload schema template
│   └── response.schema.json ← response payload schema template
├── namespace.yml
├── middleware-https.yml
├── deploy.yml
├── svc.yml
├── ingress.yml              ← only if --domain is provided
└── kustomization.yml
```

The `manifest.yaml` follows the [rbx-harness spec](https://github.com/rbxrobotica/rbx-harness). After scaffolding, fill in the `TODO` fields before setting `status: active`.

---

## Configuration

Eden reads `~/.eden.yml` for defaults:

```yaml
infra_path: ~/apps/rbx-infra
github_org: rbxrobotica
default_registry: ghcr.io/rbxrobotica
kubeconfig: ~/.kube/config-rbx
```

---

## How it works

```
eden new <name> --type=<type>
  │
  ├── scaffoldManifests()    → writes to rbx-infra/apps/prod/<name>/
  ├── generateArgoApp()      → writes rbx-infra/apps/argocd/<name>.yml
  ├── addDestination()       → updates rbx-infra/appproject.yaml
  ├── addProduct()           → updates rbx-infra/catalog/products.yml
  ├── git add + commit + push → pushes to rbx-infra (triggers ArgoCD sync)
  └── kubectl apply          → creates ArgoCD Application immediately
```

---

## Integration with rbx-harness

Eden uses the [rbx-harness](https://github.com/rbxrobotica/rbx-harness) manifest schema when scaffolding agent products. The generated `manifest.yaml` is a valid starting point for any RBX agent:

- Schema: `https://rbxsystems.com/schemas/rbx-harness/v0.1/manifest`
- All required fields are pre-filled with sensible defaults
- `TODO` markers indicate fields that require human input
- `status: draft` — the agent will not receive requests until set to `active`

---

## License

Open source. See [LICENSE](LICENSE).
