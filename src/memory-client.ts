/**
 * memory-client.ts — Thin HTTP client for rbx-memory delegation.
 *
 * Reads RBX_MEMORY_URL from the environment.
 * When unset, Eden falls back to the direct-S3 path in memory.ts.
 *
 * This is the delegation seam introduced per ADR-0200 / ADR-0010.
 */

import type {
  MemoryDomain,
  MemoryFrontmatter,
  MemoryEntry,
} from "./memory.ts";

function getBaseUrl(): string {
  const url = process.env.RBX_MEMORY_URL;
  if (!url) {
    throw new Error(
      "RBX_MEMORY_URL is not set. Configure the environment variable to enable memory delegation.",
    );
  }
  return url.replace(/\/$/, "");
}

function ok(res: Response): Response {
  if (!res.ok) {
    throw new Error(`rbx-memory returned ${res.status}: ${res.statusText}`);
  }
  return res;
}

// --- Delegation client methods ---

export async function nextMemoryId(domain: MemoryDomain): Promise<string> {
  const res = ok(
    await fetch(`${getBaseUrl()}/api/memory/next-id?domain=${encodeURIComponent(domain)}`),
  );
  const data = (await res.json()) as { id: string };
  if (!data.id) throw new Error("rbx-memory did not return an id");
  return data.id;
}

export async function writeMemory(
  fm: MemoryFrontmatter,
  body: string,
  product?: string,
): Promise<string> {
  const res = ok(
    await fetch(`${getBaseUrl()}/api/memory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frontmatter: fm, body, product }),
    }),
  );
  const data = (await res.json()) as { key: string };
  if (!data.key) throw new Error("rbx-memory did not return a key");
  return data.key;
}

export async function readMemory(
  key: string,
): Promise<{ frontmatter: MemoryFrontmatter; body: string } | null> {
  const id = encodeURIComponent(key);
  const res = await fetch(`${getBaseUrl()}/api/memory/${id}`);
  if (res.status === 404) return null;
  ok(res);
  const data = (await res.json()) as {
    frontmatter: MemoryFrontmatter;
    body: string;
  };
  return data;
}

export async function listMemories(prefix: string): Promise<MemoryEntry[]> {
  const res = ok(
    await fetch(
      `${getBaseUrl()}/api/memory?prefix=${encodeURIComponent(prefix)}`,
    ),
  );
  return (await res.json()) as MemoryEntry[];
}

export async function findMemoryById(id: string): Promise<string | null> {
  const res = await fetch(`${getBaseUrl()}/api/memory/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  ok(res);
  const data = (await res.json()) as { key?: string };
  return data.key ?? null;
}

export async function seedProductMemory(
  productName: string,
  author: string,
  owner: string,
): Promise<string> {
  const res = ok(
    await fetch(`${getBaseUrl()}/api/memory/seed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_name: productName, author, owner }),
    }),
  );
  const data = (await res.json()) as { key: string };
  if (!data.key) throw new Error("rbx-memory did not return a key");
  return data.key;
}
