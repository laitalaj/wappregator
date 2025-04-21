import {
	type Accessor,
	type Setter,
	Show,
	createMemo,
	createSignal,
} from "solid-js";
import { getProgramProgress } from "../../getProgramProgress";
import type { RadioState } from "../../radio";
import { formatTime } from "../../timeUtils";
import type { Program } from "../../types";
import { PlayButton } from "../common/PlayButton";
import { ProgressBar } from "../common/ProgressBar";
import { brandColorVariablesStyle } from "../common/brandUtils";
import { AudioPlayer } from "./AudioPlayer";
import classes from "./PlayerBar.module.css";
import { VolumeSlider } from "./VolumeSlide";

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
		const state = props.radioState();

		if (state.type !== "channelSelected") {
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
						<section
							class={classes.playerBar}
							aria-label="Mediasoitin"
							style={brandColorVariablesStyle(state().radio.brand)}
						>
							<span aria-label="Nyt soi">{statusText()}</span>
							<div class={classes.controlsRow}>
								<PlayButton
									isPlaying={isPlaying}
									onClick={() =>
										props.setIsPlaying((playing: boolean) => !playing)
									}
								/>
								<Show when={getNowPlayingState(state())}>
									{(state) => {
										const nowPlaying = () => state().nowPlaying;

										return (
											<div class={classes.progressBarContainer}>
												<span>{formatTime(nowPlaying().start)}</span>
												<ProgressBar
													progress={() => getProgramProgress(nowPlaying())}
													transitionTimeMs={1000}
												/>
												<span>{formatTime(nowPlaying().end)}</span>
											</div>
										);
									}}
								</Show>
								<VolumeSlider setVolume={setVolume} volume={volume} />
							</div>
						</section>
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
