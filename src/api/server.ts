import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware } from "./middleware/auth.ts";
import { errorHandler } from "./middleware/error-handler.ts";
import { health } from "./routes/health.ts";
import { memory } from "./routes/memory.ts";
import { products } from "./routes/products.ts";

const app = new Hono();

app.use(
  "/api/*",
  cors({
    origin: [
      "https://eden.rbx.ia.br",
      "https://eden.rbxsystems.ch",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
  }),
);

app.route("/", health);
app.use("/api/*", authMiddleware);
app.route("/", memory);
app.route("/", products);
app.onError(errorHandler);

const port = parseInt(process.env.PORT || "3001", 10);

console.log(`Eden API starting on port ${port}`);

Bun.serve({
  port,
  fetch: app.fetch,
});
