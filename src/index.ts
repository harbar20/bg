import { Hono } from "hono";
import { serveStatic } from "hono/cloudflare-workers";
import manifest from "__STATIC_CONTENT_MANIFEST";
import { token, get, auth } from "./auth";
import { Bindings } from "./types";

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", async (c) => {
    const t = await token(c);

    if (t.includes("<a href=")) {
        return c.html(t);
    }

    const res = await get(t);

    return c.json(res);
});

app.get("/favicon.ico", serveStatic({ path: "./favicon.ico", manifest }));

app.get("/oauth-redirect", auth);

export default app;
