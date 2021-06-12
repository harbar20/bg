//Importing required modules
import express from 'express';
import * as dotenv from 'dotenv';
import * as qs from 'querystring';
const axios = require('axios').default;
import { Tedis } from 'tedis';

//Doing required setup for the server to work
dotenv.config();
const app = express();
const tedis = new Tedis({
	port: Number(process.env.REDIS_PORT),
	host: process.env.REDIS_HOST,
	password: process.env.REDIS_PASSWORD,
});
const valid_keys = JSON.parse(process.env.API_KEYS as string);

//Homepage to login
app.get('/', (req, res) => {
	const redirectURI = encodeURIComponent(process.env.DEXCOM_REDIRECT_URI as string);
	const dexcomLogin = `https://api.dexcom.com/v2/oauth2/login?client_id=${process.env.DEXCOM_CLIENT_ID}&redirect_uri=${redirectURI}&response_type=code&scope=offline_access`;
	res.send(`Welcome!<br><br><a href=${dexcomLogin}>Login</a>`);
});

//The place you go after logging in
app.get('/oauth-redirect', async (req, res) => {
	if (req.query.error) {
		res.send(
			"Error. You didn't authorize this app to use your data. If you want to authorize, go back to the main URL and click Login again."
		);
	}
	const code = req.query.code;
	const options = {
		method: 'POST',
		url: 'https://api.dexcom.com/v2/oauth2/token',
		headers: {
			'content-type': 'application/x-www-form-urlencoded',
			'cache-control': 'no-cache',
		},
		data: qs.stringify({
			client_secret: process.env.DEXCOM_CLIENT_SECRET,
			client_id: process.env.DEXCOM_CLIENT_ID,
			code: code as string,
			grant_type: 'authorization_code',
			redirect_uri: process.env.DEXCOM_REDIRECT_URI,
		}),
	};

	const response = await axios(options).catch((e: Error) => {
		res.send('Error. Please login again for access token receiving.');
		console.error(e);
	});
	await tedis.set('refreshToken', response.data.refresh_token).catch((e: Error) => {
		res.send('Error. Please login again for refresh token receiving.');
		console.error(e);
	});

	res.redirect(302, '/bg');
});

//The place to get your BG
app.get('/bg', async (req, res) => {
	const api_key = req.query.key;
	if (valid_keys.includes(api_key)) {
		const refreshToken = await tedis.get('refreshToken').catch((e: Error) => {
			res.send('Error. Please login again for refresh token getting.');
			console.error(e);
		});
		const options = {
			method: 'POST',
			url: 'https://api.dexcom.com/v2/oauth2/token',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				'cache-control': 'no-cache',
				'User-Agent': 'BG-Reader',
			},
			data: qs.stringify({
				client_secret: process.env.DEXCOM_CLIENT_SECRET,
				client_id: process.env.DEXCOM_CLIENT_ID,
				refresh_token: refreshToken as string,
				grant_type: 'refresh_token',
				redirect_uri: process.env.DEXCOM_REDIRECT_URI,
			}),
		};
		const response = await axios(options).catch((e: Error) => {
			res.send('Error. Please login again for access token.');
			console.error(e);
		});
		const accessToken = response.data.access_token;
		await tedis.set('refreshToken', response.data.refresh_token);

		const current: Date = new Date();
		const before: Date = new Date(current.getTime() - 5*60000);
		const newCurrent: string = `${current.getFullYear()}-${
			current.getMonth() < 10 ? '0' + current.getMonth() : current.getMonth()
		}-${current.getDate() < 10 ? '0' + current.getDate() : current.getDate()}T${
			current.getHours() < 10 ? '0' + current.getHours() : current.getHours()
		}:${current.getMinutes() < 10 ? '0' + current.getMinutes() : current.getMinutes()}:${
			current.getSeconds() < 10 ? '0' + current.getSeconds() : current.getSeconds()
		}`;
		const newBefore: string = `${before.getFullYear()}-${
			before.getMonth() < 10 ? '0' + before.getMonth() : before.getMonth()
		}-${before.getDate() < 10 ? '0' + before.getDate() : before.getDate()}T${
			before.getHours() < 10 ? '0' + before.getHours() : before.getHours()
		}:${before.getMinutes() < 10 ? '0' + before.getMinutes() : before.getMinutes()}:${
			before.getSeconds() < 10 ? '0' + before.getSeconds() : before.getSeconds()
		}`;
		const url: string = `https://api.dexcom.com/v2/users/self/egvs?startDate=${newBefore}&endDate=${newCurrent}`;
		const bgOptions = {
			method: 'GET',
			url: url,
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'content-type': 'application/x-www-form-urlencoded',
				'cache-control': 'no-cache',
			},
		};
		const bgResponse = await axios(bgOptions).catch((e: Error) => {
			res.send('Error. Please login again for your BG.');
			console.error(e);
		});
		console.log(bgResponse.data.egvs);

		res.send(`${bgResponse.data.egvs[0].realTimeValue} ${bgResponse.data.unit}`);
	} else {
		res.status(401).send('You do not have a valid API key.');
	}
});

app.listen(process.env.PORT, () => {
	console.log(`Running on http://localhost:${process.env.PORT}`);
});
