import Hls from "hls.js";
import { createEffect, createMemo, onMount } from "solid-js";
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

		hls = new Hls();
		hls.attachMedia(audioRef);
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
	);
	useMediaSessionIntegration(props);
	useSyncVolume(
		() => audioRef,
		() => props.volume(),
	);

	return (
		// biome-ignore lint/a11y/useMediaCaption: <explanation>
		<audio
			hidden
			ref={(el) => {
				audioRef = el;
			}}
		/>
	);
}
