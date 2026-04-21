import { format, isSameMinute, parse } from "date-fns";

import type { ProgramInfo } from "./types";

export const TIME_FORMAT = "yyyy-MM-dd'T'HH:mm";

// Programs don't have unique IDs, so we have to invent one
export function encodeProgramKey(info: ProgramInfo): string {
	const start = new Date(info.program.start);
	return `${info.radio.id}@${format(start, TIME_FORMAT)}`;
}

export function findProgramByKey(programs: ProgramInfo[], key: string): ProgramInfo | null {
	const parts = key.split("@");

	if (parts.length !== 2) {
		return null;
	}

	const [radioId, timeStr] = parts;
	let targetTime: number;
	try {
		targetTime = parse(timeStr, TIME_FORMAT, new Date()).getTime();
	} catch {
		return null;
	}

	if (Number.isNaN(targetTime)) {
		return null;
	}

	const target = new Date(targetTime);
	return (
		programs.find((p) => {
			if (p.radio.id !== radioId) return false;
			const start = new Date(p.program.start);
			return isSameMinute(target, start);
		}) ?? null
	);
}
