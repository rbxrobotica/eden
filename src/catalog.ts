/**
 * catalog.ts — Registro de produtos RBX
 *
 * O catálogo legado de produtos vive em rbx-infra/catalog/products.yml e é
 * versionado junto com a infra.
 * Esse arquivo preserva metadados de portfólio que ainda não existem no
 * catálogo runtime: fase de maturidade, domínios, repositório e descrição.
 *
 * Cada entrada registra nome, tipo, fase de maturidade, namespace, domínios,
 * repo GitHub e data de criação. O rbx-catalog-registry é atualizado em paralelo
 * por runtime-catalog.ts para servir rbx-catalog-api e rbx-catalog-console.
 *
 * Fases de maturidade:
 *   seed             — recém criado, em desenvolvimento inicial
 *   structuring      — roadmap definido, primeiros usuários internos
 *   expansion        — crescimento ativo, dependências externas surgindo
 *   institutionalized — produto estável com SLA e processos estabelecidos
 */

import { readFileSync, writeFileSync } from "fs";
import { parse, stringify } from "yaml";
import { join } from "path";

export type ProductPhase = "seed" | "structuring" | "expansion" | "institutionalized";
export type ProductType = "web-static" | "api" | "fullstack" | "agent" | "cli";

export interface Product {
  name: string;
  type: ProductType;
  phase: ProductPhase;
  namespace: string | null;
  domains: string[];
  repo: string;
  owner: string;
  created: string;
  description: string;
}

interface Catalog {
  products: Product[];
}

/** Deserializa o catálogo e retorna a lista de produtos. */
export function readCatalog(infraPath: string): Product[] {
  const path = join(infraPath, "catalog/products.yml");
  const raw = readFileSync(path, "utf-8");
  const catalog = parse(raw) as Catalog;
  return catalog.products;
}

/**
 * Insere ou atualiza um produto no catálogo (upsert por nome).
 * Preserva o cabeçalho do arquivo para manter legibilidade do YAML.
 */
export function addProduct(infraPath: string, product: Product): void {
  const path = join(infraPath, "catalog/products.yml");
  const raw = readFileSync(path, "utf-8");
  const catalog = parse(raw) as Catalog;

  const existing = catalog.products.findIndex((p) => p.name === product.name);
  if (existing >= 0) {
    catalog.products[existing] = product;
  } else {
    catalog.products.push(product);
  }

  writeFileSync(path, "# RBX Product Catalog — source of truth for Eden IDP\n# Lifecycle phases: seed | structuring | expansion | institutionalized\n\n" + stringify(catalog));
}
