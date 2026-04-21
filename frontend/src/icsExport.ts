import type { EventAttributes } from "ics";
import { createEvents } from "ics";

import { buildDescription } from "./calendarUtils";
import { encodeProgramKey } from "./programKey";
import type { ProgramInfo } from "./types";

function toEventAttributes(info: ProgramInfo): EventAttributes {
	const description = buildDescription(info);
	const event: EventAttributes = {
		uid: `${encodeProgramKey(info)}@wappregat.org`,
		start: new Date(info.program.start).getTime(),
		end: new Date(info.program.end).getTime(),
		title: info.program.title,
		location: info.radio.name,
		url: "https://wappregat.org/",
	};
	if (description) {
		event.description = description;
	}
	return event;
}

export function buildIcsFile(infos: ProgramInfo[]): string {
	const events = infos.map(toEventAttributes);
	const { error, value } = createEvents(events, {
		productId: "-//wappregat.org//Wappregator//FI",
	});
	if (error) {
		throw new Error(`Failed to create ICS: ${error}`);
	}
	return value!;
}

export function downloadIcsFile(content: string, filename: string): void {
	const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
