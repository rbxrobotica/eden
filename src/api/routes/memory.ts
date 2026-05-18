import { Hono } from "hono";
import { loadConfig } from "../../config.ts";
import {
  type MemoryDomain,
  type MemoryEntityType,
  type MemoryFrontmatter,
  type MemoryStatus,
  type RetentionClass,
  DOMAINS,
  ENTITY_TYPES,
  STATUSES,
  RETENTION_CLASSES,
  listMemories,
  readMemory,
  findMemoryById,
  writeMemory,
  nextMemoryId,
} from "../../memory.ts";

const memory = new Hono();

function getConfig() {
  const config = loadConfig();
  return {
    ...config,
    s3_memory_bucket: process.env.EDEN_S3_BUCKET || config.s3_memory_bucket,
  };
}

// GET /api/memory?prefix=&domain=&product=
memory.get("/api/memory", async (c) => {
  const { s3_memory_bucket: bucket } = getConfig();
  const prefix = c.req.query("prefix");
  const domain = c.req.query("domain");
  const product = c.req.query("product");

  let effectivePrefix = prefix;
  if (!effectivePrefix) {
    const d = domain || "product";
    if (d === "product" && product) {
      effectivePrefix = `product/${product}/`;
    } else {
      effectivePrefix = `${d}/`;
    }
  }

  const entries = await listMemories(bucket, effectivePrefix!);
  return c.json(entries);
});

// GET /api/memory/:id
memory.get("/api/memory/:id", async (c) => {
  const { s3_memory_bucket: bucket } = getConfig();
  const id = c.req.param("id");

  let key = id;
  if (!id.includes("/")) {
    const found = await findMemoryById(bucket, id);
    if (!found) {
      return c.json({ error: `Memory ${id} not found` }, 404);
    }
    key = found;
  }

  const result = await readMemory(bucket, key);
  if (!result) {
    return c.json({ error: "Could not parse memory content" }, 422);
  }

  return c.json({ ...result, key });
});

// POST /api/memory
memory.post("/api/memory", async (c) => {
  const { s3_memory_bucket: bucket } = getConfig();
  const body = await c.req.json();

  const domain = body.domain as MemoryDomain;
  const entityType = body.entity_type as MemoryEntityType;
  const product = body.product as string | undefined;

  if (!domain || !DOMAINS.includes(domain)) {
    return c.json({ error: `Invalid domain. Must be one of: ${DOMAINS.join(", ")}` }, 400);
  }
  if (!entityType || !ENTITY_TYPES.includes(entityType)) {
    return c.json({ error: `Invalid entity_type. Must be one of: ${ENTITY_TYPES.join(", ")}` }, 400);
  }
  if (domain === "product" && !product) {
    return c.json({ error: "product is required when domain is 'product'" }, 400);
  }
  if (!body.author) {
    return c.json({ error: "author is required" }, 400);
  }
  if (!body.body) {
    return c.json({ error: "body is required" }, 400);
  }

  const status: MemoryStatus = STATUSES.includes(body.status) ? body.status : "draft";
  const retentionClass: RetentionClass = RETENTION_CLASSES.includes(body.retention_class)
    ? body.retention_class
    : "2years";

  const id = await nextMemoryId(bucket, domain);
  const now = new Date().toISOString();

  const fm: MemoryFrontmatter = {
    id,
    domain,
    entity_type: entityType,
    created_at: now,
    updated_at: now,
    author: body.author,
    owner: body.owner || "eden",
    status,
    source_system: "eden-api",
    retention_class: retentionClass,
    tags: body.tags,
  };

  const key = await writeMemory(bucket, fm, body.body, product);
  return c.json({ key, id }, 201);
});

export { memory };
