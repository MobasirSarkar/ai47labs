import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import logger from "../logger/logger";

export interface User {
	id: number;
	username: string;
	isBlocked: boolean;
	addedAt?: Date;
}

export interface Subscription {
	userId: number;
	chatId: number;
	location: string;
	subscriptionDate: Date;
}

export class DbSetup {
	private db!: Database;

	async connect(dbPath: string): Promise<void> {
		this.db = await open({
			filename: dbPath,
			driver: sqlite3.Database,
		});
		logger.info("Connected to sqlite database");

		try {
			// Users Table
			await this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL UNIQUE,
          username TEXT NOT NULL,
          is_blocked BOOLEAN DEFAULT 0,
          added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

			// Subscriptions Table
			await this.db.exec(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          chat_id INTEGER NOT NULL,
          location TEXT NOT NULL,
          subscription_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
      `);
		} catch (error) {
			logger.error("Error while executing schema", error);
		}
	}

	// Add a user to the users table
	async addUser(userId: number, username: string): Promise<number> {
		const result = await this.db.run(
			`INSERT INTO users (user_id, username) VALUES(?, ?)`,
			[userId, username],
		);
		return result.lastID!;
	}

	// Get all users
	async getUsers(): Promise<User[]> {
		return this.db.all<User[]>(`SELECT * FROM users`);
	}

	// Get a user by userId
	async getUserById(userId: number): Promise<User | null> {
		try {
			const user = await this.db.get<User>(
				`SELECT * FROM users WHERE user_id = ?`,
				[userId],
			);
			return user || null;
		} catch (error) {
			logger.error("Failed to fetch user from database", error);
			throw new Error("Failed to fetch user from the database");
		}
	}

	// Block a user
	async blockUser(userId: number): Promise<void> {
		await this.db.run(`UPDATE users SET is_blocked = 1 WHERE user_id = ?`, [
			userId,
		]);
	}

	// Unblock a user
	async unblockUser(userId: number): Promise<void> {
		await this.db.run(`UPDATE users SET is_blocked = 0 WHERE user_id = ?`, [
			userId,
		]);
	}

	// Delete a user
	async deleteUser(userId: number): Promise<void> {
		await this.db.run(`DELETE FROM users WHERE user_id = ?`, [userId]);
		// Optionally, remove any subscriptions linked to the deleted user
		await this.db.run(`DELETE FROM subscriptions WHERE user_id = ?`, [userId]);
	}

	// Subscribe a user to a location for weather updates
	async subscribeUser(
		userId: number,
		chatId: number,
		location: string,
	): Promise<void> {
		await this.db.run(
			`INSERT INTO subscriptions (user_id, chat_id, location) VALUES (?, ?, ?)`,
			[userId, chatId, location],
		);
	}

	// Unsubscribe a user from all locations
	async unsubscribeUser(userId: number): Promise<void> {
		await this.db.run(`DELETE FROM subscriptions WHERE user_id = ?`, [userId]);
	}

	// Get all subscriptions for a user
	async getSubscriptionsByUserId(userId: number): Promise<Subscription[]> {
		return this.db.all<Subscription[]>(
			`SELECT * FROM subscriptions WHERE user_id = ?`,
			[userId],
		);
	}

	async getActiveSubscriptions(): Promise<
		{ userId: number; chatId: number; location: string; isBlocked: boolean }[]
	> {
		const rows = await this.db.all(
			`SELECT u.user_id as userId, 
          s.chat_id as chatId, 
          s.location as location, 
          u.is_blocked as isBlocked
          FROM users u
          INNER JOIN subscriptions s ON u.user_id = s.user_id
          WHERE u.is_blocked = 0`,
		);

		return rows.map((row) => ({
			userId: row.userId,
			chatId: row.chatId,
			location: row.location,
			isBlocked: row.isBlocked,
		}));
	}
	// Close the database connection
	async close(): Promise<void> {
		await this.db.close();
		logger.info("Database connection closed.");
	}
}

export const db = new DbSetup();
