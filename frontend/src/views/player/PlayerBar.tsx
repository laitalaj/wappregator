import {
	type Accessor,
	Match,
	type Setter,
	Show,
	Switch,
	createMemo,
	createSignal,
} from "solid-js";
import { getProgramProgress } from "../../getProgramProgress";
import type { RadioState } from "../../radio";
import { formatTime } from "../../timeUtils";
import { PlayButton } from "../common/PlayButton";
import { ProgressBar } from "../common/ProgressBar";
import { brandColorVariablesStyle } from "../common/brandUtils";
import { AudioPlayer } from "./AudioPlayer";
import { HlsAudioPlayer } from "./HlsAudioPlayer";
import classes from "./PlayerBar.module.css";
import { VolumeSlider } from "./VolumeSlide";
import { getHlsStreamUrl } from "./audioPlayerCommon";

interface Props {
	radioState: Accessor<RadioState | undefined>;
	setIsPlaying: Setter<boolean>;
}

export function PlayerBar(props: Props) {
	const [volume, setVolume] = createSignal(100);

	const isPlaying = createMemo(() => {
		return props.radioState()?.isPlaying ?? false;
	});

	const statusText = createMemo(() => {
		const state = props.radioState();

		if (!state) {
			return "Ei valittua kanavaa";
		}

		const parts = [];

		if (state.currentSong) {
			if (state.currentSong.artist) {
				parts.push(`${state.currentSong.artist} – ${state.currentSong.title}`);
			} else {
				parts.push(state.currentSong.title);
			}
		}

		if (state.currentProgram) {
			parts.push(state.currentProgram.title);
		}

		parts.push(state.radio.name);

		return parts.join(" | ");
	});

	const isHlsChannel = createMemo(() => {
		const state = props.radioState();

		if (!state) {
			return false;
		}

		return getHlsStreamUrl(state.radio) !== undefined;
	});

	return (
		<Show when={props.radioState()}>
			{(state) => {
				const nowPlaying = () => state().currentProgram;
				return (
					<>
						<Switch>
							<Match when={isHlsChannel()}>
								<HlsAudioPlayer
									radio={() => state().radio}
									isPlaying={isPlaying}
									volume={volume}
									nowPlaying={() => state().currentProgram}
									setIsPlaying={props.setIsPlaying}
								/>
							</Match>
							<Match when={true}>
								<AudioPlayer
									radio={() => state().radio}
									isPlaying={isPlaying}
									volume={volume}
									nowPlaying={() => state().currentProgram}
									setIsPlaying={props.setIsPlaying}
								/>
							</Match>
						</Switch>

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
								<Show when={nowPlaying()}>
									{(program) => {
										return (
											<div class={classes.progressBarContainer}>
												<span>{formatTime(program().start)}</span>
												<ProgressBar
													progress={() => getProgramProgress(program())}
													transitionTimeMs={1000}
												/>
												<span>{formatTime(program().end)}</span>
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
