import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

const MAESTRO_URL = process.env.MAESTRO_URL ?? "http://rbx-maestro.rbx-maestro.svc.cluster.local";
const DASHBOARD_KEY = process.env.MAESTRO_DASHBOARD_KEY ?? "";

async function maestroGet<T>(path: string): Promise<T> {
  if (!DASHBOARD_KEY) {
    throw new HTTPException(503, { message: "MAESTRO_DASHBOARD_KEY not configured" });
  }
  const res = await fetch(`${MAESTRO_URL}/api/v1/agent-loop${path}`, {
    headers: { Authorization: `Bearer ${DASHBOARD_KEY}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new HTTPException(res.status as 400 | 401 | 403 | 404 | 500, {
      message: (body as { error?: string }).error ?? res.statusText,
    });
  }
  return res.json() as Promise<T>;
}

export const missions = new Hono();

missions.get("/api/missions", async (c) => {
  const cursor = c.req.query("cursor") ?? "";
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return c.json(await maestroGet(`/missions${qs}`));
});

missions.get("/api/missions/:code", async (c) => {
  const code = c.req.param("code");
  return c.json(await maestroGet(`/missions/${code}`));
});

missions.post("/api/missions/admit", async (c) => {
  if (!DASHBOARD_KEY) {
    throw new HTTPException(503, { message: "MAESTRO_DASHBOARD_KEY not configured" });
  }
  const body = await c.req.json();
  const res = await fetch(`${MAESTRO_URL}/api/v1/agent-loop/missions/admit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DASHBOARD_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new HTTPException(res.status as 400 | 401 | 500, {
      message: (err as { error?: string }).error ?? res.statusText,
    });
  }
  return c.json(await res.json(), 201);
});
