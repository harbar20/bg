//Importing required modules
import express, { json } from "express";
import * as dotenv from "dotenv";
import axios, { AxiosRequestConfig } from "axios";
import { Tedis } from "tedis";
dotenv.config();

// declare module "bun" {
//     interface Env {
//         PORT: number;
//         DEXCOM_CLIENT_ID: string;
//         DEXCOM_CLIENT_SECRET: string;
//         DEXCOM_REDIRECT_URI: string;
//         REDIS_PORT: number;
//         REDIS_HOST: string;
//         REDIS_PASSWORD: string;
//         API_KEY: string;
//     }
// }

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            PORT: number;
            DEXCOM_CLIENT_ID: string;
            DEXCOM_CLIENT_SECRET: string;
            DEXCOM_REDIRECT_URI: string;
            REDIS_PORT: number;
            REDIS_HOST: string;
            REDIS_PASSWORD: string;
            API_KEY: string;
        }
    }
}

//Doing required setup for the server to work
const app = express();
app.use(json());
const tedis = new Tedis({
    port: Number(process.env.REDIS_PORT),
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD,
});
const valid_keys = process.env.API_KEY;

const redirectURI = encodeURIComponent(process.env.DEXCOM_REDIRECT_URI);
const dexcomLogin = `<a href="https://api.dexcom.com/v2/oauth2/login?client_id=${process.env.DEXCOM_CLIENT_ID}&redirect_uri=${redirectURI}&response_type=code&scope=offline_access">here</a>`;
const reloginMessage = `Login ${dexcomLogin}`;

//Homepage to login
app.get("/", async (req, res) => {
    const api_key = req.query.key as string;
    if (valid_keys !== api_key) {
        return res.status(401).send("You do not have a valid API key.");
    }

    const refreshToken = await tedis.get("refreshToken").catch((e: Error) => {
        console.log("redis refresh token isn't there");
        res.send(reloginMessage);
    });

    if (refreshToken === "0") {
        console.log("redis refresh token is 0");
        res.send(reloginMessage);
    }

    const options = {
        method: "POST",
        headers: {
            "content-type": "application/x-www-form-urlencoded",
            // "cache-control": "no-cache",
            // "User-Agent": "BG-Reader",
        },
        body: new URLSearchParams({
            client_secret: process.env.DEXCOM_CLIENT_SECRET,
            client_id: process.env.DEXCOM_CLIENT_ID,
            refresh_token: refreshToken as string,
            grant_type: "refresh_token",
            redirect_uri: process.env.DEXCOM_REDIRECT_URI,
        }).toString(),
    };
    const response = await fetch(
        "https://api.dexcom.com/v2/oauth2/token",
        options
    ).catch((e: Error) => {
        console.log("Error in getting the access token");
        res.send("Error in getting the access token.");
        console.error(e);
    });
    if (!response) return res.send(reloginMessage);
    const data = await response.json();

    const accessToken = data.access_token;
    await tedis.set("refreshToken", data.refresh_token);

    const current: Date = new Date(Date.now());
    const before: Date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    console.log(current);
    console.log(before);

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
            // "cache-control": "no-cache",
        },
    };
    const bgResponse = await fetch(url, bgOptions).catch((e: Error) => {
        res.send("Error in getting the egvs");
        console.error(e);
    });
    if (!bgResponse) return res.send(reloginMessage);

    const bgData = await bgResponse.json();

    if (bgData.errors) {
        console.log(bgData);
        return res.send("Invalid date");
    }

    const currentValue = bgData.records[0];
    res.send(currentValue);
});

//The place you go after logging in
app.get("/oauth-redirect", async (req, res) => {
    if (req.query.error) {
        console.log("Something went wrong.");
        res.send(reloginMessage);
    }

    const code = req.query.code as string;
    const options = {
        client_secret: process.env.DEXCOM_CLIENT_SECRET,
        client_id: process.env.DEXCOM_CLIENT_ID,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: process.env.DEXCOM_REDIRECT_URI,
    };

    console.log(options);

    const response = await fetch(`https://api.dexcom.com/v2/oauth2/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(options).toString(),
    }).catch((e) => {
        console.log("Token doesn't work.");
        res.send(reloginMessage);
        console.error(e);
    });

    if (!response) return res.send(reloginMessage);
    const data = await response.json();

    await tedis.set("refreshToken", data.refresh_token).catch((e: Error) => {
        res.send(reloginMessage);
        console.error(e);
    });

    res.redirect(302, "/");
});

app.listen(process.env.PORT, () => {
    console.log(`Running on http://localhost:${process.env.PORT}`);
});

process.on("uncaughtException", function (err) {
    console.log(err);
});
