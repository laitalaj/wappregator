import { format, isToday, isTomorrow } from "date-fns";
import { fi } from "date-fns/locale/fi";
import {
	type Accessor,
	children,
	createMemo,
	createSignal,
	Index,
	type JSX,
	onCleanup,
	onMount,
	type Setter,
	Show,
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
	showScheduleLabel: boolean;
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
			<span class={classes.programTitle}>{props.program().title}</span>
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
			<span class={classes.programTitle}>Ei ohjelmaa</span>
		</div>
	);
}

export function MaybeProgram(props: MaybeProgramProps) {
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
			<Show when={program()} fallback={<NoProgram />}>
				{(program) => (
					<Program program={() => program()} playingNow={props.playingNow} />
				)}
			</Show>
		</Dynamic>
	);
}

interface PresentationalProgramGroupProps {
	title: Accessor<string>;
	children: JSX.Element;
}

export function PresentationalProgramGroup(
	props: PresentationalProgramGroupProps,
) {
	const c = children(() => props.children);
	return (
		<div class={classes.programGroup}>
			<h3>{props.title()}</h3>
			{c()}
		</div>
	);
}

interface ProgramGroupProps {
	date: Accessor<string>;
	programs: Accessor<ProgramInfo[]>;
	setSelectedProgram: Setter<ProgramInfo | null>;
}

export function ProgramGroup(props: ProgramGroupProps) {
	const title = createMemo(() => {
		const date = new Date(props.date());

		if (isToday(date)) {
			return "Myöhemmin tänään";
		}

		if (isTomorrow(date)) {
			return "Huomenna";
		}

		const weekday = format(date, "eeee", { locale: fi });
		return weekday[0].toUpperCase() + weekday.slice(1);
	});

	return (
		<PresentationalProgramGroup title={title}>
			<ul>
				<Index each={props.programs()}>
					{(program) => {
						return (
							<li>
								<MaybeProgram
									programInfo={program}
									playingNow={false}
									setSelectedProgram={props.setSelectedProgram}
									showScheduleLabel={false}
								/>
							</li>
						);
					}}
				</Index>
			</ul>
		</PresentationalProgramGroup>
	);
}
