# 🩸 BG API 🩸

![](https://play-lh.googleusercontent.com/MOqvFbzCQR7nz8B8dLFN8zmXG_GivIYS_TIU6EHzTAxFHS2fzfsh8xowb1oP7o8Ptgfi=s180)
## Introduction
I have [Type 1 Diabetes](https://www.cdc.gov/diabetes/basics/type1.html) and use a [Dexcom G6](https://www.dexcom.com/g6-cgm-system) CGM (Continuous Glucose Monitor) to track my BG (Blood Glucose) levels. Dexcom has an OAuth2-based [API](https://developer.dexcom.com/) which I'm using to make this server. 
I've never used Typescript before and I wanted to learn, and this was a cool little project so I thought I'd make it. 
## Setup
You need to have typescript or, at the very least, `npm` installed.
1. Run the following command to install all required node modules.:
```bash
$ npm install
```
2. Create a [Redis database](https://redislabs.com/try-free/). 
3. Create a Dexcom Developer account and create a project. 
4. Create a `.env` file in the project directory that has this format:
```
PORT=
DEXCOM_CLIENT_ID=
DEXCOM_CLIENT_SECRET=
DEXCOM_REDIRECT_URI=
REDIS_PORT=
REDIS_HOST=
REDIS_PASSWORD=
API_KEYS=[]
``` 
5. Run the following commands in that order:
```bash
$ npm run build
$ npm run start
```
## Usage
1. Open `http://localhost:[PORT]/` in your browser.
2. Login to your Dexcom account. This account should already be paired to your actual sensor so that you can get your EGV's (Estimated Glucose Values, a term used by Dexcom in their API).
3. Make GET requests to `/bg` with a valid API key!
## License
This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. 
This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details. 
You should have received a copy of the GNU General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.