/**
 * Schedules a function to run daily at a specific time.
 * @param task - The function to execute.
 * @param hour - The hour of the day (24-hour format) when the task should run.
 * @param minute - The minute of the hour when the task should run.
 */
export function Scheduler(
	task: () => void,
	hour: number,
	minute: number,
): void {
	const now = new Date();
	const nextRun = new Date();

	nextRun.setHours(hour, minute, 0, 0);

	// If the time has already passed today, schedule it for tomorrow;
	if (nextRun <= now) {
		nextRun.setDate(nextRun.getDate() + 1);
	}

	const timeUntilNextRun = nextRun.getTime() - now.getTime();

	setTimeout(() => {
		task();
		setInterval(task, 24 * 60 * 60 * 1000);
	}, timeUntilNextRun);
}
