import { RequestHandler, Request, Response } from "express";
import { db } from "../db/db";
import logger from "../logger/logger";
export const GetALLSubscribers: RequestHandler = async (
	_req: Request,
	res: Response,
) => {
	try {
		const subscribers = await db.getAllSubscribers();
		if (!subscribers || subscribers.length == 0) {
			res.status(400).json({ message: "Not data found" });
		}
		res.status(200).json({ data: subscribers });
	} catch (error) {
		logger.error("Error get all subscribers", error);
		res.status(500).json({ message: "Internal Server Error" });
	}
};
