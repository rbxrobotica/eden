const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const file = Bun.file(`./build${url.pathname}`);
    if (await file.exists()) return new Response(file);
    return new Response(Bun.file("./build/index.html"), {
      headers: { "Content-Type": "text/html" },
    });
  },
});
console.log(`Eden Portal on port ${server.port}`);
