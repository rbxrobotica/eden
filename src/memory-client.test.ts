import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { listMemories, readMemory } from "./memory-client.ts";

const memory = {
  key: "governance/decisions/mem-2026-00001.md",
  frontmatter: { id: "mem-2026-00001" },
  body: "private memory",
};
const originalUrl = process.env.RBX_MEMORY_URL;
const originalToken = process.env.RBX_MEMORY_TOKEN;
let server: ReturnType<typeof Bun.serve>;
let requests: Request[];

beforeEach(() => {
  requests = [];
  server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      requests.push(request);
      if (request.headers.get("authorization") !== "Bearer test-memory-token") {
        return Response.json({ error: { code: "unauthorized", message: "invalid bearer token", errors: [] } }, { status: 401 });
      }
      const url = new URL(request.url);
      if (url.pathname.endsWith("/missing")) return new Response(null, { status: 404 });
      return Response.json(url.pathname === "/v1/memory" ? [memory] : memory);
    },
  });
  process.env.RBX_MEMORY_URL = `http://127.0.0.1:${server.port}`;
  process.env.RBX_MEMORY_TOKEN = "test-memory-token";
});

afterEach(() => {
  server.stop(true);
  if (originalUrl === undefined) delete process.env.RBX_MEMORY_URL;
  else process.env.RBX_MEMORY_URL = originalUrl;
  if (originalToken === undefined) delete process.env.RBX_MEMORY_TOKEN;
  else process.env.RBX_MEMORY_TOKEN = originalToken;
});

describe("authenticated memory reads", () => {
  test("read sends bearer token and preserves encoded key", async () => {
    expect(await readMemory(memory.key)).toEqual(memory);
    expect(requests[0].method).toBe("GET");
    expect(new URL(requests[0].url).pathname).toBe(`/v1/memory/${encodeURIComponent(memory.key)}`);
    expect(requests[0].headers.get("authorization")).toBe("Bearer test-memory-token");
  });

  test("list sends bearer token and preserves filters", async () => {
    expect(await listMemories({ domain: "governance", entity_type: "decision", status: "active" })).toEqual([memory]);
    expect(requests[0].method).toBe("GET");
    expect(new URL(requests[0].url).searchParams.toString()).toBe("domain=governance&entity_type=decision&status=active");
    expect(requests[0].headers.get("authorization")).toBe("Bearer test-memory-token");
  });

  test("authenticated missing memory remains null", async () => {
    expect(await readMemory("missing")).toBeNull();
    expect(requests).toHaveLength(1);
  });

  test("missing local token fails before any network request", async () => {
    delete process.env.RBX_MEMORY_TOKEN;
    await expect(readMemory(memory.key)).rejects.toThrow("RBX_MEMORY_TOKEN is not set");
    await expect(listMemories()).rejects.toThrow("RBX_MEMORY_TOKEN is not set");
    expect(requests).toHaveLength(0);
  });

  test("invalid token refusal is surfaced by both read operations", async () => {
    process.env.RBX_MEMORY_TOKEN = "wrong-token";
    await expect(readMemory(memory.key)).rejects.toThrow("rbx-memory authorization failed");
    await expect(listMemories()).rejects.toThrow("rbx-memory authorization failed");
    expect(requests).toHaveLength(2);
  });
});
