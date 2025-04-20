import { formatRelative, isToday } from "date-fns";
import { fi } from "date-fns/locale/fi";
import {
	type Accessor,
	Match,
	Show,
	Switch,
	createMemo,
	createSignal,
	onCleanup,
	onMount,
} from "solid-js";
import { getProgramProgress } from "../../getProgramProgress";
import type { Program as ProgramType } from "../../types";
import classes from "./Program.module.css";
import { ProgressBar } from "../common/ProgressBar";

const NOW_PLAYING_UPDATE_INTERVAL = 1000;

interface Props {
	program: Accessor<ProgramType>;
	playingNow: boolean;
}

export function Program(props: Props) {
	const [nowPlayingProgress, setNowPlayingProgress] = createSignal(0);

	onMount(() => {
		if (!props.playingNow) {
			return;
		}

		const updateCompletion = setInterval(() => {
			const program = props.program();

			if (!program) {
				return;
			}

			const progress = getProgramProgress(program);
			setNowPlayingProgress(progress);
		}, NOW_PLAYING_UPDATE_INTERVAL);

		onCleanup(() => clearInterval(updateCompletion));
	});

	const startTime = () => props.program().start;
	const endTime = () => props.program().end;

	return (
		<div class={classes.program}>
			<h3>{props.program().title}</h3>
			<ProgramTime startTime={startTime} endTime={endTime} />
			<Show when={props.playingNow}>
				<ProgressBar
					progress={nowPlayingProgress}
					transitionTimeMs={NOW_PLAYING_UPDATE_INTERVAL}
				/>
			</Show>
		</div>
	);
}

function ProgramTime(props: {
	startTime: Accessor<string>;
	endTime: Accessor<string>;
}) {
	function timestampToTime(timestamp: string): string {
		const date = new Date(timestamp);
		return date.toLocaleTimeString("fi-FI", {
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	const startTime = createMemo(() => timestampToTime(props.startTime()));
	const endTime = createMemo(() => timestampToTime(props.endTime()));

	return (
		<div class={classes.time}>
			<span>
				{startTime()}
				{" - "}
				{endTime()}
			</span>
		</div>
	);
}

function NoProgram() {
	return (
		<div class={classes.noProgram}>
			<span>Ei ohjelmaa</span>
		</div>
	);
}

export function MaybeProgram(props: {
	program: Accessor<ProgramType | undefined>;
	playingNow: boolean;
}) {
	const startTime = () => props.program()?.start;

	return (
		<div class={classes.programWrapper}>
			<ScheduleLabel playingNow={props.playingNow} startTime={startTime} />
			<Show when={props.program()} fallback={<NoProgram />}>
				{(program) => (
					<Program program={program} playingNow={props.playingNow} />
				)}
			</Show>
		</div>
	);
}

const formatRelativeLocale = {
	lastWeek: "'viime' eeee",
	yesterday: "'eilen'",
	today: "'tänään'",
	tomorrow: "'huomenna'",
	nextWeek: "'ensi' eeee",
	other: "P",
};

function ScheduleLabel(props: {
	playingNow: boolean;
	startTime: Accessor<string | undefined>;
}) {
	const startTimeDate = createMemo(() => {
		const startTime = props.startTime();
		return startTime ? new Date(startTime) : undefined;
	});

	const nextIsToday = createMemo(() => {
		const date = startTimeDate();
		return date ? isToday(date) : false;
	});

	const nextDate = createMemo(() => {
		const date = startTimeDate();
		return date
			? formatRelative(date, new Date(), {
					locale: {
						...fi,
						formatRelative: (token) => formatRelativeLocale[token],
					},
				})
			: undefined;
	});

	return (
		<Switch>
			<Match when={props.playingNow}>
				<span class={classes.scheduleLabel}>Nyt</span>
			</Match>
			<Match when={!props.playingNow}>
				<span class={classes.scheduleLabel}>
					Seuraavaksi
					{!nextIsToday() && nextDate() ? ` (${nextDate()})` : null}
				</span>
			</Match>
		</Switch>
	);
}
