import { useSearchParams } from "@solidjs/router";
import { format, parse, isSameMinute } from "date-fns";
import { type Accessor, createEffect, createSignal, type Setter } from "solid-js";

import type { ProgramInfo } from "./types";

const PARAM_NAME = "ohjelma";
const TIME_FORMAT = "yyyy-MM-dd'T'HH:mm";

// Programs don't have unique IDs, so we have to invent one
function encodeProgramKey(info: ProgramInfo): string {
	const start = new Date(info.program.start);
	return `${info.radio.id}@${format(start, TIME_FORMAT)}`;
}

function findProgram(programs: ProgramInfo[], key: string): ProgramInfo | null {
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

export function useSelectedProgram(
	programs: Accessor<ProgramInfo[]>,
): [Accessor<ProgramInfo | null>, Setter<ProgramInfo | null>] {
	const [searchParams, setSearchParams] = useSearchParams<{
		[PARAM_NAME]?: string;
	}>();
	const [selectedProgram, setSelectedProgram] = createSignal<ProgramInfo | null>(null);

	// Track whether we pushed a history entry so we know
	// whether closing should go back or just replace the URL
	let pushedEntry = false;

	// Sync URL -> signal for back/forward navigation
	createEffect(() => {
		const key = searchParams[PARAM_NAME];
		if (key) {
			const found = findProgram(programs(), key);
			setSelectedProgram(found);
		} else {
			pushedEntry = false;
			setSelectedProgram(null);
		}
	});

	// Custom setter that updates both signal and URL
	const setProgram = ((value: ProgramInfo | null) => {
		if (value) {
			const alreadyOpen = searchParams[PARAM_NAME] != null;
			setSelectedProgram(value);
			setSearchParams({ [PARAM_NAME]: encodeProgramKey(value) }, { replace: alreadyOpen });
			if (!alreadyOpen) {
				pushedEntry = true;
			}
		} else if (pushedEntry) {
			// We pushed a history entry, go back to remove it.
			// The popstate will trigger the effect above to clear the signal.
			history.back();
		} else {
			// Direct link or already-present param — just remove it
			setSelectedProgram(null);
			setSearchParams({ [PARAM_NAME]: undefined }, { replace: true });
		}
	}) as Setter<ProgramInfo | null>;

	return [selectedProgram, setProgram];
}
