import { Hono } from "hono";
import { serveStatic } from "hono/cloudflare-workers";
import manifest from "__STATIC_CONTENT_MANIFEST";

type Bindings = {
    refresh_tokens: KVNamespace;
};
const app = new Hono<{ Bindings: Bindings }>();

app.get("/", async (c) => {
    const keys = await c.env.refresh_tokens.get("keyTest");
    return c.json(keys);
});

app.get(
    "/favicon.ico",
    serveStatic({ path: "./favicon.ico", manifest })
);

export default app;
