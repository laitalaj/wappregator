export function formatTime(date: Date | string): string {
	const dateObj = typeof date === "string" ? new Date(date) : date;
	return dateObj.toLocaleTimeString("fi-FI", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function formatTimeRange(
	start: Date | string,
	end: Date | string,
): string {
	let startDate: Date;
	let endDate: Date;

	if (typeof start === "string") {
		startDate = new Date(start);
	} else {
		startDate = start;
	}

	if (typeof end === "string") {
		endDate = new Date(end);
	} else {
		endDate = end;
	}

	const formattedStart = formatTime(startDate);
	const formattedEnd = formatTime(endDate);
	return `${formattedStart} – ${formattedEnd}`;
}
