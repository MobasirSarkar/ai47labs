import { initializeBot } from "./bot/bot";
import dotenv from "dotenv";
import logger from "./logger/logger";
import { db } from "./db/db";

dotenv.config();

async function main() {
	try {
		initializeBot();
		db.connect("./schema.db");
		logger.info("Telegram bot is running.");
	} catch (error) {
		logger.error("Failed to launch the bot:", error);
		process.exit(1);
	}
}

main();
