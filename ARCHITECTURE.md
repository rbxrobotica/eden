# ARCHITECTURE — Eden

---

## Visão geral

Eden é uma CLI TypeScript/Bun que age como orquestrador de bootstrapping. Ela não gerencia infraestrutura diretamente — ela **gera artefatos GitOps** e os aplica via ArgoCD. O estado vive no `rbx-infra`; Eden é o automatizador que produz esse estado.

```
Developer
    │
    ▼
  eden new <name> --type=<type>
    │
    ├─── Scaffolder         → gera manifests em rbx-infra/apps/prod/<name>/
    ├─── generateArgoApp()  → gera rbx-infra/gitops/app-of-apps/<name>.yml
    ├─── addDestination()   → atualiza rbx-infra/gitops/projects/rbx-applications.yaml
    ├─── addProduct()       → atualiza rbx-infra/catalog/products.yml
    ├─── git push           → rbx-infra main → ArgoCD detecta mudança
    └─── kubectl apply      → aplica o ArgoApp imediatamente (não espera o sync)
```

---

## Estrutura de arquivos

```
src/
├── index.ts               ← Entrypoint CLI: parse de args, dispatch para comandos
├── config.ts              ← Carrega ~/.eden.yml com defaults sensatos
├── catalog.ts             ← Lê/escreve rbx-infra/catalog/products.yml
├── argocd.ts              ← Gera o manifesto ArgoCD Application
├── appproject.ts          ← Adiciona namespace ao AppProject rbx-applications
├── git.ts                 ← Wrapper de git add/commit/push no rbx-infra
├── kubectl.ts             ← Wrapper de kubectl apply para o ArgoApp
│
├── commands/
│   ├── new.ts             ← Comando principal: coleta inputs, orquestra o fluxo
│   └── list.ts            ← Lê o catalog e exibe tabela formatada
│
└── scaffolders/
    ├── api.ts             ← Gera manifests K8s para APIs REST (via templates do rbx-infra)
    ├── web-static.ts      ← Gera manifests K8s para frontends estáticos
    ├── fullstack.ts       ← Gera manifests K8s inline: frontend + backend + Redis
    └── agent.ts           ← Gera manifests K8s + manifest.yaml rbx-harness para agentes AI
```

---

## Módulos em detalhe

### `index.ts` — Entrypoint

Responsabilidade única: parsear `process.argv` e despachar para o comando correto.

Não contém lógica de negócio. O parseador de flags é mínimo propositalmente: Eden não precisa de uma biblioteca de CLI completa porque tem poucos comandos e flags simples.

### `config.ts` — Configuração

Carrega `~/.eden.yml` com `yaml.parse`, aplicando defaults para quem nunca criou o arquivo. Os defaults apontam para os caminhos convencionais do ambiente RBX.

**Por que arquivo em `~/.eden.yml` e não variáveis de ambiente?** Porque os valores mudam raramente (infra_path, github_org) e convém persistir entre sessões sem precisar setar env vars. Variáveis de ambiente ficam para segredos (tokens, kubeconfig sensível).

### `catalog.ts` — Catálogo de produtos

O catálogo é o registro canônico de todos os produtos RBX. Vive em `rbx-infra/catalog/products.yml`.

- `readCatalog()` — deserializa o YAML e retorna a lista de produtos
- `addProduct()` — faz upsert: se o produto já existe (por nome), atualiza; se não, acrescenta

O catálogo é a fonte de verdade para `eden list` e para ferramentas externas (rbx-catalog-api, Éden UI futura).

### `argocd.ts` — ArgoCD Application

Gera um manifesto `Application` do ArgoCD que aponta para o diretório `apps/prod/<name>` no `rbx-infra`. Quando esse manifesto é aplicado no cluster, o ArgoCD começa a sincronizar o produto automaticamente.

**Opções relevantes geradas:**
- `syncPolicy.automated.prune: true` — remove recursos que foram deletados do Git
- `syncPolicy.automated.selfHeal: true` — reverte alterações manuais no cluster
- `ServerSideApply: true` — usa SSA para melhor gerenciamento de conflicts

### `appproject.ts` — AppProject

O `rbx-applications` é o AppProject ArgoCD que define quais namespaces os produtos podem usar. Cada produto novo precisa ter seu namespace declarado aqui ou o ArgoCD recusa o sync.

`addDestination()` é idempotente: verifica se o namespace já está na lista antes de inserir.

### `git.ts` — Git wrapper

Wraps simples sobre `git add -A`, `git commit -m`, `git push origin main` executados no diretório `rbx-infra`. Usa `spawnSync` (síncrono) porque o fluxo do `new` é sequencial e precisa garantir que o push ocorreu antes de aplicar o ArgoApp.

Lança erro se qualquer operação git falhar — o chamador (commands/new.ts) verá o erro via spinner.

### `kubectl.ts` — kubectl wrapper

Aplica o manifesto ArgoApp recém-gerado diretamente no cluster via `kubectl apply -f`. Isso inicia o sync imediatamente, sem esperar que o ArgoCD detecte a mudança no Git por polling.

O `KUBECONFIG` é injetado como variável de ambiente a partir da configuração `~/.eden.yml`, permitindo que Eden aponte para clusters diferentes sem alterar o kubeconfig do sistema.

---

## Scaffolders

Os scaffolders são as funções que materializam os manifestos Kubernetes e, no caso de agentes, o manifesto rbx-harness.

### `api.ts` e `web-static.ts` — Template-based scaffolders

Esses scaffolders leem templates do diretório `apps/base/` do `rbx-infra` (onde ficam os YAMLs parametrizados com `__NAME__`, `__DOMAIN__`, `__IMAGE__`) e os instanciam para o produto específico.

