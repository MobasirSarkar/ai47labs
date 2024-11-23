import dotenv from "dotenv";

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

if (!BOT_TOKEN || !WEATHER_API_KEY) {
	throw new Error(
		"Missing required environment variables: BOT_TOKEN or WEATHER_API_KEY.",
	);
}

export { BOT_TOKEN, WEATHER_API_KEY };
