import { Telegraf } from "telegraf";
import { BOT_TOKEN } from "../utils/env";
import { FetchWeather } from "../services/weather";
import logger from "../logger/logger";

if (!BOT_TOKEN) {
	throw new Error("Environment variables BOT_TOKEN is missing");
}

const bot = new Telegraf(BOT_TOKEN);

interface Subscriber {
	chatId: number;
	latitude?: number;
	longitude?: number;
}
const subscribers: Map<number, Subscriber> = new Map();
const blockedUsers: Set<number> = new Set();

const isBlocked = (chatId: number): boolean => blockedUsers.has(chatId);
// Command: /start
bot.start((ctx) => {
	const chatId = ctx.chat.id;
	if (isBlocked(chatId)) {
		ctx.reply("You are blocked from using this bot.");
		return;
	}
	ctx.reply(
		"Welcome to the ai47weather Bot! Use /subscribe to get daily weather updates.",
	);
});

/* // Command: /blockUsers
bot.command("blockedUsers", (ctx) => {
	const chatId = ctx.chat.id;
	if (blockedUsers.delete(chatId)) {
		ctx.reply("You are unsubscribed from daily weather udpates.");
		return;
	} else {
		subscribers.add(chatId);
		ctx.reply("You were not subscribed.");
	}
}); */

// Command: /subscribe
bot.command("subscribe", (ctx) => {
	const chatId = ctx.chat.id;
	if (subscribers.has(chatId)) {
		ctx.reply(
			"You are Already Subscribed.Use /location to update your location.",
		);
		return;
	}
	ctx.reply("Please share your location for weather updates.", {
		reply_markup: {
			keyboard: [[{ text: "share location", request_location: true }]],
			one_time_keyboard: true,
		},
	});

	subscribers.set(chatId, { chatId });
});

// Command: /weather <location>
bot.command("weather", async (ctx) => {
	const input = ctx.message.text.split(" ").slice(1).join(" ");
	if (!input) {
		ctx.reply(`Please provide a location. Usage /weather <location>`);
	}

	try {
		const weather = await FetchWeather(input);
		ctx.reply(weather);
	} catch (error) {
		ctx.reply((error as Error).message);
		logger.error(
			`Failed to send weather udpate to ${input}: ${(error as Error).message}`,
		);
	}
});

const sendWeatherUpdates = async () => {
	for (const subscriber of subscribers.values()) {
		const { chatId, latitude, longitude } = subscriber;

		if (!latitude || !longitude) {
			logger.warn(`Skipping subscriber ${chatId} due to missing location`);
			continue;
		}

		try {
			const weather = await FetchWeather(`${latitude},${longitude}`);
			await bot.telegram.sendMessage(chatId, weather);
		} catch (error) {
			logger.error(
				`Failed to send weather update to chat Id ${chatId}: ${error as Error}`,
			);
		}
	}
};

setInterval(sendWeatherUpdates, 1);

bot.launch();

export const initializeBot = (): Telegraf => bot;
