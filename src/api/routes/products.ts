import { Hono } from "hono";
import { loadConfig } from "../../config.ts";
import { readCatalog } from "../../catalog.ts";
import { existsSync } from "fs";
import { join } from "path";

const products = new Hono();

// GET /api/products
products.get("/api/products", (c) => {
  const config = loadConfig();
  const infraPath = process.env.EDEN_INFRA_PATH || config.infra_path;
  const catalogPath = join(infraPath, "catalog", "products.yml");

  if (!existsSync(catalogPath)) {
    return c.json(
      { error: "Catalog not available", detail: "Product catalog filesystem not mounted in this environment" },
      503,
    );
  }

  const catalog = readCatalog(infraPath);
  return c.json(catalog);
});

export { products };
