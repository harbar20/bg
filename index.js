"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//Importing required modules
var express_1 = __importDefault(require("express"));
var dotenv = __importStar(require("dotenv"));
var qs = __importStar(require("querystring"));
var axios = require('axios').default;
var tedis_1 = require("tedis");
//Doing required setup for the server to work
dotenv.config();
var app = express_1.default();
var tedis = new tedis_1.Tedis({
    port: Number(process.env.REDIS_PORT),
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD,
});
var valid_keys = JSON.parse(process.env.API_KEYS);
//Homepage to login
app.get('/', function (req, res) {
    var redirectURI = encodeURIComponent(process.env.DEXCOM_REDIRECT_URI);
    var dexcomLogin = "https://api.dexcom.com/v2/oauth2/login?client_id=" + process.env.DEXCOM_CLIENT_ID + "&redirect_uri=" + redirectURI + "&response_type=code&scope=offline_access";
    res.send("Welcome!<br><br><a href=" + dexcomLogin + ">Login</a>");
});
//The place you go after logging in
app.get('/oauth-redirect', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var code, options, response;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (req.query.error) {
                    res.send("Error. You didn't authorize this app to use your data. If you want to authorize, go back to the main URL and click Login again.");
                }
                code = req.query.code;
                options = {
                    method: 'POST',
                    url: 'https://api.dexcom.com/v2/oauth2/token',
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded',
                        'cache-control': 'no-cache',
                    },
                    data: qs.stringify({
                        client_secret: process.env.DEXCOM_CLIENT_SECRET,
                        client_id: process.env.DEXCOM_CLIENT_ID,
                        code: code,
                        grant_type: 'authorization_code',
                        redirect_uri: process.env.DEXCOM_REDIRECT_URI,
                    }),
                };
                return [4 /*yield*/, axios(options).catch(function (e) {
                        res.send('Error. Please login again for access token receiving.');
                        console.error(e);
                    })];
            case 1:
                response = _a.sent();
                return [4 /*yield*/, tedis.set('refreshToken', response.data.refresh_token).catch(function (e) {
                        res.send('Error. Please login again for refresh token receiving.');
                        console.error(e);
                    })];
            case 2:
                _a.sent();
                res.redirect(302, '/bg');
                return [2 /*return*/];
        }
    });
}); });
//The place to get your BG
app.get('/bg', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var api_key, refreshToken, options, response, accessToken, current, before, newCurrent, newBefore, url, bgOptions, bgResponse;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                api_key = req.query.key;
                if (!valid_keys.includes(api_key)) return [3 /*break*/, 5];
                return [4 /*yield*/, tedis.get('refreshToken').catch(function (e) {
                        res.send('Error. Please login again for refresh token getting.');
                        console.error(e);
                    })];
            case 1:
                refreshToken = _a.sent();
                options = {
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
                        refresh_token: refreshToken,
                        grant_type: 'refresh_token',
                        redirect_uri: process.env.DEXCOM_REDIRECT_URI,
                    }),
                };
                return [4 /*yield*/, axios(options).catch(function (e) {
                        res.send('Error. Please login again for access token.');
                        console.error(e);
                    })];
            case 2:
                response = _a.sent();
                accessToken = response.data.access_token;
                return [4 /*yield*/, tedis.set('refreshToken', response.data.refresh_token)];
            case 3:
                _a.sent();
                current = new Date();
                before = new Date(current.getTime() - 5 * 60000);
                console.log(current);
                console.log(before);
                newCurrent = current.getFullYear() + "-" + (current.getMonth() < 10 ? '0' + current.getMonth() : current.getMonth()) + "-" + (current.getDate() < 10 ? '0' + current.getDate() : current.getDate()) + "T" + (current.getHours() < 10 ? '0' + current.getHours() : current.getHours()) + ":" + (current.getMinutes() < 10 ? '0' + current.getMinutes() : current.getMinutes()) + ":" + (current.getSeconds() < 10 ? '0' + current.getSeconds() : current.getSeconds());
                newBefore = before.getFullYear() + "-" + (before.getMonth() < 10 ? '0' + before.getMonth() : before.getMonth()) + "-" + (before.getDate() < 10 ? '0' + before.getDate() : before.getDate()) + "T" + (before.getHours() < 10 ? '0' + before.getHours() : before.getHours()) + ":" + (before.getMinutes() < 10 ? '0' + before.getMinutes() : before.getMinutes()) + ":" + (before.getSeconds() < 10 ? '0' + before.getSeconds() : before.getSeconds());
                url = "https://api.dexcom.com/v2/users/self/egvs?startDate=" + newBefore + "&endDate=" + newCurrent;
                bgOptions = {
                    method: 'GET',
                    url: url,
                    headers: {
                        Authorization: "Bearer " + accessToken,
                        'content-type': 'application/x-www-form-urlencoded',
                        'cache-control': 'no-cache',
                    },
                };
                return [4 /*yield*/, axios(bgOptions).catch(function (e) {
                        res.send('Error. Please login again for your BG.');
                        console.error(e);
                    })];
            case 4:
                bgResponse = _a.sent();
                console.log(bgResponse.data.egvs);
                res.send(bgResponse.data.egvs[0].value + " " + bgResponse.data.unit);
                return [3 /*break*/, 6];
            case 5:
                res.status(401).send('You do not have a valid API key.');
                _a.label = 6;
            case 6: return [2 /*return*/];
        }
    });
}); });
app.listen(process.env.PORT, function () {
    console.log("Running on http://localhost:" + process.env.PORT);
});
