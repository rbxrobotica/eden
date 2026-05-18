import type { ErrorHandler } from "hono";

export const errorHandler: ErrorHandler = (err, c) => {
  const status = "status" in err ? (err.status as number) : 500;
  const message = err.message || "Internal server error";

  if (message.includes("S3 credentials") || message.includes("Missing S3")) {
    return c.json({ error: "S3 not configured", detail: message }, 503);
  }

  return c.json({ error: message }, status);
};
