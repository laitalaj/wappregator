import { type Accessor, Index, createEffect, createMemo } from "solid-js";
import type { Program, Radio } from "../../types";
import {
	seekToLive,
	useMediaSessionIntegration,
	useSyncPlaybackState,
	useSyncVolume,
} from "./audioPlayerCommon";

export interface AudioPlayerProps {
	radio: Accessor<Radio>;
	nowPlaying: Accessor<Program | undefined>;
	isPlaying: Accessor<boolean>;
	setIsPlaying: (isPlaying: boolean) => void;
	volume: Accessor<number>;
}

export function AudioPlayer(props: AudioPlayerProps) {
	let audioRef: HTMLAudioElement | null = null;

	const radioId = createMemo(() => {
		return props.radio().id;
	});

	// If the stream changes, we need to load the new stream
	createEffect(() => {
		// When channel changes and we're playing, we need to load the new stream
		radioId();

		if (!audioRef) {
			return;
		}

		if (!audioRef.paused) {
			audioRef.load();
			seekToLive(audioRef);
			audioRef.play().catch((error) => {
				// If AbortError, ignore it
				if (error.name !== "AbortError") {
					console.error("Error playing audio:", error);
				}
			});
		}
	});

	useSyncPlaybackState(
		() => audioRef,
		() => props.isPlaying(),
		true,
	);
	useMediaSessionIntegration(props);
	useSyncVolume(
		() => audioRef,
		() => props.volume(),
	);

	return (
		// biome-ignore lint/a11y/useMediaCaption: wappu
		<audio
			hidden
			preload="none"
			autoplay={props.isPlaying()}
			ref={(element) => {
				audioRef = element;
			}}
		>
			<Index each={props.radio().streams ?? []}>
				{(stream) => <source src={stream().url} type={stream().mime_type} />}
			</Index>
		</audio>
	);
}
