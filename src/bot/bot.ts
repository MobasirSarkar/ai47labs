import { Telegraf } from "telegraf";
import { BOT_TOKEN } from "../utils/env";
import { FetchWeather } from "../services/weather";
import logger from "../logger/logger";
import { Message } from "telegraf/types";
import { Scheduler } from "../utils/timer";
import { db } from "../db/db";

if (!BOT_TOKEN) {
	throw new Error("Environment variable BOT_TOKEN is missing");
}

const bot = new Telegraf(BOT_TOKEN);

/* interface Subscriber {
	userId: number;
	chatId: number;
	location?: string;
}
const subscribers: Map<number, Subscriber> = new Map(); */
const blockedUsers: Set<number> = new Set();

const isBlocked = (chatId: number): boolean => blockedUsers.has(chatId);

// Command: /start
bot.start(async (ctx) => {
	const chatId = ctx.chat.id;
	const { username, id: user_id } = ctx.from;
	if (isBlocked(chatId)) {
		ctx.reply("You are blocked from using this bot.");
		return;
	}
	try {
		await db.addUser(user_id, username || "test");
		ctx.reply(
			`
          Welcome! ${username} to the ai47weather Bot!
          Use /subscribe to get daily weather updates.
          Use /weather <location> to get weather about specific location.
          Use /unsubscribe to cancel the daily weather updates.
       `,
		);
	} catch (error) {
		logger.error("Error While performing start command", error);
	}
});

// Command: /subscribe
bot.command("subscribe", async (ctx) => {
	const userId = ctx.from.id;

	// Check if the user is blocked
	const user = await db.getUserById(userId);
	if (user?.isBlocked) {
		ctx.reply("You are blocked from using this bot.");
		return;
	}

	// Check if the user is already subscribed
	const existingSubscription = await db.getSubscriptionsByUserId(userId);
	if (existingSubscription.length > 0) {
		ctx.reply(
			"You are already subscribed. Use /location to update your location.",
		);
		return;
	}

	// Prompt user to share location
	ctx.reply("Please share your location for weather updates.", {
		reply_markup: {
			keyboard: [[{ text: "Share Location", request_location: true }]],
			one_time_keyboard: true,
		},
	});
});

// Command: /weather <location>
bot.command("weather", async (ctx) => {
	const input = ctx.message.text.split(" ").slice(1).join(" ");
	if (!input) {
		ctx.reply(`Please provide a location. Usage: /weather <location>`);
		return;
	}

	try {
		const weather = await FetchWeather(input);
		ctx.reply(weather);
	} catch (error) {
		ctx.reply((error as Error).message);
		logger.error(
			`Failed to fetch weather for ${input}: ${(error as Error).message}`,
		);
	}
});

// Command: /unsubscribe
bot.command("unsubscribe", async (ctx) => {
	const userId = ctx.from.id;

	// Check if the user is blocked
	const user = await db.getUserById(userId);
	if (user?.isBlocked) {
		ctx.reply("You are blocked from using this bot.");
		return;
	}

	// Check if the user is subscribed
	const existingSubscription = await db.getSubscriptionsByUserId(userId);
	if (existingSubscription.length === 0) {
		ctx.reply("You are not subscribed to weather updates.");
		return;
	}

	// Unsubscribe the user
	await db.unsubscribeUser(userId);

	ctx.reply("You have been unsubscribed from daily weather updates.");
});

// Event: Location Message
bot.on("message", async (ctx) => {
	const userId = ctx.from.id;
	const chatId = ctx.chat.id;

	// Check if the user is blocked
	const user = await db.getUserById(userId);
	if (user?.isBlocked) {
		ctx.reply("You are blocked from using this bot.");
		return;
	}

	// Check if the message contains location information
	if ("location" in ctx.message) {
		const { location } = ctx.message as Message.LocationMessage;

		// Check if the user is already subscribed
		const existingSubscription = await db.getSubscriptionsByUserId(userId);
		if (existingSubscription.length > 0) {
			ctx.reply("You are already subscribed to weather updates.");
			return;
		}

		// Update the subscriber's location in the database
		await db.subscribeUser(
			userId,
			chatId,
			`${location.latitude},${location.longitude}`,
		);

		ctx.reply(
			`Location received! You are now subscribed to daily weather updates for the location: Latitude: ${location.latitude}, Longitude: ${location.longitude}.`,
		);
	} else {
		ctx.reply(
			"Please share your location to receive personalized weather updates!",
		);
	}
});
// Send Weather Updates
const sendWeatherUpdates = async () => {
	try {
		// Fetch all active subscriptions from the database
		const subscriptions = await db.getActiveSubscriptions();

		if (subscriptions.length === 0) {
			logger.info("No active subscriptions found for weather updates.");
			return;
		}

		// Process each subscription in parallel
		await Promise.all(
			subscriptions.map(async ({ chatId, location, isBlocked }) => {
				if (isBlocked) {
					logger.warn(`Skipping blocked user with chatId: ${chatId}`);
					return;
				}
				if (!location) {
					logger.warn(
						`Skipping user with chatId: ${chatId} due to missing location.`,
					);
					return;
				}

				try {
					// Fetch the weather data for the user's location
					const weather = await FetchWeather(location);

					// Send the weather update to the user
					await bot.telegram.sendMessage(chatId, weather);

					logger.info(`Weather update sent to chatId: ${chatId}`);
				} catch (error) {
					logger.error(
						`Failed to send weather update to chatId: ${chatId}. Error: ${(error as Error).message}`,
					);
				}
			}),
		);

		logger.info("Weather updates process completed.");
	} catch (error) {
		logger.error(
			`Failed to process weather updates: ${(error as Error).message}`,
		);
	}
};

Scheduler(sendWeatherUpdates, 6, 0);
bot.launch();

export const initializeBot = (): Telegraf => bot;
