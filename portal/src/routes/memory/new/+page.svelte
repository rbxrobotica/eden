<script lang="ts">
  import { apiFetch } from "$lib/api-client";
  import { DOMAINS, ENTITY_TYPES } from "$lib/types";
  import type { MemoryDomain, MemoryEntityType } from "$lib/types";

  let domain = $state<MemoryDomain>("product");
  let entityType = $state<MemoryEntityType>("decision");
  let product = $state("");
  let author = $state("@operator");
  let owner = $state("eden");
  let status = $state("draft");
  let retentionClass = $state("2years");
  let tags = $state("");
  let body = $state("");
  let error = $state("");
  let success = $state("");
  let submitting = $state(false);

  async function submit() {
    error = "";
    success = "";
    submitting = true;
    try {
      const result = await apiFetch<{ key: string; id: string }>("/api/memory", {
        method: "POST",
        body: JSON.stringify({
          domain,
          entity_type: entityType,
          product: domain === "product" ? product : undefined,
          author,
          owner,
          status,
          retention_class: retentionClass,
          tags: tags ? tags.split(",").map((t) => t.trim()) : undefined,
          body,
        }),
      });
      success = `Memory ${result.id} created at ${result.key}`;
      body = "";
    } catch (e) {
      error = (e as Error).message;
    }
    submitting = false;
  }
</script>

<h1>Write Memory</h1>

<form onsubmit={submit}>
  <div class="row">
    <label>Domain
      <select bind:value={domain}>
        {#each DOMAINS as d}<option value={d}>{d}</option>{/each}
      </select>
    </label>
    <label>Entity Type
      <select bind:value={entityType}>
        {#each ENTITY_TYPES as t}<option value={t}>{t}</option>{/each}
      </select>
    </label>
  </div>
  {#if domain === "product"}
    <label>Product<input type="text" bind:value={product} placeholder="robson" required /></label>
  {/if}
  <div class="row">
    <label>Author<input type="text" bind:value={author} placeholder="@handle or agent:name" /></label>
    <label>Owner<input type="text" bind:value={owner} /></label>
  </div>
  <div class="row">
    <label>Status
      <select bind:value={status}>
        <option>draft</option><option>active</option><option>superseded</option>
      </select>
    </label>
    <label>Retention
      <select bind:value={retentionClass}>
        <option>permanent</option><option>7years</option><option>2years</option><option>ephemeral</option>
      </select>
    </label>
  </div>
  <label>Tags (comma-separated)<input type="text" bind:value={tags} placeholder="lifecycle,product" /></label>
  <label>Body<textarea bind:value={body} rows="6" placeholder="Write your memory content in markdown..." required></textarea></label>
  {#if error}<p class="error">{error}</p>{/if}
  {#if success}<p class="success">{success}</p>{/if}
  <button type="submit" disabled={submitting || !body}>{submitting ? "Writing..." : "Write Memory"}</button>
</form>

<style>
  h1 { font-size: 1.5rem; color: #22d3ee; margin-bottom: 1rem; }
  form { max-width: 600px; display: flex; flex-direction: column; gap: 0.8rem; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
  label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; color: #a0a0b0; }
  input, select, textarea {
    padding: 0.6rem; border: 1px solid #2a2a3a; border-radius: 6px;
    background: #0f0f18; color: #e0e0e8; font-size: 0.9rem;
  }
  button {
    padding: 0.7rem; background: #22d3ee; color: #0a0a0f; border: none;
    border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 0.3rem;
  }
  button:hover { background: #06b6d4; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  .error { color: #f87171; font-size: 0.85rem; }
  .success { color: #4ade80; font-size: 0.85rem; }
</style>
