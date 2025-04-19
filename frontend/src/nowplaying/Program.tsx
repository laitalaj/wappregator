import { formatRelative, isToday } from "date-fns";
import { fi } from "date-fns/locale/fi";
import { type Accessor, Show, createSignal, onCleanup } from "solid-js";
import { getProgramProgress } from "../getProgramProgress";
import type { Program as ProgramType } from "../types";
import classes from "./Program.module.css";
import { ProgressBar } from "./ProgressBar";

const NOW_PLAYING_UPDATE_INTERVAL = 1000;

interface Props {
	program: Accessor<ProgramType>;
	playingNow: boolean;
}

export function Program(props: Props) {
	const [nowPlayingProgress, setNowPlayingProgress] = createSignal(0);

	const updateCompletion = setInterval(() => {
		if (!props.playingNow) {
			return 0;
		}

		const program = props.program();

		if (!program) {
			return 0;
		}

		const progress = getProgramProgress(program);
		setNowPlayingProgress(progress);
	}, NOW_PLAYING_UPDATE_INTERVAL);

	onCleanup(() => clearInterval(updateCompletion));

	return (
		<div class={classes.program}>
			<h3>{props.program().title}</h3>
			<ProgramTime
				startTime={props.program().start}
				endTime={props.program().end}
			/>
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
