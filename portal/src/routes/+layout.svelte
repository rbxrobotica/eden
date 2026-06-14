<script lang="ts">
  import { checkToken } from "$lib/api-client";

  let { children } = $props();

  let token = $state(typeof localStorage !== "undefined" ? localStorage.getItem("eden_token") ?? "" : "");
  let authenticated = $state(false);
  let error = $state("");

  async function submitToken() {
    error = "";
    const ok = await checkToken(token);
    if (ok) {
      localStorage.setItem("eden_token", token);
      authenticated = true;
    } else {
      error = "Invalid token";
    }
  }

  function logout() {
    localStorage.removeItem("eden_token");
    token = "";
    authenticated = false;
  }

  if (typeof localStorage !== "undefined" && token) {
    checkToken(token).then((ok) => {
      authenticated = ok;
      if (!ok) token = "";
    });
  }
</script>

<svelte:head>
  <title>Eden — RBX Platform</title>
</svelte:head>

{#if !authenticated}
  <div class="auth-screen">
    <div class="auth-card">
      <h1>Eden</h1>
      <p>RBX Internal Developer Platform</p>
      <form onsubmit={submitToken}>
        <input type="password" bind:value={token} placeholder="API Token" required />
        {#if error}
          <p class="error">{error}</p>
        {/if}
        <button type="submit">Enter</button>
      </form>
    </div>
  </div>
{:else}
  <nav>
    <div class="nav-inner">
      <a href="/" class="brand">Eden</a>
      <div class="nav-links">
        <a href="/">Products</a>
        <a href="/products/new">New Product</a>
        <a href="/missions">Missions</a>
        <a href="/memory/new">Write Memory</a>
      </div>
      <button class="logout" onclick={logout}>Logout</button>
    </div>
  </nav>
  <main>
    {@render children()}
  </main>
{/if}

<style>
  :global(*) { margin: 0; padding: 0; box-sizing: border-box; }
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #0a0a0f;
    color: #e0e0e8;
    min-height: 100vh;
  }
  :global(a) { color: #22d3ee; text-decoration: none; }
  :global(a:hover) { text-decoration: underline; }

  .auth-screen { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .auth-card {
    background: #14141f; border: 1px solid #1e1e2e; border-radius: 12px;
    padding: 2.5rem; text-align: center; min-width: 320px;
  }
  .auth-card h1 { font-size: 1.8rem; color: #22d3ee; margin-bottom: 0.3rem; }
  .auth-card p { color: #888; margin-bottom: 1.5rem; font-size: 0.9rem; }
  .auth-card input {
    width: 100%; padding: 0.7rem; border: 1px solid #2a2a3a; border-radius: 6px;
    background: #0f0f18; color: #e0e0e8; font-size: 0.95rem; margin-bottom: 0.8rem;
  }
  .auth-card button {
    width: 100%; padding: 0.7rem; background: #22d3ee; color: #0a0a0f;
    border: none; border-radius: 6px; font-weight: 600; font-size: 0.95rem; cursor: pointer;
  }
  .auth-card button:hover { background: #06b6d4; }
  .error { color: #f87171; font-size: 0.85rem; margin-bottom: 0.5rem; }

  nav { background: #0f0f18; border-bottom: 1px solid #1e1e2e; padding: 0 1.5rem; }
  .nav-inner {
    max-width: 1100px; margin: 0 auto; display: flex; align-items: center;
    height: 52px; gap: 1.5rem;
  }
  .brand { font-weight: 700; font-size: 1.1rem; color: #22d3ee; }
  .nav-links { display: flex; gap: 1rem; flex: 1; }
  .nav-links a { font-size: 0.9rem; color: #a0a0b0; }
  .nav-links a:hover { color: #22d3ee; }
  .logout {
    background: none; border: 1px solid #2a2a3a; color: #888;
    padding: 0.3rem 0.8rem; border-radius: 4px; font-size: 0.8rem; cursor: pointer;
  }
  .logout:hover { color: #f87171; border-color: #f87171; }

  main { max-width: 1100px; margin: 0 auto; padding: 1.5rem; }
</style>
