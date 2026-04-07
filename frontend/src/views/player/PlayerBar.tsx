import { createMemo, createSignal, lazy, Match, Show, Suspense, Switch } from "solid-js";

import { getProgramProgress } from "../../getProgramProgress";
import { formatTime } from "../../timeUtils";
import { brandColorVariablesStyle } from "../common/brandUtils";
import { PlayButton } from "../common/PlayButton";
import { ProgressBar } from "../common/ProgressBar";
import { AudioPlayer } from "./AudioPlayer";
import { getHlsStreamUrl } from "./audioPlayerCommon";
import { usePlayerState } from "./playerState";
import { VolumeSlider } from "./VolumeSlide";

import classes from "./PlayerBar.module.css";

const HlsAudioPlayer = lazy(() =>
	import("./HlsAudioPlayer").then((module) => ({
		default: module.HlsAudioPlayer,
	})),
);

export function PlayerBar() {
	const { channel, isPlaying, setIsPlaying } = usePlayerState();

	const [volume, setVolume] = createSignal(100);

	const isTrulyPlaying = createMemo(() => {
		return channel() !== undefined && isPlaying();
	});

	const statusText = createMemo(() => {
		const state = channel();

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

		if (state.listenerCount) {
			parts.push(`${state.listenerCount} kuuntelee`);
		}

		return parts.join(" | ");
	});

	const isHlsChannel = createMemo(() => {
		const state = channel();

		if (!state) {
			return false;
		}

		return getHlsStreamUrl(state.radio) !== undefined;
	});

	return (
		<Show when={channel()}>
			{(state) => {
				const nowPlaying = () => state().currentProgram;
				return (
					<>
						<Switch>
							<Match when={isHlsChannel()}>
								<Suspense fallback={null}>
									<HlsAudioPlayer
										radio={() => state().radio}
										isPlaying={isTrulyPlaying}
										volume={volume}
										nowPlaying={() => state().currentProgram}
										setIsPlaying={setIsPlaying}
									/>
								</Suspense>
							</Match>
							<Match when={true}>
								<AudioPlayer
									radio={() => state().radio}
									isPlaying={isTrulyPlaying}
									volume={volume}
									nowPlaying={() => state().currentProgram}
									setIsPlaying={setIsPlaying}
								/>
							</Match>
						</Switch>

						<section
							class={classes.playerBar}
							aria-label="Mediasoitin"
							style={brandColorVariablesStyle(state().radio.brand)}
						>
							<span>{statusText()}</span>
							<div class={classes.controlsRow}>
								<PlayButton
									isPlaying={isTrulyPlaying}
									onClick={() => setIsPlaying((playing: boolean) => !playing)}
									radioStatus={() => state().radioStatus}
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
