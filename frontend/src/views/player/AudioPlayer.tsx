import { throttle } from "@solid-primitives/scheduled";
import { type Accessor, createEffect, createMemo, onMount, Index, onCleanup } from "solid-js";

import type { Song, Program, Radio } from "../../types";
import {
	loadFreshStream,
	seekToLive,
	useMediaSessionIntegration,
	useShouldAvoidFlac,
	useSyncPlaybackState,
	useSyncVolume,
} from "./audioPlayerCommon";

export interface AudioPlayerProps {
	radio: Accessor<Radio>;
	nowPlaying: Accessor<Program | undefined>;
	currentSong: Accessor<Song | undefined>;
	isPlaying: Accessor<boolean>;
	setIsPlaying: (isPlaying: boolean) => void;
	volume: Accessor<number>;
}

export function AudioPlayer(props: AudioPlayerProps) {
	let audioRef: HTMLAudioElement | null = null;

	const handleStall = throttle(() => loadFreshStream(audioRef!), 1000);

	onMount(() => {
		audioRef!.addEventListener("playing", handleStall.clear);
		audioRef!.addEventListener("stalled", handleStall);
		onCleanup(() => {
			audioRef!.removeEventListener("playing", handleStall.clear);
			audioRef!.removeEventListener("stalled", handleStall);
		});
	});

	const radioId = createMemo(() => {
		return props.radio().id;
	});
	const shouldAvoidFlac = useShouldAvoidFlac();

	const streams = createMemo(() => {
		const radioStreams = props.radio().streams ?? [];

		if (!shouldAvoidFlac()) {
			return radioStreams;
		}

		return radioStreams.filter((stream) => stream.mime_type !== "audio/flac");
	});

	// If the channel changes, force a fresh connection to avoid stale buffered audio
	createEffect(() => {
		radioId();

		if (!audioRef) {
			return;
		}

		if (!audioRef.paused) {
			loadFreshStream(audioRef);
			audioRef.play().catch((error) => {
				// If AbortError, ignore it
				if (error.name !== "AbortError") {
					console.error("Error playing audio:", error);
				}
			});
		}
	});

	createEffect((wasAvoidingFlac) => {
		const isAvoidingFlac = shouldAvoidFlac();

		streams();

		if (!audioRef) {
			return isAvoidingFlac;
		}

		const switchedToRestrictedNetwork = !wasAvoidingFlac && isAvoidingFlac;

		if (switchedToRestrictedNetwork && !audioRef.paused) {
			loadFreshStream(audioRef);
			audioRef.play().catch((error) => {
				// If AbortError, ignore it
				if (error.name !== "AbortError") {
					console.error("Error playing audio:", error);
				}
			});
		}

		return isAvoidingFlac;
	}, shouldAvoidFlac());

	useSyncPlaybackState(
		() => audioRef,
		() => props.isPlaying(),
		() => {
			if (audioRef) {
				seekToLive(audioRef);
			}
		},
	);
	useMediaSessionIntegration(props);
	useSyncVolume(
		() => audioRef,
		() => props.volume(),
	);

	return (
		<audio
			hidden
			preload="none"
			autoplay={props.isPlaying()}
			ref={(element) => {
				audioRef = element;
			}}
		>
			<Index each={streams()}>
				{(stream) => <source src={stream().url} type={stream().mime_type} />}
			</Index>
		</audio>
	);
}
