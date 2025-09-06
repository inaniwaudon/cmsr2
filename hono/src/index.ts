import { Hono } from "hono";
import { R2Bucket } from "@cloudflare/workers-types";
import { createMiddleware } from "hono/factory";
import { getCookie, setCookie } from "hono/cookie";
import z from "zod";
import { zValidator } from "@hono/zod-validator";

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
  // パストラバーサルを防ぐ
  if (key.includes("..")) {
    throw new Error("Invalid key");
  }
  // 先頭、末尾のスラッシュは削除
  return key.replace(/^\//, "").replace(/\/$/, "");
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
    const key = normalizeKey(c.req.param("key"));
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

app.put("/api/files/:key{.+}", async (c) => {
  try {
    const key = normalizeKey(c.req.param("key"));
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
    const key = normalizeKey(c.req.param("key"));
    const normalizedKey = normalizeKey(key);
    await c.env.R2.delete(normalizedKey);
    return c.text("Deleted", 200);
  } catch (e) {
    return c.text(`Internal Server Error: ${e}`, 500);
  }
});

const mvSchema = z.object({
  srcKey: z.string(),
  dstKey: z.string(),
});

app.post("/api/mv", zValidator("json", mvSchema), async (c) => {
  try {
    const json = c.req.valid("json");
    const srcKey = normalizeKey(json.srcKey);
    const dstKey = normalizeKey(json.dstKey);

    // dstKey の存在を確認
    const dstObject = await c.env.R2.get(dstKey);
    if (dstObject) {
      return c.text("Destination file already exists", 409);
    }

    // srcKey のファイルを取得
    const srcFile = await c.env.R2.get(srcKey);
    if (!srcFile) {
      return c.text("Source file not found", 404);
    }
    const body = await srcFile.text();
    await c.env.R2.put(dstKey, body);
    await c.env.R2.delete(srcKey);
    return c.text("Moved", 200);
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
