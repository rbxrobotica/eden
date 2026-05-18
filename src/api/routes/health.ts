import { Hono } from "hono";

const health = new Hono();

health.get("/api/health", (c) => {
  const hasS3 = !!(process.env.CONTABO_S3_ACCESS_KEY && process.env.CONTABO_S3_SECRET_KEY);
  return c.json({
    status: "ok",
    version: "0.1.0",
    s3_configured: hasS3,
  });
});

export { health };
