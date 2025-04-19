import { type Accessor, createSignal, onCleanup, Show } from "solid-js";
import type { Program as ProgramType } from "../types";
import classes from "./Program.module.css";

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
			<h3>
				{props.program().title}
				<br />
				<span>
					{new Date(props.program().start).toLocaleString()} -{" "}
					{new Date(props.program().end).toLocaleString()}
				</span>
			</h3>
			<Show when={props.playingNow}>
				<div class={classes.progressBar}>
					<div class={classes.progressBarFill} />
				</div>
			</Show>
		</div>
	);
}
