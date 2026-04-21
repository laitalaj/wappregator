import { useSearchParams } from "@solidjs/router";
import { type Accessor, createEffect, createSignal, type Setter } from "solid-js";

import { encodeProgramKey, findProgramByKey } from "./programKey";
import type { ProgramInfo } from "./types";

const PARAM_NAME = "ohjelma";

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
			const found = findProgramByKey(programs(), key);
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
