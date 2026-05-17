/**
 * commands/new.ts — Comando `eden new`
 *
 * Orquestra o provisionamento completo de um novo produto RBX. É o único lugar
 * onde todos os módulos do Eden se encontram em sequência.
 *
 * Fluxo para tipos com K8s (api, web-static, fullstack, agent):
 *   1. Coleta inputs (interativo com @clack/prompts ou via flags CLI)
 *   2. Chama o scaffolder do tipo para gerar manifests em rbx-infra/apps/prod/<name>/
 *   3. Gera o ArgoCD Application em rbx-infra/gitops/app-of-apps/<name>.yml
 *   4. Adiciona o namespace ao AppProject em rbx-infra/gitops/projects/rbx-applications.yaml
 *   5. Registra o produto em rbx-infra/catalog/products.yml
 *   6. Registra a entidade runtime em rbx-catalog-registry/catalog/
 *   7. Commit e push nos repositórios alterados
 *   8. kubectl apply do ArgoApp (sync imediato sem esperar o polling do ArgoCD)
 *
 * Fluxo para tipo cli:
 *   1. Coleta nome e repo
 *   2. Registra nos catálogos (sem K8s, sem ArgoApp)
 *
 * Tipo agent tem inputs adicionais: product (qual produto RBX) e role (papel do agente
 * per rbx-harness spec). O scaffolder de agent gera também o manifest.yaml rbx-harness.
 */

import * as p from "@clack/prompts";
import { loadConfig } from "../config.ts";
import { addProduct, type Product, type ProductType } from "../catalog.ts";
import { addRuntimeEntity } from "../runtime-catalog.ts";
import { generateArgoApp } from "../argocd.ts";
import { addDestination } from "../appproject.ts";
import { gitAdd, gitCommit, gitHasChanges, gitPush } from "../git.ts";
import { applyArgoApp } from "../kubectl.ts";
import { scaffoldApi } from "../scaffolders/api.ts";
import { scaffoldWebStatic } from "../scaffolders/web-static.ts";
import { scaffoldFullstack } from "../scaffolders/fullstack.ts";
import { scaffoldAgent } from "../scaffolders/agent.ts";
import { seedProductMemory } from "../memory.ts";

interface NewArgs {
  name?: string;
  type?: string;
  domain?: string;
  backendDomain?: string;
  image?: string;
  product?: string;
  role?: string;
  catalogDomain?: string;
  dryRun?: boolean;
}

