import type { ProgramInfo } from "./types";

export function buildDescription(info: ProgramInfo): string {
	const parts: string[] = [];
	if (info.program.description) parts.push(info.program.description);
	const meta: string[] = [];
	if (info.program.host) meta.push(`Juontaja: ${info.program.host}`);
	if (info.program.producer) meta.push(`Tuottaja: ${info.program.producer}`);
	if (info.program.genre) meta.push(`Genre: ${info.program.genre}`);
	if (meta.length) parts.push(meta.join("\n"));
	return parts.join("\n\n");
}

function pad2(n: number): string {
	return n.toString().padStart(2, "0");
}

function formatIcsDateUTC(iso: string): string {
	const d = new Date(iso);
	return (
		`${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
		`T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
	);
}

export function buildGoogleCalendarUrl(info: ProgramInfo): string {
	const params = new URLSearchParams({
		action: "TEMPLATE",
		text: info.program.title,
		dates: `${formatIcsDateUTC(info.program.start)}/${formatIcsDateUTC(info.program.end)}`,
		location: info.radio.name,
	});
	const description = buildDescription(info);
	if (description) {
		params.set("details", description);
	}
	return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
