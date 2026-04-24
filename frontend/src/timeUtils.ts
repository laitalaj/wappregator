import { format, getWeek, isThisYear, isToday, isTomorrow, isYesterday } from "date-fns";
import { fi } from "date-fns/locale/fi";

export function formatTime(date: Date | string): string {
	const dateObj = typeof date === "string" ? new Date(date) : date;
	return dateObj.toLocaleTimeString("fi-FI", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

const isWappuEve = (date: Date) => {
	return date.getMonth() === 3 && date.getDate() === 30;
};

const isWappu = (date: Date) => {
	return date.getMonth() === 4 && date.getDate() === 1;
};

const maybeAddWappuInfo = (text: string, date: Date): string => {
	if (isWappuEve(date)) {
		return `${text} (Wappuaattona)`;
	}
	if (isWappu(date)) {
		return `${text} (Wappuna)`;
	}
	return text;
};

export function formatDate(date: Date | string, todayOverride?: string): string {
	const dateObj = typeof date === "string" ? new Date(date) : date;

	if (isYesterday(dateObj)) {
		return maybeAddWappuInfo("Eilen", dateObj);
	}

	if (isToday(dateObj)) {
		return todayOverride ?? maybeAddWappuInfo("Tänään", dateObj);
	}

	if (isTomorrow(dateObj)) {
		return maybeAddWappuInfo("Huomenna", dateObj);
	}

	if (!isThisYear(dateObj)) {
		if (isWappuEve(dateObj)) {
			return `Wappuaattona ${dateObj.getFullYear()}`;
		}
		if (isWappu(dateObj)) {
			return `Wappuna ${dateObj.getFullYear()}`;
		}
		return format(dateObj, "d.M.yyyy");
	}

	const weekOptions = { locale: fi };
	const currentWeek = getWeek(new Date(), weekOptions);
	const programWeek = getWeek(dateObj, weekOptions);
	const weekday = format(dateObj, "eeee", weekOptions);

	if (programWeek === currentWeek) {
		return maybeAddWappuInfo(weekday[0].toUpperCase() + weekday.slice(1), dateObj);
	}

	if (programWeek === currentWeek + 1) {
		return maybeAddWappuInfo(`Ensi viikon ${weekday}`, dateObj);
	}

	if (isWappuEve(dateObj)) {
		return "Wappuaattona";
	}

	if (isWappu(dateObj)) {
		return "Wappuna";
	}

	return format(dateObj, "d.M.");
}

export function formatTimeRange(start: Date | string, end: Date | string): string {
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

export function getPreWappuStartDate(year: number): Date {
	return new Date(year, 0, 1); // January 1st, midnight
}

export function getWappuStartDate(year: number): Date {
	return new Date(year, 3, 30); // April 30th, midnight
}

export function getWappuEndDate(year: number): Date {
	return new Date(year, 4, 2); // May 2nd, midnight
}
