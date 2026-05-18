import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

export const authMiddleware = createMiddleware(async (c, next) => {
  const expectedToken = process.env.EDEN_API_TOKEN;
  if (!expectedToken) {
    throw new HTTPException(500, {
      message: "EDEN_API_TOKEN environment variable not set",
    });
  }

  const header = c.req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    throw new HTTPException(401, { message: "Missing Authorization header" });
  }

  const token = header.slice(7);
  if (token !== expectedToken) {
    throw new HTTPException(401, { message: "Invalid token" });
  }

  await next();
});
