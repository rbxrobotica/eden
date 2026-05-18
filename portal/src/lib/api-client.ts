const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("eden_token") : null;
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? res.statusText);
  }
  return res.json();
}

export async function checkToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/health`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
