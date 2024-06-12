import { Context } from "hono";
import { Bindings } from "./types";

function message(env: Bindings) {
    const redirectURI = encodeURIComponent(env.DEXCOM_REDIRECT_URI);
    const dexcomLogin = `<a href="https://api.dexcom.com/v2/oauth2/login?client_id=${env.DEXCOM_CLIENT_ID}&redirect_uri=${redirectURI}&response_type=code&scope=offline_access">here</a>`;
    const reloginMessage = `Login ${dexcomLogin}`;

    return reloginMessage;
}

async function token(c: Context) {
    const refreshToken = await c.env.refresh_tokens.get("token");
    if (!refreshToken) {
        return message(c.env);
    }

    const options = {
        method: "POST",
        headers: {
            "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            client_secret: c.env.DEXCOM_CLIENT_SECRET,
            client_id: c.env.DEXCOM_CLIENT_ID,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
            redirect_uri: c.env.DEXCOM_REDIRECT_URI,
        }).toString(),
    };
    const response = await fetch(
        "https://api.dexcom.com/v2/oauth2/token",
        options
    ).catch((e: Error) => {
        console.log("Error in getting the access token");
        console.error(e);
        return;
    });
    if (!response) return message(c.env);
    const data: any = await response.json();

    console.log(data);

    const accessToken = data.access_token;
    await c.env.refresh_tokens.put("token", data.refresh_token);

    return accessToken;
}

async function get(accessToken: string) {
    const current: Date = new Date(Date.now());
    const before: Date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    console.log(accessToken);

    const newCurrent: string = `${current.getUTCFullYear()}-${
        current.getUTCMonth() + 1 < 10
            ? "0" + (current.getUTCMonth() + 1)
            : current.getUTCMonth() + 1
    }-${
        current.getUTCDate() < 10
            ? "0" + current.getUTCDate()
            : current.getUTCDate()
    }T${
        current.getUTCHours() < 10
            ? "0" + current.getUTCHours()
            : current.getUTCHours()
    }:${
        current.getUTCMinutes() < 10
            ? "0" + current.getUTCMinutes()
            : current.getUTCMinutes()
    }:${
        current.getUTCSeconds() < 10
            ? "0" + current.getUTCSeconds()
            : current.getUTCSeconds()
    }`;
    const newBefore: string = `${before.getUTCFullYear()}-${
        before.getUTCMonth() + 1 < 10
            ? "0" + (before.getUTCMonth() + 1)
            : before.getUTCMonth() + 1
    }-${
        before.getUTCDate() < 10
            ? "0" + before.getUTCDate()
            : before.getUTCDate()
    }T${
        before.getUTCHours() < 10
            ? "0" + before.getUTCHours()
            : before.getUTCHours()
    }:${
        before.getUTCMinutes() < 10
            ? "0" + before.getUTCMinutes()
            : before.getUTCMinutes()
    }:${
        before.getUTCSeconds() < 10
            ? "0" + before.getUTCSeconds()
            : before.getUTCSeconds()
    }`;

    const url = `https://api.dexcom.com/v3/users/self/egvs?startDate=${newBefore}&endDate=${newCurrent}`;
    const bgOptions = {
        method: "GET",
        url: url,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "content-type": "application/x-www-form-urlencoded",
        },
    };
    const bgResponse = await fetch(url, bgOptions).catch((e: Error) => {
        console.error(e);
        return;
    });
    if (!bgResponse) return "BG error";

    console.log(bgResponse);

    const bgData: any = await bgResponse.json();

    if (bgData.errors) {
        return "Invalid date";
    }

    console.log(bgData);

    const currentValue = bgData.records[0];

    return currentValue;
}

async function auth(c: Context) {
    if (c.req.query("error")) {
        console.log("Something went wrong.");
        return c.redirect("/", 302);
    }

    const code = c.req.query("code");

    if (!code) {
        console.log("Something went wrong.");
        return c.redirect("/", 302);
    }

    const options = {
        client_secret: c.env.DEXCOM_CLIENT_SECRET,
        client_id: c.env.DEXCOM_CLIENT_ID,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: c.env.DEXCOM_REDIRECT_URI,
    };

    const response = await fetch(`https://api.dexcom.com/v2/oauth2/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(options).toString(),
    }).catch((e) => {
        console.log("Token doesn't work.");
        console.error(e);
        return c.redirect("/", 302);
    });

    if (!response) return c.redirect("/", 302);
    const data: any = await response.json();

    await c.env.refresh_tokens.put("token", data.refresh_token);

    c.redirect("/", 302);
}

export { token, get, auth };
