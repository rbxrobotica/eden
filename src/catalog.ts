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

export function readCatalog(infraPath: string): Product[] {
  const path = join(infraPath, "catalog/products.yml");
  const raw = readFileSync(path, "utf-8");
  const catalog = parse(raw) as Catalog;
  return catalog.products;
}

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
