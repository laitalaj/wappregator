import { encodeProgramKey } from "./programKey";
import type { ProgramInfo } from "./types";

function pad2(n: number): string {
	return n.toString().padStart(2, "0");
}

export function formatIcsDateUTC(iso: string): string {
	const d = new Date(iso);
	return (
		`${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
		`T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
	);
}

function escapeIcsText(value: string): string {
	return value
		.replace(/\\/g, "\\\\")
		.replace(/\r\n|\r|\n/g, "\\n")
		.replace(/,/g, "\\,")
		.replace(/;/g, "\\;");
}

// RFC 5545 says content lines should be folded at 75 octets (bytes).
function foldLine(line: string): string {
	const encoder = new TextEncoder();
	const bytes = encoder.encode(line);
	if (bytes.length <= 75) return line;

	const decoder = new TextDecoder();
	const chunks: string[] = [];
	let start = 0;
	while (start < bytes.length) {
		const end = Math.min(start + 75, bytes.length);
		// Ensure we don't split a multi-byte UTF-8 sequence.
		let safeEnd = end;
		while (safeEnd > start && (bytes[safeEnd] & 0xc0) === 0x80) {
			safeEnd--;
		}
		chunks.push(decoder.decode(bytes.subarray(start, safeEnd)));
		start = safeEnd;
	}
	return chunks.join("\r\n ");
}

function line(name: string, value: string): string {
	return foldLine(`${name}:${value}`);
}

function buildDescription(info: ProgramInfo): string {
	const parts: string[] = [];
	if (info.program.description) parts.push(info.program.description);
	const meta: string[] = [];
	if (info.program.host) meta.push(`Juontaja: ${info.program.host}`);
	if (info.program.producer) meta.push(`Tuottaja: ${info.program.producer}`);
	if (info.program.genre) meta.push(`Genre: ${info.program.genre}`);
	if (meta.length) parts.push(meta.join("\n"));
	return parts.join("\n\n");
}

function buildEvent(info: ProgramInfo, stamp: string): string {
	const uid = `${encodeProgramKey(info)}@wappregat.org`;
	const description = buildDescription(info);

	const lines = [
		"BEGIN:VEVENT",
		line("UID", uid),
		line("DTSTAMP", stamp),
		line("DTSTART", formatIcsDateUTC(info.program.start)),
		line("DTEND", formatIcsDateUTC(info.program.end)),
		line("SUMMARY", escapeIcsText(info.program.title)),
	];
	if (description) {
		lines.push(line("DESCRIPTION", escapeIcsText(description)));
	}
	lines.push(line("LOCATION", escapeIcsText(info.radio.name)));
	lines.push("END:VEVENT");
	return lines.join("\r\n");
}

export function buildIcsFile(infos: ProgramInfo[]): string {
	const stamp = formatIcsDateUTC(new Date().toISOString());
	const header = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//wappregat.org//Wappregator//FI",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
	];
	const events = infos.map((info) => buildEvent(info, stamp));
	const footer = ["END:VCALENDAR"];
	return [...header, ...events, ...footer].join("\r\n") + "\r\n";
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
