<script lang="ts">
  import { apiFetch } from "$lib/api-client";

  const CANONICAL_STOP_CONDITIONS = [
    "success_criteria_met",
    "attempt_limit_reached",
    "time_limit_reached",
    "cost_limit_reached",
    "high_risk_signal",
    "diff_size_exceeded",
    "persistent_failure",
    "forbidden_action_attempted",
    "human_decision_needed",
  ];

  let title = $state("");
  let type = $state("feature-loop");
  let repo = $state("");
  let base_branch = $state("main");
  let objective = $state("");
  let risk_level = $state("low");
  let executor = $state("claude-haiku");
  let max_runtime = $state("PT30M");
  let max_attempts = $state(3);
  let success_criteria = $state("");

  let submitting = $state(false);
  let error = $state("");

  const MISSION_TYPES = [
    "bugfix-loop",
    "feature-loop",
    "refactor-loop",
    "dependency-upgrade-loop",
    "review-loop",
    "documentation-loop",
    "architecture-proposal-loop",
    "evaluation-loop",
  ];

  const EXECUTORS = [
    { value: "claude-haiku", label: "Claude Haiku (default)" },
    { value: "claude-sonnet", label: "Claude Sonnet" },
    { value: "kimi", label: "Kimi K2.7" },
    { value: "glm", label: "GLM 4.7 (z.ai)" },
    { value: "codex", label: "Codex o4-mini (OpenAI)" },
  ];

  async function submit() {
    error = "";
    if (!title || !repo || !objective || !success_criteria) {
      error = "Title, repo, objective, and success criteria are required.";
      return;
    }
    submitting = true;

    const criteria = success_criteria
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const contract = {
      type,
      title,
      objective,
      repo,
      base_branch,
      allowed_paths: ["**"],
      forbidden_paths: [],
      success_criteria: criteria,
      stop_conditions: CANONICAL_STOP_CONDITIONS,
      max_attempts,
      max_runtime,
      max_cost: "1000000 tokens",
      required_checks: ["ci"],
      human_gates: ["merge"],
      artifacts: ["log", "summary"],
      risk_level,
      owner: "operator",
      status: "designed",
      executor,
    };

    try {
      const resp = await apiFetch<{ id: string; status: string }>("/api/missions/admit", {
        method: "POST",
        body: JSON.stringify(contract),
      });
      window.location.href = `/missions/${resp.id}`;
    } catch (e) {
      error = (e as Error).message;
      submitting = false;
    }
  }
</script>

<div class="back"><a href="/missions">← Missions</a></div>
<h1>New Mission</h1>

<form onsubmit={(e) => { e.preventDefault(); submit(); }}>
  <div class="field">
    <label for="title">Title</label>
    <input id="title" bind:value={title} placeholder="Describe the mission in 8–140 chars" maxlength="140" />
  </div>

  <div class="row">
    <div class="field">
      <label for="type">Type</label>
      <select id="type" bind:value={type}>
        {#each MISSION_TYPES as t}
          <option value={t}>{t}</option>
        {/each}
      </select>
    </div>
    <div class="field">
      <label for="executor">Executor</label>
      <select id="executor" bind:value={executor}>
        {#each EXECUTORS as ex}
          <option value={ex.value}>{ex.label}</option>
        {/each}
      </select>
    </div>
    <div class="field">
      <label for="risk_level">Risk level</label>
      <select id="risk_level" bind:value={risk_level}>
        <option>low</option>
        <option>medium</option>
        <option>high</option>
        <option>restricted</option>
      </select>
    </div>
  </div>

  <div class="row">
    <div class="field grow">
      <label for="repo">Repo (org/name)</label>
      <input id="repo" bind:value={repo} placeholder="rbxrobotica/rbx-maestro" />
    </div>
    <div class="field">
      <label for="base_branch">Base branch</label>
      <input id="base_branch" bind:value={base_branch} />
    </div>
  </div>

  <div class="field">
    <label for="objective">Objective <span class="hint">(min 40 chars)</span></label>
    <textarea id="objective" bind:value={objective} rows="3"
      placeholder="What success means, in one human-readable paragraph."></textarea>
  </div>

  <div class="field">
    <label for="success_criteria">Success criteria <span class="hint">(one per line)</span></label>
    <textarea id="success_criteria" bind:value={success_criteria} rows="4"
      placeholder="All tests pass&#10;CI green&#10;PR opened against main"></textarea>
  </div>

  <div class="row">
    <div class="field">
      <label for="max_runtime">Max runtime <span class="hint">(ISO 8601)</span></label>
      <input id="max_runtime" bind:value={max_runtime} placeholder="PT30M" />
    </div>
    <div class="field">
      <label for="max_attempts">Max attempts</label>
      <input id="max_attempts" type="number" bind:value={max_attempts} min="1" max="50" />
    </div>
  </div>

  {#if error}
    <p class="err">{error}</p>
  {/if}

  <div class="actions">
    <a href="/missions" class="btn-cancel">Cancel</a>
    <button type="submit" class="btn-submit" disabled={submitting}>
      {submitting ? "Admitting…" : "Admit Mission"}
    </button>
  </div>
</form>

<style>
  .back { margin-bottom: 1rem; font-size: 0.85rem; }
  h1 { font-size: 1.4rem; color: #e0e0e8; margin-bottom: 1.5rem; }

  form { display: flex; flex-direction: column; gap: 1rem; max-width: 720px; }

  .field { display: flex; flex-direction: column; gap: 0.35rem; }
  .row { display: flex; gap: 1rem; flex-wrap: wrap; }
  .row .field { flex: 1; min-width: 160px; }
  .row .field.grow { flex: 2; }

  label { font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
  .hint { font-size: 0.7rem; color: #555; text-transform: none; letter-spacing: 0; }

  input, select, textarea {
    background: #0d0d1a; border: 1px solid #2a2a3a; border-radius: 6px;
    color: #d0d0e0; padding: 0.5rem 0.75rem; font-size: 0.9rem; font-family: inherit;
    outline: none; resize: vertical;
  }
  input:focus, select:focus, textarea:focus { border-color: #22d3ee; }

  .actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.5rem; }
  .btn-cancel {
    padding: 0.5rem 1.1rem; border: 1px solid #2a2a3a; border-radius: 6px;
    color: #888; font-size: 0.9rem;
  }
  .btn-cancel:hover { border-color: #555; color: #aaa; text-decoration: none; }
  .btn-submit {
    padding: 0.5rem 1.4rem; background: #22d3ee; color: #0a0a0f;
    border: none; border-radius: 6px; font-size: 0.9rem; font-weight: 600; cursor: pointer;
  }
  .btn-submit:hover:not(:disabled) { background: #06b6d4; }
  .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

  .err { color: #f87171; font-size: 0.875rem; }
</style>
