import axios from "axios";
import { WeatherApiResponse } from "../types/types";
import { WEATHER_API_KEY } from "../utils/env";
import logger from "../logger/logger";

// Base url for the api
const BASE_URL = "https://api.tomorrow.io/v4/weather/realtime";

//FetchWeather takes a two parameters which are location and apikey.
//It's return the realtime weather based on parameter location.
//
if (!WEATHER_API_KEY) {
	throw new Error("WEATHER_API_KEY is missing.");
}
export const FetchWeather = async (reqLocation: string): Promise<string> => {
	try {
		// response is the weather api response
		// WeatherApiResponse is Interface which Replicate the actual reponse of the weather api.
		const response = await axios.get<WeatherApiResponse>(BASE_URL, {
			params: {
				reqLocation,
				apikey: WEATHER_API_KEY,
			},
		});
		// Destructing the response
		const { location, data } = response.data;
		const { name: locationName, type: locationType } = location;
		const {
			temperature,
			weatherCode: weather,
			windSpeed,
			humidity,
		} = data.values;

		return `
      🌍 Location: ${locationName}${locationType}
      🌦 Weather: ${weather}
      🌡 Temperature: ${temperature}°C
      💧 Humidity: ${humidity}%
      🌬 Wind Speed: ${windSpeed} m/s
    `.trim();
	} catch (error) {
		logger.error(error);
		throw new Error("Failed to fetch weather data. Please try again.");
	}
};