**Por que templates externos?** Porque as equipes de infra precisam poder atualizar os templates base (ex: mudar recursos de CPU/memória, adicionar sidecars) sem precisar alterar o Eden. O Eden é um cliente dos templates, não o proprietário deles.

Arquivos gerados por produto:
```
namespace.yml           ← Namespace K8s com labels de ambiente e Istio
middleware-https.yml    ← Traefik Middleware de redirect HTTP→HTTPS
deploy.yml              ← Deployment com readiness/liveness probes
svc.yml                 ← Service ClusterIP
ingress.yml             ← Ingress Traefik com TLS via cert-manager
kustomization.yml       ← Kustomization que lista todos os recursos
```

Além disso, uma cópia do `namespace.yml` vai para `core/namespaces/<name>.yml` — convenção do `rbx-infra` para namespaces gerenciados centralmente.

### `fullstack.ts` — Inline scaffolder

Não usa templates externos: gera os manifestos como strings TypeScript. Isso porque fullstack tem mais componentes (frontend + backend + Redis) e a parametrização de templates separados seria mais complexa do que o ganho.

Gera 10 arquivos: namespace, middleware, frontend-deploy, frontend-svc, frontend-ingress, backend-deploy, backend-svc, backend-ingress, redis-deploy, redis-svc.

### `agent.ts` — rbx-harness scaffolder

O scaffolder mais rico. Além dos manifestos K8s básicos, gera o `manifest.yaml` de acordo com o [schema rbx-harness v0.1](https://github.com/rbxrobotica/rbx-harness/blob/main/spec/manifest.schema.json).

**Diferenças em relação aos outros scaffolders:**

| Característica | api / web-static | agent |
|---|---|---|
| Ingress | Sempre gerado | Opcional (agents são geralmente internos) |
| manifest.yaml rbx-harness | Não | Sim |
| request/response schemas | Não | Sim (em schemas/) |
| Campos TODO | Não | Sim — `capabilities`, `limitations`, `description` precisam ser preenchidos antes de `status: active` |

O manifesto gerado começa com `status: draft`. O agente só começa a receber requisições quando um humano preenche os campos TODO e altera para `status: active`. Isso é intencional — o harness não permite ativar um agente com campos em branco.

---

## Fluxo completo de `eden new`

```
1. Coleta inputs (interativo ou via flags)
   ├── name
   ├── type
   └── type-specific: domain, backendDomain, product, role, etc.

2. Instancia o scaffolder correto
   ├── api         → scaffoldApi()
   ├── web-static  → scaffoldWebStatic()
   ├── fullstack   → scaffoldFullstack()
   ├── agent       → scaffoldAgent()   ← + manifest.yaml rbx-harness
   └── cli         → (sem scaffolder K8s, só catalog)

3. Gera ArgoCD Application
   └── generateArgoApp() → gitops/app-of-apps/<name>.yml

4. Registra namespace no AppProject
   └── addDestination() → gitops/projects/rbx-applications.yaml

5. Registra produto no catalog
   └── addProduct() → catalog/products.yml

6. Commit e push no rbx-infra
   └── git add -A → git commit → git push origin main

7. Aplica o ArgoApp no cluster
   └── kubectl apply -f gitops/app-of-apps/<name>.yml

8. ArgoCD sincroniza apps/prod/<name>/ → cluster ativo em ~30s
```

---

## Ciclo de vida dos produtos

O catálogo rastreia a fase de maturidade de cada produto:

| Fase | Significado |
|---|---|
| `seed` | Recém criado — infraestrutura provisionada, produto em desenvolvimento |
| `structuring` | Produto com roadmap definido e primeiros usuários internos |
| `expansion` | Em crescimento ativo, adquirindo usuários ou dependências externas |
| `institutionalized` | Produto estável, com SLA e processos de manutenção estabelecidos |

Eden cria todos os produtos em fase `seed`. A progressão de fase é manual — editando `catalog/products.yml` diretamente ou via futura interface do Éden.

---

## Relação com rbx-harness

Eden e rbx-harness são complementares:

- **rbx-harness** define *o que é um agente RBX* (schema do manifesto, protocolo Thalamus, loop de execução)
- **Eden** define *como você cria e opera um agente RBX* (scaffolding, provisionamento K8s, registro no catalog)

Quando `eden new --type=agent` é executado, o Eden materializa o contrato do rbx-harness como arquivos no repositório do agente. O manifesto gerado é o ponto de partida; cabe ao desenvolvedor do agente preenchê-lo com as capabilities e limitations reais antes de ativar.

---

## Decisões de design

**Por que Bun e não Node.js?**
Velocidade de startup e execução de scripts TypeScript sem transpilação prévia. Para uma CLI que roda em modo interativo, o tempo de inicialização importa.

**Por que não usar um framework de CLI (Commander, Yargs, etc.)?**
Eden tem dois comandos e flags simples. A complexidade de uma dependência de framework de CLI não se justifica. O parser de flags tem 8 linhas.

**Por que os scaffolders não escrevem diretamente no repo do produto?**
Porque Eden não tem acesso ao repo do produto no momento da criação — ele gerencia apenas o `rbx-infra`. Os artefatos do produto em si (código fonte, Dockerfile, AGENTS.md) são responsabilidade do desenvolvedor. Eden provê apenas a camada de infra.

**Por que git push síncrono e não async?**
O fluxo `new` precisa que o push tenha ocorrido antes de aplicar o ArgoApp, para evitar que o ArgoCD sync falhe por não encontrar o path ainda. Operação síncrona é mais simples e mais correta aqui.
