<script lang="ts">
  import { apiFetch } from "$lib/api-client";
  import type { MissionDetail, BoundaryReviewOutcome } from "$lib/types";
  import { page } from "$app/stores";

  const code = $derived($page.params.code);

  let detail = $state<MissionDetail | null>(null);
  let loading = $state(true);
  let error = $state("");
  let actionMsg = $state("");

  async function load() {
    loading = true;
    error = "";
    try {
      detail = await apiFetch<MissionDetail>(`/api/missions/${code}`);
    } catch (e) {
      error = (e as Error).message;
    }
    loading = false;
  }

  load();

  function fmt(iso?: string): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  }

  function duration(): string {
    if (!detail?.started_at) return "—";
    const end = detail.completed_at ? new Date(detail.completed_at) : new Date();
    const s = Math.floor((end.getTime() - new Date(detail.started_at).getTime()) / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  function statusColor(s: string): string {
    if (s === "running") return "cyan";
    if (s === "delivered") return "amber";
    if (s === "completed" || s === "approved") return "green";
    if (s === "stopped" || s === "rejected") return "red";
    return "muted";
  }

  const gateLabel: Record<string, string> = {
    open: "⏳ Awaiting approval",
    approved: "✓ Approved",
    rejected: "✗ Rejected",
  };

  function outcomeColor(o: BoundaryReviewOutcome): string {
    if (o === "CLEAR")   return "green";
    if (o === "PROPOSE") return "cyan";
    if (o === "ESCALATE") return "amber";
    return "red"; // REFUSE
  }

  const outcomeLabel: Record<BoundaryReviewOutcome, string> = {
    CLEAR:    "✓ Clear",
    PROPOSE:  "~ Propose",
    ESCALATE: "⚠ Escalate",
    REFUSE:   "✗ Refuse",
  };
</script>

<div class="back"><a href="/missions">← Missions</a></div>

{#if loading}
  <p class="muted">Loading...</p>
{:else if error}
  <p class="err">{error}</p>
{:else if detail}
  <div class="header">
    <div>
      <span class="code">{detail.mission_code}</span>
      <span class="badge badge-{statusColor(detail.status)}">{detail.status}</span>
      {#if detail.risk_level}
        <span class="risk risk-{detail.risk_level}">{detail.risk_level}</span>
      {/if}
    </div>
  </div>

  <div class="grid">
    <section class="card">
      <h2>Contract</h2>
      <dl>
        <dt>Objective</dt>
        <dd class="objective">{detail.objective}</dd>
        <dt>Type</dt>
        <dd class="mono">{detail.type}</dd>
        <dt>Repo</dt>
        <dd class="mono">{detail.repo}</dd>
        {#if detail.contract?.base_branch}
          <dt>Branch</dt>
          <dd class="mono">{detail.contract.base_branch}</dd>
        {/if}
        {#if detail.contract?.max_runtime}
          <dt>Max runtime</dt>
          <dd class="mono">{detail.contract.max_runtime}</dd>
        {/if}
      </dl>
    </section>

    <section class="card">
      <h2>Execution</h2>
      <dl>
        <dt>Runner</dt>
        <dd class="mono">{detail.runner_id ?? "—"}</dd>
        <dt>Started</dt>
        <dd>{fmt(detail.started_at)}</dd>
        <dt>Completed</dt>
        <dd>{fmt(detail.completed_at)}</dd>
        <dt>Duration</dt>
        <dd class="mono">{duration()}</dd>
        {#if detail.stop_reason}
          <dt>Stop reason</dt>
          <dd class="mono warn">{detail.stop_reason}</dd>
        {/if}
        {#if detail.executor}
          <dt>Executor</dt>
          <dd class="mono">{detail.executor}</dd>
        {/if}
        {#if detail.input_tokens != null}
          <dt>Tokens in</dt>
          <dd class="mono">{detail.input_tokens.toLocaleString()}</dd>
        {/if}
        {#if detail.output_tokens != null}
          <dt>Tokens out</dt>
          <dd class="mono">{detail.output_tokens.toLocaleString()}</dd>
        {/if}
      </dl>
    </section>
  </div>

  <section class="card gate-card">
    <h2>Gate</h2>
    <p class="gate-status gate-{detail.gates_state}">{gateLabel[detail.gates_state] ?? detail.gates_state}</p>
    {#if detail.status === "delivered" && detail.gates_state === "open"}
      <p class="gate-note">
        Merge requires human approval. Review the PR in the repository, then
        record the decision via <code>rbx-maestro</code> mission run endpoints.
      </p>
      <div class="gate-links">
        {#if detail.contract?.repo}
          <a href="https://github.com/{detail.contract.repo}/pulls" target="_blank" rel="noreferrer" class="btn-primary">
            Open PRs on GitHub →
          </a>
        {/if}
      </div>
    {/if}
  </section>

  {#if detail.boundary_review}
    {@const br = detail.boundary_review}
    <section class="card br-card">
      <h2>Boundary Review</h2>
      <div class="br-outcome">
        <span class="badge badge-{outcomeColor(br.outcome)}">{outcomeLabel[br.outcome]}</span>
        <span class="br-date muted">{fmt(br.created_at)}</span>
      </div>
      {#if br.summary}
        <p class="br-summary">{br.summary}</p>
      {/if}
      {#if br.resolution}
        <div class="br-resolution">
          <span class="muted">Resolution:</span> {br.resolution}
          {#if br.resolved_by}
            <span class="muted"> — {br.resolved_by}</span>
          {/if}
          {#if br.resolved_at}
            <span class="muted"> at {fmt(br.resolved_at)}</span>
          {/if}
        </div>
      {:else if br.outcome === "ESCALATE" || br.outcome === "REFUSE"}
        <p class="br-pending-resolution warn">
          Human resolution required before this mission can be approved.
        </p>
      {/if}
    </section>
  {/if}

  {#if actionMsg}
    <p class="action-msg">{actionMsg}</p>
  {/if}
{/if}

<style>
  .back { margin-bottom: 1rem; font-size: 0.85rem; }
  .header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .code { font-family: monospace; font-size: 1.1rem; color: #e0e0e8; margin-right: 0.4rem; }

  .badge { padding: 0.2rem 0.55rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600; }
  .badge-cyan   { background: rgba(34,211,238,0.15); color: #22d3ee; }
  .badge-amber  { background: rgba(251,191,36,0.15); color: #fbbf24; }
  .badge-green  { background: rgba(52,211,153,0.15); color: #34d399; }
  .badge-red    { background: rgba(248,113,113,0.15); color: #f87171; }
  .badge-muted  { background: rgba(100,100,120,0.15); color: #888; }

  .risk { padding: 0.15rem 0.4rem; border-radius: 3px; font-size: 0.7rem; text-transform: uppercase; }
  .risk-low    { background: rgba(52,211,153,0.1);  color: #34d399; }
  .risk-medium { background: rgba(251,191,36,0.1);  color: #fbbf24; }
  .risk-high   { background: rgba(248,113,113,0.1); color: #f87171; }

  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
  @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } }

  .card { background: #14141f; border: 1px solid #1e1e2e; border-radius: 8px; padding: 1.2rem; }
  h2 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em; color: #555; margin-bottom: 0.8rem; }

  dl { display: grid; grid-template-columns: auto 1fr; gap: 0.35rem 1rem; font-size: 0.85rem; }
  dt { color: #666; white-space: nowrap; }
  dd { color: #c0c0d0; }
  .objective { color: #e0e0e8; grid-column: 1 / -1; }
  .mono { font-family: monospace; }
  .warn { color: #fbbf24; }

  .gate-card { margin-bottom: 1rem; }
  .gate-status { font-size: 1rem; margin-bottom: 0.6rem; }
  .gate-open     { color: #fbbf24; }
  .gate-approved { color: #34d399; }
  .gate-rejected { color: #f87171; }
  .gate-note { color: #888; font-size: 0.85rem; margin-bottom: 0.8rem; line-height: 1.5; }
  .gate-links { display: flex; gap: 0.75rem; }
  .btn-primary {
    padding: 0.5rem 1.1rem; background: #22d3ee; color: #0a0a0f;
    border-radius: 6px; font-size: 0.85rem; font-weight: 600;
  }
  .btn-primary:hover { background: #06b6d4; text-decoration: none; }

  .muted { color: #666; }
  .err { color: #f87171; }
  .action-msg { margin-top: 1rem; color: #34d399; font-size: 0.9rem; }
  code { background: #1e1e2e; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.85rem; }

  .br-card { margin-bottom: 1rem; }
  .br-outcome { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.6rem; }
  .br-date { font-size: 0.8rem; }
  .br-summary { color: #c0c0d0; font-size: 0.85rem; line-height: 1.5; margin-bottom: 0.5rem; }
  .br-resolution { font-size: 0.85rem; color: #c0c0d0; margin-top: 0.4rem; }
  .br-pending-resolution { font-size: 0.85rem; margin-top: 0.4rem; }
</style>
