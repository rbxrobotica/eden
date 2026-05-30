/**
 * memory-client.ts - Thin HTTP client for rbx-memory delegation.
 *
 * Reads RBX_MEMORY_URL from the environment.
 * When unset, Eden falls back to the direct-S3 path in memory.ts.
 *
 * This client is aligned to the rbx-memory /v1 API from ADR-0200.
 */

import type {
  MemoryDomain,
  MemoryEntityType,
  MemoryFrontmatter,
  MemoryEntry,
  MemoryStatus,
} from "./memory.ts";

export interface MemoryResponse {
  key: string;
  frontmatter: MemoryFrontmatter;
  body: string;
}

export interface CreateMemoryResult {
  key: string;
  id: string;
}

interface RbxMemoryErrorBody {
  error?: string;
  errors?: string[];
}

function getBaseUrl(): string {
  const url = process.env.RBX_MEMORY_URL;
  if (!url) {
    throw new Error(
      "RBX_MEMORY_URL is not set. Configure the environment variable to enable memory delegation.",
    );
  }
  return url.replace(/\/$/, "");
}

function getWriteHeaders(): HeadersInit {
  const token = process.env.RBX_MEMORY_TOKEN;
  if (!token) {
    throw new Error(
      "RBX_MEMORY_TOKEN is not set. Configure it to call rbx-memory write endpoints.",
    );
  }
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function parseError(res: Response): Promise<string> {
  let body: RbxMemoryErrorBody | null = null;
  try {
    body = (await res.json()) as RbxMemoryErrorBody;
  } catch {
    // Fall back to HTTP status below.
  }

  if (body?.errors?.length) {
    return body.errors.join("; ");
  }
  if (body?.error) {
    return body.error;
  }
  return res.statusText || `HTTP ${res.status}`;
}

async function ok(res: Response): Promise<Response> {
  if (res.ok) return res;

  const detail = await parseError(res);
  if (res.status === 400) {
    throw new Error(`rbx-memory validation failed: ${detail}`);
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error(`rbx-memory authorization failed: ${detail}`);
  }
  if (res.status === 404) {
    throw new Error(`rbx-memory memory not found: ${detail}`);
  }
  if (res.status === 500) {
    throw new Error(`rbx-memory backend failed: ${detail}`);
  }
  throw new Error(`rbx-memory returned ${res.status}: ${detail}`);
}

function toCreateRequest(
  fm: MemoryFrontmatter,
  body: string,
  product?: string,
): Record<string, unknown> {
  return {
    domain: fm.domain,
    entity_type: fm.entity_type,
    author: fm.author,
    body,
    product,
    owner: fm.owner,
    status: fm.status,
    source_system: fm.source_system,
    retention_class: fm.retention_class,
    tags: fm.tags,
    related: fm.related,
    confidence: fm.confidence,
    source_id: fm.source_id,
    last_synced: fm.last_synced,
  };
}

function entryFromResponse(memory: MemoryResponse): MemoryEntry {
  return {
    key: memory.key,
    lastModified: memory.frontmatter.updated_at
      ? new Date(memory.frontmatter.updated_at)
      : undefined,
  };
}

// rbx-memory allocates ids during POST /v1/memory. There is intentionally no
// delegated next-id endpoint.
export async function nextMemoryId(_domain: MemoryDomain): Promise<string> {
  throw new Error("rbx-memory allocates memory ids during POST /v1/memory");
}

export async function createMemory(
  fm: MemoryFrontmatter,
  body: string,
  product?: string,
): Promise<CreateMemoryResult> {
  const res = await ok(
    await fetch(`${getBaseUrl()}/v1/memory`, {
      method: "POST",
      headers: getWriteHeaders(),
      body: JSON.stringify(toCreateRequest(fm, body, product)),
    }),
  );
  const data = (await res.json()) as CreateMemoryResult;
  if (!data.key || !data.id) {
    throw new Error("rbx-memory did not return key and id");
  }
  return data;
}

export async function writeMemory(
  fm: MemoryFrontmatter,
  body: string,
  product?: string,
): Promise<string> {
  const created = await createMemory(fm, body, product);
  return created.key;
}

export async function readMemory(keyOrId: string): Promise<MemoryResponse | null> {
  const res = await fetch(`${getBaseUrl()}/v1/memory/${encodeURIComponent(keyOrId)}`);
  if (res.status === 404) return null;
  await ok(res);
  return (await res.json()) as MemoryResponse;
}

export async function listMemories(filters?: {
  domain?: MemoryDomain;
  entity_type?: MemoryEntityType;
  status?: MemoryStatus;
}): Promise<MemoryResponse[]> {
  const params = new URLSearchParams();
  if (filters?.domain) params.set("domain", filters.domain);
  if (filters?.entity_type) params.set("entity_type", filters.entity_type);
  if (filters?.status) params.set("status", filters.status);

  const query = params.toString();
  const res = await ok(
    await fetch(`${getBaseUrl()}/v1/memory${query ? `?${query}` : ""}`),
  );
  return (await res.json()) as MemoryResponse[];
}

export async function listMemoryEntries(
  prefix: string,
  filters?: {
    domain?: MemoryDomain;
    entity_type?: MemoryEntityType;
    status?: MemoryStatus;
  },
): Promise<MemoryEntry[]> {
  const memories = await listMemories(filters);
  return memories
    .filter((memory) => memory.key.startsWith(prefix))
    .map(entryFromResponse);
}

export async function findMemoryById(id: string): Promise<string | null> {
  const data = await readMemory(id);
  return data?.key ?? null;
}

export async function supersedeMemory(idOrKey: string): Promise<CreateMemoryResult> {
  const res = await ok(
    await fetch(
      `${getBaseUrl()}/v1/memory/${encodeURIComponent(idOrKey)}/supersede`,
      {
        method: "POST",
        headers: getWriteHeaders(),
      },
    ),
  );
  const data = (await res.json()) as CreateMemoryResult;
  if (!data.key || !data.id) {
    throw new Error("rbx-memory did not return key and id");
  }
  return data;
}

export async function seedProductMemory(
  productName: string,
  author: string,
  owner: string,
): Promise<string> {
  const now = new Date().toISOString();
  const created = await createMemory(
    {
      id: "mem-0000-00000",
      domain: "product",
      entity_type: "decision",
      created_at: now,
      updated_at: now,
      author,
      owner,
      status: "active",
      source_system: "eden",
      retention_class: "permanent",
      tags: [productName, "product-creation"],
    },
    [
      `# ${productName} Creation`,
      "",
      `Product "${productName}" was created via Eden CLI.`,
      "",
      "This is the initial memory entry for this product, seeded automatically at scaffold time.",
    ].join("\n"),
    productName,
  );
  return created.key;
}
