import { isToday, isWithinInterval, startOfDay } from "date-fns";
import {
	createEffect,
	createMemo,
	createSignal,
	For,
	lazy,
	onCleanup,
	type Setter,
	Show,
	Suspense,
} from "solid-js";
import { useFullScheduleState, useRadiosState } from "../../state";
import { formatDate } from "../../timeUtils";
import type { ProgramInfo } from "../../types";
import { BrandedProgram } from "../channels/Program";
import { useLayoutState } from "../layoutState";
import classes from "./Guide.module.css";

const Description = lazy(() =>
	import("../description/Description").then((module) => ({
		default: module.Description,
	})),
);

interface GuideDividerProps {
	date: Date;
}

function GuideDivider(props: GuideDividerProps) {
	return (
		<div class={classes.guideDivider}>
			<h2>{formatDate(props.date)}</h2>
		</div>
	);
}

interface ProgramGridProps {
	programs: ProgramInfo[];
	setSelectedProgram: Setter<ProgramInfo | null>;
	watchNowPlaying: boolean;
}

function ProgramGrid(props: ProgramGridProps) {
	const [now, setNow] = createSignal(new Date());
	createEffect(() => {
		if (!props.watchNowPlaying) return;
		const interval = setInterval(() => setNow(new Date()), 1000 * 30);
		onCleanup(() => clearInterval(interval));
	});

	return (
		<div class={classes.programGrid}>
			<For each={props.programs}>
				{(programInfo) => (
					<BrandedProgram
						programInfo={programInfo}
						playingNow={
							props.watchNowPlaying &&
							isWithinInterval(now(), {
								start: new Date(programInfo.program.start),
								end: new Date(programInfo.program.end),
							})
						}
						setSelectedProgram={props.setSelectedProgram}
					/>
				)}
			</For>
		</div>
	);
}

export default function Guide() {
	const { nonModalElementsInert, setNonModalElementsInert } = useLayoutState();
	const radios = useRadiosState();
	const schedule = useFullScheduleState();

	const [selectedProgram, setSelectedProgram] =
		createSignal<ProgramInfo | null>(null);

	const globalSchedule = createMemo(() => {
		const scheduleData = schedule();
		const radiosData = radios();
		if (!scheduleData || !radiosData) return [];
		return Object.entries(scheduleData)
			.map(
				([channelId, programs]) => [radiosData[channelId], programs] as const,
			)
			.flatMap(([radio, programs]) =>
				programs.map((program) => ({ radio, program })),
			)
			.sort((a, b) => {
				const res =
					new Date(a.program.start).getTime() -
					new Date(b.program.start).getTime();
				if (res !== 0) {
					return res;
				}
				return (
					new Date(a.program.end).getTime() - new Date(b.program.end).getTime()
				);
			})
			.reduce<{ date: Date; programs: ProgramInfo[] }[]>((groups, item) => {
				const day = startOfDay(new Date(item.program.start));
				const lastGroup = groups[groups.length - 1];
				if (lastGroup && lastGroup.date.getTime() === day.getTime()) {
					lastGroup.programs.push(item);
				} else {
					groups.push({ date: day, programs: [item] });
				}
				return groups;
			}, []);
	});

	createEffect(() => setNonModalElementsInert(selectedProgram() !== null));

	return (
		<main>
			<div inert={nonModalElementsInert()}>
				<For each={globalSchedule()}>
					{(group, i) => (
						<>
							<GuideDivider date={group.date} />
							<ProgramGrid
								programs={group.programs}
								setSelectedProgram={setSelectedProgram}
								watchNowPlaying={i() === 0 || isToday(group.date)}
							/>
						</>
					)}
				</For>
			</div>
			<Show when={selectedProgram()}>
				{(selected) => (
					<Suspense fallback={null}>
						<Description
							programInfo={selected()}
							setSelectedProgram={setSelectedProgram}
						/>
					</Suspense>
				)}
			</Show>
		</main>
	);
}
