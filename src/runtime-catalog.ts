/**
 * runtime-catalog.ts — Registro no rbx-catalog-registry
 *
 * Mantém o catálogo runtime consumido por rbx-catalog-api e rbx-catalog-console.
 * O catálogo legado em rbx-infra/catalog/products.yml continua guardando campos
 * de portfólio do Eden (phase, repo, domains, description). Este módulo grava a
 * representação runtime compatível com schemas/entity.schema.yaml.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { parse, stringify } from "yaml";
import type { Product, ProductType } from "./catalog.ts";

type RuntimeEntityType = "agent" | "product" | "loop" | "tool" | "service";
type RuntimeStatus = "active" | "deprecated" | "experimental";
type InteractionMode = "sync" | "async" | "stream" | "hybrid";
type DeliveryMode = "single" | "stream" | "evented" | "batch";
type ExecutionRole = "background" | "interactive" | "orchestrator" | "sidecar";
type CompositionMode = "composable" | "embedded" | "infrastructure" | "standalone";
type InvocationSurface = "api" | "chat" | "cli" | "event";
type LoopDependency = "none" | "optional" | "required";

interface RuntimeCatalogEntity {
  name: string;
  entity_type: RuntimeEntityType;
  domain: string;
  interaction_mode?: InteractionMode;
  delivery_mode?: DeliveryMode;
  execution_role?: ExecutionRole;
  composition_mode?: CompositionMode;
  invocation_surface?: InvocationSurface;
  shared_across_products?: boolean;
  loop_dependency?: LoopDependency;
  inputs?: string[];
  outputs?: string[];
  side_effects?: string[];
  responsibilities?: string[];
  owner?: string;
  status: RuntimeStatus;
  version: string;
}

const ENTITY_DIRS: Record<RuntimeEntityType, string> = {
  agent: "agents",
  product: "products",
  loop: "loops",
  tool: "tools",
  service: "services",
};

interface RuntimeProductOptions {
  agentProduct?: string;
  agentRole?: string;
  catalogDomain?: string;
}

export function addRuntimeEntity(
  registryPath: string,
  product: Product,
  opts: RuntimeProductOptions = {},
): void {
  const entity = toRuntimeEntity(product, opts);
  const path = findExistingEntityPath(registryPath, entity.name) ?? entityPath(registryPath, entity);
  mkdirSync(dirname(path), { recursive: true });

  const existing = existsSync(path) ? parse(readFileSync(path, "utf-8")) as Record<string, unknown> : {};
  writeFileSync(path, stringify({ ...existing, ...entity }));
}

function toRuntimeEntity(product: Product, opts: RuntimeProductOptions): RuntimeCatalogEntity {
  const entityType = entityTypeForProduct(product.type);
  const profile = profileForProduct(product.type, opts.agentRole);

  return {
    name: product.name,
    entity_type: entityType,
    domain: normalizeDomain(opts.catalogDomain ?? opts.agentProduct ?? product.name),
    ...profile,
    shared_across_products: product.type === "agent" ? false : undefined,
    loop_dependency: product.type === "agent" ? "required" : "none",
    owner: product.owner,
    status: statusForPhase(product.phase),
    version: "v0",
  };
}

function entityTypeForProduct(type: ProductType): RuntimeEntityType {
  if (type === "agent") return "agent";
  if (type === "api") return "service";
  return "product";
}

function profileForProduct(type: ProductType, agentRole?: string): Pick<
  RuntimeCatalogEntity,
  "interaction_mode" | "delivery_mode" | "execution_role" | "composition_mode" | "invocation_surface"
> {
  switch (type) {
    case "api":
      return {
        interaction_mode: "sync",
        delivery_mode: "single",
        execution_role: "interactive",
        composition_mode: "composable",
        invocation_surface: "api",
      };
    case "agent":
      return {
        interaction_mode: "async",
        delivery_mode: agentRole === "signal-generator" || agentRole === "router" ? "evented" : "single",
        execution_role: agentRole === "orchestrator" ? "orchestrator" : "background",
        composition_mode: "composable",
        invocation_surface: "api",
      };
    case "cli":
      return {
        interaction_mode: "sync",
        delivery_mode: "single",
        execution_role: "interactive",
        composition_mode: "standalone",
        invocation_surface: "cli",
      };
    case "fullstack":
      return {
        interaction_mode: "hybrid",
        delivery_mode: "single",
        execution_role: "interactive",
        composition_mode: "standalone",
        invocation_surface: "api",
      };
    case "web-static":
      return {
        interaction_mode: "sync",
        delivery_mode: "single",
        execution_role: "interactive",
        composition_mode: "standalone",
        invocation_surface: "api",
      };
  }
}

function statusForPhase(phase: Product["phase"]): RuntimeStatus {
  if (phase === "expansion" || phase === "institutionalized") return "active";
  return "experimental";
}

function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function entityPath(registryPath: string, entity: RuntimeCatalogEntity): string {
  return join(registryPath, "catalog", ENTITY_DIRS[entity.entity_type], `${entity.name}.yaml`);
}

function findExistingEntityPath(registryPath: string, name: string): string | null {
  for (const dir of Object.values(ENTITY_DIRS)) {
    const path = join(registryPath, "catalog", dir, `${name}.yaml`);
    if (existsSync(path)) return path;
  }
  return null;
}
