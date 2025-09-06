import { Hono } from "hono";
import { R2Bucket } from "@cloudflare/workers-types";
import { createMiddleware } from "hono/factory";
import { getCookie, setCookie } from "hono/cookie";

interface Bindings {
  R2: R2Bucket;
  AUTH_TOKEN: string;
}

const app = new Hono<{ Bindings: Bindings }>();

// Cookie または Authorization header のいずれかでトークンを検証
// フロントエンドでは Cookie を使用
const authMiddleware = createMiddleware<{ Bindings: Bindings }>(
  async (c, next) => {
    const expectedToken = c.env.AUTH_TOKEN;
    if (!expectedToken) {
      return c.text("Token is required to be set in env", 500);
    }
    const cookieToken = getCookie(c, "token");
    const authorizationToken = c.req.header("Authorization");
    if (!cookieToken && !authorizationToken) {
      return c.text("Token is required", 401);
    }
    if (cookieToken) {
      if (cookieToken !== expectedToken) {
        return c.text("Unauthorized", 401);
      }
    } else {
      if (authorizationToken !== expectedToken) {
        return c.text("Unauthorized", 401);
      }
    }
    await next();
  }
);

app.use("/api/*", authMiddleware);

const normalizeKey = (key: string) => {
  // 末尾のスラッシュは削除
  return key.replace(/\/$/, "");
};

app.get("/api/lists/:key{.*}", async (c) => {
  try {
    const objects = await c.env.R2.list();
    const keys = objects.objects.map((obj) => obj.key);
    const filteredKeys = c.req.param("key")
      ? keys.filter((key) => key.startsWith(c.req.param("key")))
      : keys;
    return c.json(filteredKeys, 200);
  } catch (e) {
    return c.text(`Internal Server Error: ${e}`, 500);
  }
});

app.get("/api/files/:key{.+}", async (c) => {
  try {
    const key = c.req.param("key");
    const object = await c.env.R2.get(key);
    if (!object) {
      return c.text("Not Found", 404);
    }
    const text = await object.text();
    return c.text(text, 200);
  } catch (e) {
    return c.text(`Internal Server Error: ${e}`, 500);
  }
});

app.post("/api/files/:key{.+}", async (c) => {
  try {
    const key = c.req.param("key");
    const normalizedKey = normalizeKey(key);
    const body = await c.req.text();
    await c.env.R2.put(normalizedKey, body);
    return c.text("Saved", 201);
  } catch (e) {
    return c.text(`Internal Server Error: ${e}`, 500);
  }
});

app.delete("/api/files/:key{.+}", async (c) => {
  try {
    const key = c.req.param("key");
    const normalizedKey = normalizeKey(key);
    await c.env.R2.delete(normalizedKey);
    return c.text("Deleted", 200);
  } catch (e) {
    return c.text(`Internal Server Error: ${e}`, 500);
  }
});

app.get("/set-token/:token", async (c) => {
  const token = c.req.param("token");
  setCookie(c, "token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  });
  return c.text("Token set", 200);
});

export default app;
