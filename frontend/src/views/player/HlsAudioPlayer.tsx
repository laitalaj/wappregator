import Hls from "hls.js";
import { createEffect, createMemo, onCleanup, onMount } from "solid-js";
import type { AudioPlayerProps } from "./AudioPlayer";
import {
	getHlsStreamUrl,
	useMediaSessionIntegration,
	useSyncPlaybackState,
	useSyncVolume,
} from "./audioPlayerCommon";

export function HlsAudioPlayer(props: AudioPlayerProps) {
	let audioRef: HTMLAudioElement | null = null;
	let hls: Hls | null = null;

	// Create a new Hls instance and attach it to the audio element
	onMount(() => {
		if (!Hls.isSupported()) {
			console.error("HLS is not supported in this browser");
			return;
		}

		if (!audioRef) {
			console.error("Audio element is not available");
			return;
		}

		hls = new Hls({
			maxBufferLength: 20,
			maxMaxBufferLength: 60,
			liveSyncDuration: 30,
			liveDurationInfinity: true,
		});
		hls.attachMedia(audioRef);
		onCleanup(() => {
			hls?.detachMedia();
			hls?.destroy();
		});
	});

	const hlsStreamUrl = createMemo(() => getHlsStreamUrl(props.radio()));

	// Update the HLS stream URL when the channel changes
	createEffect(() => {
		const streamUrl = hlsStreamUrl();

		if (!hls || !audioRef || !streamUrl) {
			return;
		}

		hls.loadSource(streamUrl);
		hls.on(Hls.Events.MANIFEST_PARSED, () => {
			audioRef?.play();
		});
	});

	useSyncPlaybackState(
		() => audioRef,
		() => props.isPlaying(),
		false,
	);
	useMediaSessionIntegration(props);
	useSyncVolume(
		() => audioRef,
		() => props.volume(),
	);

	return (
		// biome-ignore lint/a11y/useMediaCaption: hidden audio element for HLS streaming, no captions needed
		<audio
			hidden
			preload="none"
			ref={(el) => {
				audioRef = el;
			}}
		/>
	);
}
