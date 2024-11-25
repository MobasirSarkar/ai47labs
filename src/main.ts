import { initializeBot } from "./bot/bot";
import dotenv from "dotenv";
import logger from "./logger/logger";
import { db } from "./db/db";
import express, { Express } from "express";
import { GetALLSubscribers } from "./services/subscription";
import { CorsOptions } from "cors";
import cors from "cors";

dotenv.config();

const app: Express = express();
let server: ReturnType<typeof app.listen>;

const corsOptions: CorsOptions = {
	origin: "*",
	methods: ["GET", "POST", "PUT", "DELETE"], // Allowed methods
	allowedHeaders: ["Origin", "Content-Type", "Accept", "Authorization"], // Allowed headers
	credentials: true, // Allow credentials (cookies, authorization headers, etc.)"
};
async function main() {
	try {
		// Start the bot
		initializeBot();
		logger.info("Telegram bot is running.");

		// Connect to the database
		db.connect("./schema.db");

		app.use(express.json());
		app.use(cors(corsOptions));
		app.get("/subscribers", GetALLSubscribers);

		app.listen(3000, () => {
			logger.info(`Server is running at Port ${3000}`);
		});
		// Graceful shutdown handling
		process.on("SIGINT", () => shutdown());
		process.on("SIGTERM", () => shutdown());
	} catch (error) {
		logger.error("Failed to launch the application:", error);
		process.exit(1);
	}
}

// Function to handle graceful shutdown
async function shutdown() {
	try {
		// Close the database connection
		logger.info("Closing database connection...");
		db.close();

		// Stop the server
		if (server) {
			logger.info("Stopping the server...");
			server.close(() => {
				logger.info("Server stopped.");
				process.exit(0);
			});
		} else {
			logger.warn("Server instance is undefined.");
			process.exit(0);
		}
	} catch (error) {
		logger.error("Error during shutdown:", error);
		process.exit(1);
	}
}

main();