export async function commandNew(args: NewArgs): Promise<void> {
  const config = loadConfig();

  p.intro("Eden — New Product");

  const name = args.name ?? (await p.text({
    message: "Product name",
    placeholder: "my-product",
    validate: (v) => v.length < 2 ? "Name too short" : undefined,
  }) as string);

  const type = args.type ?? (await p.select({
    message: "Product type",
    options: [
      { value: "api", label: "api — backend API / service" },
      { value: "web-static", label: "web-static — static frontend" },
      { value: "fullstack", label: "fullstack — frontend + backend + redis" },
      { value: "agent", label: "agent — AI agent service" },
      { value: "cli", label: "cli — CLI tool (no k8s deployment)" },
    ],
  }) as string);

  if (p.isCancel(name) || p.isCancel(type)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  const namespace = name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const today = new Date().toISOString().split("T")[0];

  if (type === "cli") {
    const repo = args.domain ?? (await p.text({
      message: "GitHub repo URL",
      placeholder: `https://github.com/${config.github_org}/${name}`,
    }) as string);

    const product: Product = {
      name,
      type: "cli",
      phase: "seed",
      namespace: null,
      domains: [],
      repo: repo as string,
      owner: config.github_org,
      created: today,
      description: "",
    };

    if (!args.dryRun) {
      addProduct(config.infra_path, product);
      addRuntimeEntity(config.catalog_registry_path, product, {
        catalogDomain: args.catalogDomain,
      });
      commitAndPushIfChanged(config.infra_path, `feat(${name}): register cli product via Eden\n\nCo-Authored-By: Eden CLI <noreply@rbx.ia.br>`, "main");
      commitAndPushIfChanged(config.catalog_registry_path, `feat(${name}): register runtime catalog entity via Eden\n\nCo-Authored-By: Eden CLI <noreply@rbx.ia.br>`);

      trySeedMemory(config.s3_memory_bucket, name, config.github_org);
    }

    p.outro(`Product "${name}" registered in catalog (CLI — no k8s deployment).`);
    return;
  }

  // Agent-specific prompts
  let agentProduct: string | undefined = args.product;
  let agentRole: string | undefined = args.role;

  if (type === "agent") {
    if (!agentProduct) {
      agentProduct = (await p.select({
        message: "Which RBX product does this agent belong to?",
        options: [
          { value: "robson", label: "robson" },
          { value: "strategos", label: "strategos" },
          { value: "thalamus", label: "thalamus" },
          { value: "truthmetal", label: "truthmetal" },
          { value: "eden", label: "eden" },
          { value: "platform", label: "platform" },
        ],
      }) as string);
    }

    if (!agentRole) {
      agentRole = (await p.select({
        message: "Agent role",
        options: [
          { value: "executor", label: "executor — takes actions in external systems" },
          { value: "advisor", label: "advisor — provides recommendations" },
          { value: "analyst", label: "analyst — analyzes data and produces reports" },
          { value: "signal-generator", label: "signal-generator — emits typed signals" },
          { value: "router", label: "router — routes signals between agents" },
          { value: "orchestrator", label: "orchestrator — coordinates multiple agents" },
        ],
      }) as string);
    }

    if (p.isCancel(agentProduct) || p.isCancel(agentRole)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
  }

  let domain = args.domain;
  let backendDomain: string | undefined = args.backendDomain;

  if (type === "agent") {
    const wantDomain = await p.confirm({
      message: "Expose this agent via HTTP ingress?",
      initialValue: false,
    });
    if (p.isCancel(wantDomain)) { p.cancel("Cancelled."); process.exit(0); }
    if (wantDomain) {
      domain = (await p.text({
        message: "Domain",
        placeholder: `${name}.rbx.ia.br`,
      }) as string);
    }
  } else {
    if (!domain) {
      domain = (await p.text({
        message: type === "fullstack" ? "Frontend domain" : "Domain",
        placeholder: `${name}.rbx.ia.br`,
      }) as string);
    }

    if (type === "fullstack" && !backendDomain) {
      backendDomain = (await p.text({
        message: "Backend domain",
        placeholder: `api.${name}.rbx.ia.br`,
      }) as string);
    }
  }

  const image = args.image ?? `${config.default_registry}/${name}`;
  const product: Product = {
    name,
    type: type as ProductType,
    phase: "seed",
    namespace,
    domains: domain ? (type === "fullstack" ? [domain, backendDomain!] : [domain]) : [],
    repo: `https://github.com/${config.github_org}/${name}`,
    owner: config.github_org,
    created: today,
    description: "",
  };

  const s = p.spinner();
  s.start("Scaffolding manifests...");

  if (!args.dryRun) {
    if (type === "api") {
      scaffoldApi(config.infra_path, name, domain!, image);
    } else if (type === "web-static") {
      scaffoldWebStatic(config.infra_path, name, domain!, image);
    } else if (type === "fullstack") {
      scaffoldFullstack(config.infra_path, name, domain!, backendDomain!, image);
    } else if (type === "agent") {
      scaffoldAgent(config.infra_path, name, {
        product: agentProduct!,
        role: agentRole!,
        domain: domain,
        image,
      });
    }

    generateArgoApp(config.infra_path, name, namespace);
    addDestination(config.infra_path, namespace);
    addProduct(config.infra_path, product);
    addRuntimeEntity(config.catalog_registry_path, product, {
      agentProduct,
      agentRole,
      catalogDomain: args.catalogDomain,
    });
  }

  s.stop("Manifests generated.");

  if (!args.dryRun) {
    const s2 = p.spinner();
    s2.start("Committing and pushing catalog state...");
    commitAndPushIfChanged(config.infra_path, `feat(${name}): scaffold ${type} product via Eden\n\nCo-Authored-By: Eden CLI <noreply@rbx.ia.br>`, "main");
    commitAndPushIfChanged(config.catalog_registry_path, `feat(${name}): register runtime catalog entity via Eden\n\nCo-Authored-By: Eden CLI <noreply@rbx.ia.br>`);
    s2.stop("Pushed catalog state.");

    const s3 = p.spinner();
    s3.start("Applying ArgoCD Application...");
    applyArgoApp(config.infra_path, name, config.kubeconfig);
    s3.stop("ArgoCD Application created.");

    trySeedMemory(config.s3_memory_bucket, name, config.github_org);
  }

  p.outro(`Product "${name}" is live. ArgoCD will sync in ~30s.`);
}

function commitAndPushIfChanged(repoPath: string, message: string, branch?: string): void {
  gitAdd(repoPath);
  if (!gitHasChanges(repoPath)) return;
  gitCommit(repoPath, message);
  gitPush(repoPath, branch);
}

function trySeedMemory(bucket: string, productName: string, githubOrg: string): void {
  const s = p.spinner();
  s.start("Seeding initial product memory...");
  seedProductMemory(bucket, productName, `@${githubOrg}`, githubOrg)
    .then((key) => s.stop(`Memory seeded at s3://${bucket}/${key}`))
    .catch(() => s.stop("Memory seeding skipped (S3 not configured)."));
}
