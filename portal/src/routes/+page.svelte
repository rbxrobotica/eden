<script lang="ts">
  import { apiFetch } from "$lib/api-client";
  import type { MemoryEntry } from "$lib/types";

  let memories = $state<MemoryEntry[]>([]);
  let products = $state<string[]>([]);
  let loading = $state(true);
  let error = $state("");

  async function load() {
    loading = true;
    error = "";
    try {
      memories = await apiFetch<MemoryEntry[]>("/api/memory?prefix=product/");
      const names = new Set<string>();
      for (const m of memories) {
        const parts = m.key.split("/");
        if (parts.length >= 2) names.add(parts[1]);
      }
      products = [...names].sort();
    } catch (e) {
      error = (e as Error).message;
    }
    loading = false;
  }

  load();

  function productMemoryCount(name: string): number {
    return memories.filter((m) => m.key.startsWith(`product/${name}/`)).length;
  }

  function phaseEmoji(phase: string): string {
    const map: Record<string, string> = { seed: "\u{1F331}", structuring: "\u{1F3D7}\u{FE0F}", expansion: "\u{1F680}", institutionalized: "\u{1F3E2}" };
    return map[phase] ?? "\u{1F331}";
  }

  function formatDate(d?: string): string {
    if (!d) return "";
    return new Date(d).toLocaleDateString();
  }
</script>

<h1>Products</h1>

{#if loading}
  <p>Loading...</p>
{:else if error}
  <p class="error">{error}</p>
{:else if products.length === 0}
  <p class="empty">No products yet. <a href="/products/new">Create one</a>.</p>
{:else}
  <div class="grid">
    {#each products as name}
      <a href="/products/{name}" class="card">
        <h2>{name}</h2>
        <p class="count">{productMemoryCount(name)} memories</p>
        <p class="date">Last: {formatDate(memories.find((m) => m.key.startsWith(`product/${name}/`))?.lastModified)}</p>
      </a>
    {/each}
  </div>
{/if}

<style>
  h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #22d3ee; }
  .error { color: #f87171; }
  .empty { color: #888; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
  .card {
    background: #14141f; border: 1px solid #1e1e2e; border-radius: 8px;
    padding: 1.2rem; transition: border-color 0.2s;
  }
  .card:hover { border-color: #22d3ee; text-decoration: none; }
  .card h2 { font-size: 1.1rem; margin-bottom: 0.4rem; color: #e0e0e8; }
  .count { font-size: 0.85rem; color: #22d3ee; }
  .date { font-size: 0.8rem; color: #666; margin-top: 0.3rem; }
</style>
