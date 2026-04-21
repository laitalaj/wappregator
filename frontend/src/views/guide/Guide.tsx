import { IconCalendarDown } from "@tabler/icons-solidjs";
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

import { encodeProgramKey } from "../../programKey";
import { useFullScheduleState, useRadiosState } from "../../state";
import { formatDate } from "../../timeUtils";
import type { ProgramInfo } from "../../types";
import { useSelectedProgram } from "../../useSelectedProgram";
import { BrandedProgram } from "../channels/Program";
import { useLayoutState } from "../layoutState";
import { type ProgramInfoWithId, Search } from "../search/Search";

import appClasses from "../App.module.css";
import classes from "./Guide.module.css";

const Description = lazy(() =>
	import("../programModal/ProgramModal").then((module) => ({
		default: module.ProgramModal,
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
	// Use the bg color of the last program for the section background to fill the gap at the end
	const sectionBackground = createMemo(() => {
		const lastProgram = props.programs[props.programs.length - 1];
		return lastProgram
			? `color-mix(in srgb, ${lastProgram.radio.brand.background_color} 80%, black)`
			: "var(--bg-color)";
	});

	createEffect(() => {
		if (!props.watchNowPlaying) return;
		const interval = setInterval(() => setNow(new Date()), 1000 * 30);
		onCleanup(() => clearInterval(interval));
	});

	return (
		<div class={classes.programGrid} style={{ "background-color": sectionBackground() }}>
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

const groupPrograms = (schedule: ProgramInfo[]) =>
	schedule
		.sort((a, b) => {
			const res = new Date(a.program.start).getTime() - new Date(b.program.start).getTime();
			if (res !== 0) {
				return res;
			}
			return new Date(a.program.end).getTime() - new Date(b.program.end).getTime();
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

export default function Guide() {
	const { nonModalElementsInert, setNonModalElementsInert, favourites } = useLayoutState();
	const radios = useRadiosState();
	const schedule = useFullScheduleState();

	const programInfo = createMemo(() => {
		const scheduleData = schedule();
		const radiosData = radios();
		if (!scheduleData || !radiosData) return [];
		return Object.entries(scheduleData)
			.map(([channelId, programs]) => [radiosData[channelId], programs] as const)
			.flatMap(([radio, programs]) =>
				programs.map((program, idx) => ({
					id: `${radio.id}-${idx}`,
					radio,
					program,
				})),
			);
	});

	// eslint-disable-next-line solid/reactivity
	const [selectedProgram, setSelectedProgram] = useSelectedProgram(programInfo);

	const [searchResults, setSearchResults] = createSignal<ProgramInfoWithId[]>([]);
	const [searchActive, setSearchActive] = createSignal(false);
	const [searchInProgress, setSearchInProgress] = createSignal(false);
	const [favouritesOnly, setFavouritesOnly] = createSignal(false);

	const filteredPrograms = createMemo(() => {
		const base = searchActive() ? searchResults() : programInfo();
		if (!favouritesOnly()) return base;
		const favSet = favourites();
		return base.filter((info) => favSet.has(encodeProgramKey(info)));
	});

	const groupedSchedule = createMemo(() => groupPrograms(filteredPrograms()));

	const showExportToolbar = createMemo(() => groupedSchedule().length > 0);

	const exportFilename = () => {
		if (searchActive()) return "wappregator-haku.ics";
		if (favouritesOnly()) return "wappregator-suosikit.ics";
		return "wappregator-kaikki.ics";
	};

	const handleExport = async () => {
		const { buildIcsFile, downloadIcsFile } = await import("../../icsExport");
		downloadIcsFile(buildIcsFile(filteredPrograms()), exportFilename());
	};

	const emptyMessage = () => {
		if (schedule() === undefined) return "Ladataan...";
		if (searchInProgress()) return "Haetaan...";
		if (favouritesOnly() && favourites().size === 0) {
			return "Ei suosikkeja vielä — lisää ohjelmia suosikeiksi sydänpainikkeella.";
		}
		return "Ei hakutuloksia :^(";
	};

	const exportText = () => {
		if (searchActive()) return "Lisää näkymä kalenteriin (.ics)";
		if (favouritesOnly()) return "Lisää suosikit kalenteriin (.ics)";
		return "Lisää kaikki ohjelmat kalenteriin (.ics)";
	};

	createEffect(() => setNonModalElementsInert(selectedProgram() !== null));

	return (
		<>
			<div
				classList={{
					[appClasses.content]: true,
					[appClasses.dimmedContent]: !!selectedProgram(),
				}}
				inert={nonModalElementsInert()}
			>
				<Search
					schedule={programInfo}
					radios={radios}
					setActive={setSearchActive}
					setInProgress={setSearchInProgress}
					setResults={setSearchResults}
					favouritesOnly={favouritesOnly}
					setFavouritesOnly={setFavouritesOnly}
				/>
				<Show when={showExportToolbar()}>
					<div class={classes.exportToolbar}>
						<button type="button" class={classes.exportLink} onClick={handleExport}>
							<IconCalendarDown size={18} role="presentation" />
							{exportText()}
						</button>
					</div>
				</Show>
				<Show
					when={groupedSchedule().length}
					fallback={<p class={classes.nothingToShow}>{emptyMessage()}</p>}
				>
					<For each={groupedSchedule()}>
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
				</Show>
			</div>
			<Show when={selectedProgram()}>
				{(selected) => (
					<Suspense fallback={null}>
						<Description programInfo={selected()} setSelectedProgram={setSelectedProgram} />
					</Suspense>
				)}
			</Show>
		</>
	);
}
