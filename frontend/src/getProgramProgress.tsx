import type { Program as ProgramType } from "./types";

export function getProgramProgress(program: ProgramType) {
	const now = new Date();
	const start = new Date(program.start);
	const end = new Date(program.end);
	const totalDuration = end.getTime() - start.getTime();
	const elapsed = now.getTime() - start.getTime();
	const progress = Math.min(Math.max(0, elapsed / totalDuration), 1);
	return progress;
}
