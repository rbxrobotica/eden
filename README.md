# Eden

**RBX Internal Developer Platform — CLI**

**Guia central Eden + Catalog:** `rbx-infra/docs/EDEN-CATALOG-IMPLEMENTATION-GUIDE.md`

Este README cobre o uso local do Eden. O fluxo completo entre Eden,
`rbx-infra`, `rbx-catalog-registry`, `rbx-catalog-api` e
`rbx-catalog-console` é definido no guia central.

Eden é a CLI que provisiona novos produtos na infraestrutura RBX em um único comando. Ela gera manifests Kubernetes, registra o produto no catálogo legado e no catálogo runtime, faz commit nos repositórios necessários e aplica o ArgoCD Application — tudo automaticamente.

---

## Instalação

```bash
git clone https://github.com/rbxrobotica/eden
cd eden
bun install
bun run build        # gera o binário ./eden
```

---

## Uso

```bash
# Interativo — Eden faz as perguntas
eden new

# Não-interativo
eden new my-api       --type=api        --domain=my-api.rbx.ia.br
eden new my-front     --type=web-static --domain=my-front.rbx.ia.br
eden new my-app       --type=fullstack  --domain=my-app.rbx.ia.br --backend-domain=api.my-app.rbx.ia.br
eden new my-agent     --type=agent      --product=strategos --role=analyst
eden new my-tool      --type=cli
eden new my-api       --type=api        --domain=my-api.rbx.ia.br --catalog-domain=platform

# Dry run — gera os arquivos sem commitar nem aplicar
eden new my-api --type=api --domain=my-api.rbx.ia.br --dry-run

# Listar produtos registrados
eden list
```

Flag opcional para qualquer tipo:

| Flag | Descrição |
|---|---|
| `--catalog-domain` | Domínio/taxonomia usado no `rbx-catalog-registry`. Se omitido, Eden usa o produto dono do agente ou o nome do produto. |

---

## Tipos de produto

| Tipo | Descrição |
|---|---|
| `api` | API REST/gRPC com ingress HTTP. Usa templates do `rbx-infra/apps/base/api/` |
| `web-static` | Frontend estático (Next.js, Astro, SPA). Usa templates de `apps/base/web-static/` |
| `fullstack` | Frontend + backend + Redis em um namespace. Manifests gerados inline |
| `agent` | Agente AI com manifest rbx-harness + K8s. Ver seção abaixo |
| `cli` | Ferramenta CLI — registrada no catálogo sem deployment K8s |

---

## Tipo `agent` e integração com rbx-harness

Ao criar um produto do tipo `agent`, o Eden gera o manifest de governança no formato do [rbx-harness](https://github.com/rbxrobotica/rbx-harness):

```bash
eden new meu-agente --type=agent --product=strategos --role=analyst
```

Flags específicos do tipo agent:

| Flag | Valores | Descrição |
|---|---|---|
| `--product` | `robson` `strategos` `thalamus` `truthmetal` `eden` `platform` | Produto RBX ao qual o agente pertence |
| `--role` | `executor` `advisor` `analyst` `signal-generator` `router` `orchestrator` | Papel do agente conforme rbx-harness spec |

Estrutura gerada em `rbx-infra/apps/prod/meu-agente/`:

```
manifest.yaml              ← contrato rbx-harness (preencha os campos TODO antes de status: active)
schemas/
  request.schema.json      ← schema do payload de entrada
  response.schema.json     ← schema do payload de saída
namespace.yml
middleware-https.yml
deploy.yml
svc.yml
ingress.yml                ← apenas se --domain for fornecido
kustomization.yml
```

O manifesto começa com `status: draft`. O agente não recebe requisições até que o desenvolvedor preencha os campos marcados `TODO` (capabilities, limitations, description) e altere para `status: active`.

---

## O que acontece quando `eden new` roda

```
1. Coleta de inputs (prompts ou flags)
       │
2. Scaffolding dos manifests
   └── rbx-infra/apps/prod/<name>/   ← K8s + manifest.yaml (agent)
       │
3. ArgoCD Application
   └── rbx-infra/gitops/app-of-apps/<name>.yml
       │
4. AppProject — registra o namespace
   └── rbx-infra/gitops/projects/rbx-applications.yaml
       │
5. Catálogo legado — registra metadados de portfólio
   └── rbx-infra/catalog/products.yml
       │
6. Catálogo runtime — registra entidade para API/console
   └── rbx-catalog-registry/catalog/<entity-type>/<name>.yaml
       │
7. git add + commit + push → rbx-infra e rbx-catalog-registry
       │
8. kubectl apply → ArgoApp aplicado imediatamente no cluster
       │
9. ArgoCD sincroniza apps/prod/<name>/ → produto ativo em ~30s
```

---

## Configuração

Eden lê `~/.eden.yml`. Se o arquivo não existir, usa defaults:

```yaml
# ~/.eden.yml
infra_path: ~/apps/rbx-infra          # caminho local do repositório rbx-infra
catalog_registry_path: ~/apps/rbx-catalog-registry # catálogo runtime consumido por API/console
github_org: rbxrobotica               # organização GitHub para URLs de repo
default_registry: ghcr.io/rbxrobotica # registry padrão para imagens Docker
kubeconfig: ~/.kube/config-rbx        # kubeconfig do cluster RBX
```

---

## Ciclo de vida dos produtos

O catálogo rastreia a maturidade de cada produto:

| Fase | Significado |
|---|---|
| `seed` | Recém criado — infra provisionada, produto em desenvolvimento |
| `structuring` | Roadmap definido, primeiros usuários internos |
| `expansion` | Crescimento ativo, dependências externas |
| `institutionalized` | Produto estável com SLA e processos de manutenção |

Todo produto criado pelo Eden começa em fase `seed`.

---

## Documentação interna

- [ARCHITECTURE.md](ARCHITECTURE.md) — Detalhes de cada módulo, decisões de design, fluxo completo

---

## Relação com outros projetos RBX

| Projeto | Relação |
|---|---|
| [rbx-infra](https://github.com/rbxrobotica/rbx-infra) | Repositório GitOps onde Eden escreve todos os manifests |
| [rbx-harness](https://github.com/rbxrobotica/rbx-harness) | Define o schema do manifest.yaml gerado para agentes |
| [rbx-catalog-registry](https://github.com/rbxrobotica/rbx-catalog-registry) | Catálogo runtime onde Eden registra entidades para API/console |
| [rbx-catalog-api](https://github.com/rbxrobotica/rbx-catalog-api) | Serve as entidades do rbx-catalog-registry |
| [rbx-catalog-console](https://github.com/rbxrobotica/rbx-catalog-console) | UI que navega o catálogo servido pela API |

---

## Licença

Open source.
