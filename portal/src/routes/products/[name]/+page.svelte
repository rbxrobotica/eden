<script lang="ts">
  import { page } from "$app/state";
  import { apiFetch } from "$lib/api-client";
  import type { MemoryEntry, MemoryDetail } from "$lib/types";

  const name = page.params.name;

  let memories = $state<MemoryEntry[]>([]);
  let selected = $state<MemoryDetail | null>(null);
  let loading = $state(true);
  let error = $state("");

  async function load() {
    loading = true;
    try {
      memories = await apiFetch<MemoryEntry[]>(`/api/memory?prefix=product/${name}/`);
    } catch (e) {
      error = (e as Error).message;
    }
    loading = false;
  }

  async function showDetail(key: string) {
    try {
      const id = key.split("/").pop()?.replace(".md", "") ?? key;
      selected = await apiFetch<MemoryDetail>(`/api/memory/${encodeURIComponent(id)}`);
    } catch (e) {
      error = (e as Error).message;
    }
  }

  load();
</script>

<h1>{name}</h1>

{#if loading}
  <p>Loading...</p>
{:else if error}
  <p class="error">{error}</p>
{:else}
  <div class="columns">
    <div class="list">
      <h3>Memories ({memories.length})</h3>
      {#if memories.length === 0}
        <p class="empty">No memories for this product.</p>
      {:else}
        {#each memories as m}
          <button class="mem-item" onclick={() => showDetail(m.key)}>
            <span class="mem-id">{m.key.split("/").pop()?.replace(".md", "")}</span>
            <span class="mem-date">{m.lastModified ? new Date(m.lastModified).toLocaleDateString() : ""}</span>
          </button>
        {/each}
      {/if}
    </div>
    <div class="detail">
      {#if selected}
        <h3>{selected.key.split("/").pop()}</h3>
        <table>
          <tbody>
            {#each Object.entries(selected.frontmatter) as [k, v]}
              <tr><td class="label">{k}</td><td>{typeof v === "object" ? JSON.stringify(v) : String(v)}</td></tr>
            {/each}
          </tbody>
        </table>
        <div class="body">
          <pre>{selected.body}</pre>
        </div>
      {:else}
        <p class="hint">Select a memory to view details.</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  h1 { font-size: 1.5rem; color: #22d3ee; margin-bottom: 1rem; }
  .error { color: #f87171; }
  .empty, .hint { color: #888; }
  .columns { display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; }
  h3 { font-size: 1rem; color: #a0a0b0; margin-bottom: 0.8rem; }
  .list { display: flex; flex-direction: column; gap: 0.4rem; }
  .mem-item {
    background: #14141f; border: 1px solid #1e1e2e; border-radius: 6px;
    padding: 0.6rem 0.8rem; cursor: pointer; text-align: left;
    display: flex; justify-content: space-between; color: #e0e0e8;
  }
  .mem-item:hover { border-color: #22d3ee; }
  .mem-id { font-family: monospace; font-size: 0.85rem; }
  .mem-date { font-size: 0.8rem; color: #666; }
  .detail { min-width: 0; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
  td { padding: 0.4rem 0.6rem; border-bottom: 1px solid #1e1e2e; font-size: 0.85rem; }
  td.label { color: #22d3ee; font-family: monospace; width: 140px; white-space: nowrap; }
  .body {
    background: #14141f; border: 1px solid #1e1e2e; border-radius: 6px;
    padding: 1rem; overflow-x: auto;
  }
  pre { white-space: pre-wrap; font-size: 0.85rem; font-family: inherit; }
</style>
