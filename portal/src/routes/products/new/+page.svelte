<script lang="ts">
  import { goto } from "$app/navigation";

  let name = $state("");
  let type = $state("api");
  let description = $state("");
  let domains = $state("");
  let error = $state("");
  let submitting = $state(false);

  const types = ["api", "web-static", "fullstack", "agent", "cli"];

  async function submit() {
    error = "";
    submitting = true;
    try {
      await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/api/memory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("eden_token")}`,
        },
        body: JSON.stringify({
          domain: "product",
          entity_type: "decision",
          product: name,
          author: "@operator",
          owner: "eden",
          status: "active",
          retention_class: "permanent",
          tags: [name, "product-creation"],
          body: `# ${name}\n\nType: ${type}\nDomains: ${domains || "none"}\n\n${description || "Product registered via Eden Portal."}`,
        }),
      });
      goto(`/products/${name}`);
    } catch (e) {
      error = (e as Error).message;
    }
    submitting = false;
  }
</script>

<h1>New Product</h1>

<form onsubmit={submit}>
  <label>Name<input type="text" bind:value={name} placeholder="my-product" required /></label>
  <label>Type
    <select bind:value={type}>
      {#each types as t}<option value={t}>{t}</option>{/each}
    </select>
  </label>
  <label>Domains<input type="text" bind:value={domains} placeholder="my-product.rbx.ia.br" /></label>
  <label>Description<textarea bind:value={description} rows="3" placeholder="What is this product?"></textarea></label>
  {#if error}<p class="error">{error}</p>{/if}
  <button type="submit" disabled={submitting || !name}>{submitting ? "Creating..." : "Create Product"}</button>
</form>

<style>
  h1 { font-size: 1.5rem; color: #22d3ee; margin-bottom: 1rem; }
  form { max-width: 500px; display: flex; flex-direction: column; gap: 1rem; }
  label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; color: #a0a0b0; }
  input, select, textarea {
    padding: 0.6rem; border: 1px solid #2a2a3a; border-radius: 6px;
    background: #0f0f18; color: #e0e0e8; font-size: 0.9rem;
  }
  button {
    padding: 0.7rem; background: #22d3ee; color: #0a0a0f; border: none;
    border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 0.5rem;
  }
  button:hover { background: #06b6d4; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  .error { color: #f87171; font-size: 0.85rem; }
</style>
