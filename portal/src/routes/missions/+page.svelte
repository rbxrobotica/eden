<script lang="ts">
  import { apiFetch } from "$lib/api-client";
  import type { MissionListResponse, MissionSummary, MissionStatus } from "$lib/types";

  let data = $state<MissionListResponse | null>(null);
  let loading = $state(true);
  let error = $state("");
  let cursor = $state("");

  async function load(c = "") {
    loading = true;
    error = "";
    try {
      const qs = c ? `?cursor=${encodeURIComponent(c)}` : "";
      data = await apiFetch<MissionListResponse>(`/api/missions${qs}`);
    } catch (e) {
      error = (e as Error).message;
    }
    loading = false;
  }

  load();

  function statusColor(s: MissionStatus): string {
    if (s === "running") return "cyan";
    if (s === "delivered") return "amber";
    if (s === "completed" || s === "approved") return "green";
    if (s === "stopped" || s === "rejected") return "red";
    return "muted";
  }

  function ago(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  function duration(m: MissionSummary): string {
    if (!m.started_at) return "—";
    const end = m.completed_at ? new Date(m.completed_at) : new Date();
    const s = Math.floor((end.getTime() - new Date(m.started_at).getTime()) / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }
</script>

<div class="header">
  <h1>Missions</h1>
  <a href="/missions/new" class="btn-new">+ New Mission</a>
</div>

{#if loading}
  <p class="muted">Loading...</p>
{:else if error}
  <p class="err">{error}</p>
{:else if !data || data.missions.length === 0}
  <p class="muted">No missions yet.</p>
{:else}
  <table>
    <thead>
      <tr>
        <th>Code</th>
        <th>Type</th>
        <th>Repo</th>
        <th>Risk</th>
        <th>Status</th>
        <th>Runner</th>
        <th>Duration</th>
        <th>Age</th>
      </tr>
    </thead>
    <tbody>
      {#each data.missions as m (m.mission_code)}
        <tr onclick={() => (window.location.href = `/missions/${m.mission_code}`)}>
          <td class="code"><a href="/missions/{m.mission_code}">{m.mission_code}</a></td>
          <td class="mono">{m.type}</td>
          <td class="mono">{m.repo}</td>
          <td><span class="risk risk-{m.risk_level}">{m.risk_level}</span></td>
          <td><span class="badge badge-{statusColor(m.status)}">{m.status}</span></td>
          <td class="mono muted">{m.runner_id ?? "—"}</td>
          <td class="mono muted">{duration(m)}</td>
          <td class="muted">{ago(m.created_at)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  {#if data.next_cursor}
    <div class="pagination">
      <button onclick={() => load(data!.next_cursor)}>Load more</button>
    </div>
  {/if}
{/if}

<style>
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.2rem; }
  h1 { font-size: 1.4rem; color: #e0e0e8; }
  .btn-new {
    padding: 0.45rem 1rem; background: #22d3ee; color: #0a0a0f;
    border-radius: 6px; font-size: 0.85rem; font-weight: 600;
  }
  .btn-new:hover { background: #06b6d4; text-decoration: none; }
  .muted { color: #666; font-size: 0.85rem; }
  .err { color: #f87171; }
  .mono { font-family: monospace; font-size: 0.85rem; }

  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  thead tr { border-bottom: 1px solid #1e1e2e; }
  th { text-align: left; padding: 0.5rem 0.75rem; color: #666; font-weight: 500; font-size: 0.8rem; }
  tbody tr { border-bottom: 1px solid #14141f; cursor: pointer; transition: background 0.1s; }
  tbody tr:hover { background: #14141f; }
  td { padding: 0.6rem 0.75rem; vertical-align: middle; }

  .code a { color: #22d3ee; font-family: monospace; font-size: 0.85rem; }

  .badge { padding: 0.2rem 0.55rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
  .badge-cyan   { background: rgba(34,211,238,0.15); color: #22d3ee; }
  .badge-amber  { background: rgba(251,191,36,0.15); color: #fbbf24; }
  .badge-green  { background: rgba(52,211,153,0.15); color: #34d399; }
  .badge-red    { background: rgba(248,113,113,0.15); color: #f87171; }
  .badge-muted  { background: rgba(100,100,120,0.15); color: #888; }

  .risk { padding: 0.15rem 0.4rem; border-radius: 3px; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .risk-low    { background: rgba(52,211,153,0.1);  color: #34d399; }
  .risk-medium { background: rgba(251,191,36,0.1);  color: #fbbf24; }
  .risk-high   { background: rgba(248,113,113,0.1); color: #f87171; }

  .pagination { margin-top: 1.2rem; text-align: center; }
  .pagination button {
    padding: 0.5rem 1.5rem; background: #14141f; border: 1px solid #2a2a3a;
    color: #a0a0b0; border-radius: 6px; cursor: pointer; font-size: 0.85rem;
  }
  .pagination button:hover { border-color: #22d3ee; color: #22d3ee; }
</style>
