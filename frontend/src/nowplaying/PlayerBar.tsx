import { IconVolume, IconVolume2, IconVolume3 } from "@tabler/icons-solidjs";
import {
	type Accessor,
	type Setter,
	Show,
	createMemo,
	createSignal,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import commonClasses from "../common.module.css";
import { getProgramProgress } from "../getProgramProgress";
import type { RadioState } from "../radio";
import type { Program } from "../types";
import { AudioPlayer } from "./AudioPlayer";
import { PlayButton } from "./PlayButton";
import classes from "./PlayerBar.module.css";
import { ProgressBar } from "./ProgressBar";

interface Props {
	radioState: Accessor<RadioState>;
	setIsPlaying: Setter<boolean>;
}

export function PlayerBar(props: Props) {
	const [volume, setVolume] = createSignal(100);

	const isPlaying = () => {
		const state = props.radioState();
		return state.type === "channelSelected" && state.isPlaying;
	};

	const statusText = createMemo(() => {
		const state = getNowPlayingState(props.radioState());

		if (!state) {
			return "Ei valittua kanavaa";
		}

		if (state?.nowPlaying) {
			return `${state.nowPlaying.title} | ${state.radio.name}`;
		}

		return state.radio.name;
	});

	return (
		<Show when={getChannelSelectedState(props.radioState())}>
			{(state) => {
				return (
					<>
						<AudioPlayer
							radio={() => state().radio}
							isPlaying={isPlaying}
							volume={volume}
						/>
						<div class={classes.playerBar}>
							<span>{statusText()}</span>
							<div class={classes.controlsRow}>
								<PlayButton
									isPlaying={isPlaying()}
									onClick={() =>
										props.setIsPlaying((playing: boolean) => !playing)
									}
								/>
								<Show when={getNowPlayingState(state())}>
									{(state) => {
										const nowPlaying = () => state().nowPlaying;
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
								<VolumeSlider setVolume={setVolume} volume={volume} />
							</div>
						</div>
					</>
				);
			}}
		</Show>
	);
}

function getChannelSelectedState(
	radioState: RadioState,
): (RadioState & { type: "channelSelected" }) | undefined {
	if (radioState.type === "channelSelected") {
		return radioState;
	}
	return undefined;
}

function getNowPlayingState(
	radioState: RadioState,
): (RadioState & { type: "channelSelected"; nowPlaying: Program }) | undefined {
	if (radioState.type === "channelSelected" && radioState.nowPlaying) {
		// lol typescript
		return radioState as RadioState & {
			type: "channelSelected";
			nowPlaying: Program;
		};
	}
	return undefined;
}

interface VolumeSliderProps {
	volume: Accessor<number>;
	setVolume?: (volume: number) => void;
}

function VolumeSlider(props: VolumeSliderProps) {
	const handleVolumeChange = (e: Event) => {
		const target = e.target as HTMLInputElement;
		const newVolume = Number(target.value);
		props.setVolume?.(newVolume);
	};
	const [showVolume, setShowVolume] = createSignal(false);

	const volumeIcon = createMemo(() => {
		if (props.volume() === 0) {
			return IconVolume3;
		}

		if (props.volume() < 50) {
			return IconVolume2;
		}

		return IconVolume;
	});

	return (
		<>
			<button
				classList={{
					[classes.volumeButton]: true,
					[commonClasses.buttonHoverInverse]: true,
				}}
				type="button"
				onClick={() => setShowVolume((prev) => !prev)}
			>
				<Dynamic
					component={volumeIcon()}
					color="currentcolor"
					width={32}
					height={32}
				/>
			</button>
			<Show when={showVolume()}>
				<div class={classes.volumeSliderContainer}>
					<input
						type="range"
						min="0"
						max="100"
						class={classes.volumeSlider}
						id="volume"
						value={props.volume()}
						onInput={handleVolumeChange}
					/>
				</div>
			</Show>
		</>
	);
}
