import { type Accessor, type Setter, Show } from "solid-js";
import { getProgramProgress } from "../getProgramProgress";
import type { RadioState } from "../radio";
import { PlayButton } from "./PlayButton";
import classes from "./PlayerBar.module.css";
import { ProgressBar } from "./ProgressBar";

interface Props {
	radioState: Accessor<RadioState>;
	setIsPlaying: Setter<boolean>;
}

export function PlayerBar(props: Props) {
	const isPlaying = () => {
		const state = props.radioState();
		return state.type === "channelSelected" && state.isPlaying;
	};

	return (
		<Show when={props.radioState().type === "channelSelected"}>
			<div class={classes.playerBar}>
				<div>
					<Show
						when={(() => {
							const state = props.radioState();
							return state.type === "channelSelected" &&
								state.nowPlaying !== undefined
								? state
								: undefined;
						})()}
					>
						{(state) => (
							<span>
								{state().nowPlaying?.title} | {state().radio.name}
							</span>
						)}
					</Show>
				</div>
				<div class={classes.controlsRow}>
					<PlayButton
						isPlaying={isPlaying()}
						onClick={() => props.setIsPlaying((playing: boolean) => !playing)}
					/>
					<Show
						when={(() => {
							const state = props.radioState();
							return state.type === "channelSelected" &&
								state.nowPlaying !== undefined
								? state
								: undefined;
						})()}
					>
						{(state) => {
							// biome-ignore lint:noNonNullAssertion
							const nowPlaying = () => state().nowPlaying!;
							const startTime = () => new Date(nowPlaying().start);
							const endTime = () => new Date(nowPlaying().end);

							return (
								<div class={classes.progressBarContainer}>
									<span>
										{startTime().toLocaleTimeString("fi-FI", {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</span>
									<ProgressBar
										progress={() => getProgramProgress(nowPlaying())}
										transitionTimeMs={1000}
									/>
									<span>
										{endTime().toLocaleTimeString("fi-FI", {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</span>
								</div>
							);
						}}
					</Show>
				</div>
			</div>
		</Show>
	);
}
