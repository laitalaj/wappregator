import { type Accessor, createSignal, onCleanup, Show } from "solid-js";
import type { Program as ProgramType } from "../types";
import classes from "./Program.module.css";
import { formatRelative, isToday } from "date-fns";
import { fi } from "date-fns/locale/fi";

const NOW_PLAYING_UPDATE_INTERVAL = 1000;
const NOW_PLAYING_UPDATE_INTERVAL_MS = `${NOW_PLAYING_UPDATE_INTERVAL}ms`;

interface Props {
	program: Accessor<ProgramType>;
	playingNow: boolean;
}

export function Program(props: Props) {
	const [nowPlayingProgress, setNowPlayingProgress] = createSignal(0);
	const nowPlayingProgressPercentage = () => `${nowPlayingProgress() * 100}%`;

	const updateCompletion = setInterval(() => {
		if (!props.playingNow) {
			return 0;
		}

		const program = props.program();

		if (!program) {
			return 0;
		}

		const now = new Date();
		const start = new Date(program.start);
		const end = new Date(program.end);
		const totalDuration = end.getTime() - start.getTime();
		const elapsed = now.getTime() - start.getTime();
		const progress = Math.min(Math.max(0, elapsed / totalDuration), 1);
		setNowPlayingProgress(progress);
	}, NOW_PLAYING_UPDATE_INTERVAL);

	onCleanup(() => clearInterval(updateCompletion));

	return (
		<div
			class={classes.program}
			style={{
				"--now-playing-update-interval": NOW_PLAYING_UPDATE_INTERVAL_MS,
				"--progress": nowPlayingProgressPercentage(),
			}}
		>
			<h3>{props.program().title}</h3>
			<ProgramTime
				startTime={props.program().start}
				endTime={props.program().end}
			/>
			<Show when={props.playingNow}>
				<div class={classes.progressBar}>
					<div class={classes.progressBarFill} />
				</div>
			</Show>
		</div>
	);
}

function ProgramTime(props: {
	startTime: string;
	endTime: string;
}) {
	const startTime = new Date(props.startTime);
	const endTime = new Date(props.endTime);

	return (
		<div class={classes.time}>
			<span>
				{startTime.toLocaleTimeString("fi-FI", {
					hour: "2-digit",
					minute: "2-digit",
				})}
				{" - "}
				{endTime.toLocaleTimeString("fi-FI", {
					hour: "2-digit",
					minute: "2-digit",
				})}
			</span>
		</div>
	);
}

export function NoProgram() {
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
	return (
		<div class={classes.programWrapper}>
			<ScheduleLabel
				playingNow={props.playingNow}
				startTime={props.program()?.start}
			/>
			<Show
				when={props.program()}
				fallback={<div class={classes.noProgram}>Ei ohjelmaa</div>}
			>
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
	startTime?: string;
}) {
	const startTimeDate = props.startTime ? new Date(props.startTime) : undefined;
	const nextIsToday = startTimeDate ? isToday(startTimeDate) : false;
	const nextDate = startTimeDate
		? formatRelative(startTimeDate, new Date(), {
				locale: {
					...fi,
					formatRelative: (token) => formatRelativeLocale[token],
				},
			})
		: undefined;

	if (props.playingNow) {
		return <span class={classes.scheduleLabel}>Nyt</span>;
	}

	if (!props.playingNow) {
		return (
			<span class={classes.scheduleLabel}>
				Seuraavaksi
				{!nextIsToday && nextDate ? ` (${nextDate})` : null}
			</span>
		);
	}
}
