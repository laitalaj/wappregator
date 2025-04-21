import { formatRelative, isToday } from "date-fns";
import { fi } from "date-fns/locale/fi";
import {
	type Accessor,
	Match,
	type Setter,
	Show,
	Switch,
	createMemo,
	createSignal,
	onCleanup,
	onMount,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { getProgramProgress } from "../../getProgramProgress";
import { formatTimeRange } from "../../timeUtils";
import type { ProgramInfo, Program as ProgramType } from "../../types";
import { ProgressBar } from "../common/ProgressBar";
import classes from "./Program.module.css";

const NOW_PLAYING_UPDATE_INTERVAL = 1000;

interface ProgramProps {
	program: Accessor<ProgramType>;
	playingNow: boolean;
}

interface MaybeProgramProps {
	programInfo: Accessor<ProgramInfo | undefined>;
	playingNow: boolean;
	setSelectedProgram: Setter<ProgramInfo | null>;
}

export function Program(props: ProgramProps) {
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
	const timeRange = createMemo(() =>
		formatTimeRange(props.startTime(), props.endTime()),
	);

	return (
		<div class={classes.time}>
			<span>{timeRange()}</span>
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

export function MaybeProgram(props: MaybeProgramProps) {
	const startTime = () => props.programInfo()?.program.start;
	const program = createMemo(() => props.programInfo()?.program);
	const handleClick = () => {
		const info = props.programInfo();
		if (info) {
			props.setSelectedProgram(info);
		}
	};

	return (
		<Dynamic
			component={program() ? "button" : "div"}
			class={classes.programWrapper}
			onClick={handleClick}
			type="button"
			aria-label={program() ? "Näytä ohjelmatiedot" : undefined}
		>
			<ScheduleLabel playingNow={props.playingNow} startTime={startTime} />
			<Show when={program()} fallback={<NoProgram />}>
				{(program) => (
					<Program program={() => program()} playingNow={props.playingNow} />
				)}
			</Show>
		</Dynamic>
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
