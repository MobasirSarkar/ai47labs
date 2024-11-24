import { WeatherApiResponse } from "../types/types";
import { WEATHER_API_KEY } from "../utils/env";
import logger from "../logger/logger";
import { WEATHER_CODE } from "../types/weatherCode";

// Function to fetch weather data
export const FetchWeather = async (reqLocation: string): Promise<string> => {
	if (!WEATHER_API_KEY) {
		throw new Error("WEATHER_API_KEY is missing.");
	}

	const BASE_URL = `https://api.tomorrow.io/v4/weather/realtime?location=${reqLocation}&apikey=${WEATHER_API_KEY}`;

	try {
		// Options for the fetch request
		const options = { method: "GET", headers: { Accept: "application/json" } };
		const response = await fetch(BASE_URL, options);

		// Check if the response was successful
		if (!response.ok) {
			throw new Error("Failed to fetch weather data.");
		}

		// Parse the response JSON
		const responseData = (await response.json()) as WeatherApiResponse;

		// Check if location and data are available in the response
		const { location, data } = responseData;

		// If location or data is missing, handle the error
		if (!location || !data) {
			throw new Error("Missing location or weather data in the response.");
		}

		const { name: locationName, type: locationType } = location;
		const { temperature, weatherCode, windSpeed, humidity } = data.values;

		const weather = WEATHER_CODE[weatherCode] || "Unknown Weather Condition";
		const showLocation = `${locationName ? `${locationName} (${locationType ?? "unknown"})` : "your location"}`;

		return `
      🌍 Location: ${showLocation}
      🌦 Weather: ${weather}
      🌡 Temperature: ${temperature}°C
      💧 Humidity: ${humidity}%
      🌬 Wind Speed: ${windSpeed} m/s
    `.trim();
	} catch (error) {
		logger.error(`FetchWeather error: ${(error as Error).message}`);
		throw new Error("Failed to fetch weather data. Please try again.");
	}
};
