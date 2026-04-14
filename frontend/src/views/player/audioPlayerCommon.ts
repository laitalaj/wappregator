import { type Accessor, createEffect, createSignal, onCleanup, onMount } from "solid-js";

import type { Radio } from "../../types";
import type { AudioPlayerProps } from "./AudioPlayer";

interface NetworkInformationLike extends EventTarget {
	readonly saveData?: boolean;
	readonly type?: string;
}

interface NavigatorWithConnection extends Navigator {
	readonly connection?: NetworkInformationLike;
	readonly mozConnection?: NetworkInformationLike;
	readonly webkitConnection?: NetworkInformationLike;
}

function getNetworkConnection(): NetworkInformationLike | undefined {
	const navigatorWithConnection = navigator as NavigatorWithConnection;

	return (
		navigatorWithConnection.connection ??
		navigatorWithConnection.mozConnection ??
		navigatorWithConnection.webkitConnection
	);
}

function getShouldAvoidFlac(connection: NetworkInformationLike): boolean {
	if (connection.saveData === true) {
		return true;
	}

	return connection.type === "cellular";
}

export function useShouldAvoidFlac(): Accessor<boolean> {
	const [shouldAvoidFlac, setShouldAvoidFlac] = createSignal(true);

	onMount(() => {
		const connection = getNetworkConnection();

		if (!connection) {
			setShouldAvoidFlac(true);
			return;
		}

		const syncNetworkState = () => {
			setShouldAvoidFlac(getShouldAvoidFlac(connection));
		};

		syncNetworkState();
		connection.addEventListener("change", syncNetworkState);

		onCleanup(() => {
			connection.removeEventListener("change", syncNetworkState);
		});
	});

	return shouldAvoidFlac;
}

export function useMediaSessionIntegration(props: AudioPlayerProps) {
	const play = () => props.setIsPlaying(true);
	const pause = () => props.setIsPlaying(false);

	// Media Session API: play/pause
	createEffect(() => {
		if (!("mediaSession" in navigator)) {
			return;
		}

		navigator.mediaSession.setActionHandler("play", play);
		navigator.mediaSession.setActionHandler("pause", pause);

		navigator.mediaSession.playbackState = props.isPlaying() ? "playing" : "paused";
	});

	// Media Session API: metadata
	createEffect(() => {
		const nowPlaying = props.nowPlaying();
		const radio = props.radio();

		if (!("mediaSession" in navigator)) {
			return;
		}

		const mediaData = nowPlaying
			? {
					title: nowPlaying.title,
					artist: radio.name,
				}
			: {
					title: radio.name,
				};

		const wappregatorArtwork = {
			src: "https://wappregat.org/appicon.png",
			sizes: "256x256",
			type: "image/png",
		};

		const artwork = nowPlaying?.photo
			? [
					{
						src: nowPlaying.photo,
					},
				]
			: [wappregatorArtwork];

		navigator.mediaSession.metadata = new MediaMetadata({
			...mediaData,
			artwork,
		});
	});
}

const MAX_LIVE_DELAY_SECONDS = 10;

/**
 * Force a fresh connection by cache-busting source element URLs and reloading.
 * This ensures the browser doesn't serve stale buffered audio when switching
 * channels or resuming after a pause.
 */
export function loadFreshStream(audioElement: HTMLAudioElement) {
	const now = Date.now().toString();
	for (const source of audioElement.querySelectorAll("source")) {
		const url = new URL(source.src);
		url.searchParams.set("_t", now);
		source.src = url.toString();
	}
	audioElement.load();
}

export function seekToLive(audioElement: HTMLAudioElement) {
	if (audioElement.seekable.length > 0) {
		const seekableEnd = audioElement.seekable.end(audioElement.seekable.length - 1);

		if (seekableEnd > 0 && Number.isFinite(seekableEnd)) {
			if (seekableEnd - audioElement.currentTime <= MAX_LIVE_DELAY_SECONDS) {
				audioElement.currentTime = seekableEnd;
				return;
			}
		}
	}
	// No seekable ranges or too far behind live — force a fresh connection
	loadFreshStream(audioElement);
}

export function useSyncPlaybackState(
	getAudioElement: Accessor<HTMLAudioElement | null>,
	isPlaying: Accessor<boolean>,
	onResumeFromPause?: () => void,
) {
	// If playback state changes, sync it with the audio element
	createEffect(() => {
		const isPlayingState = isPlaying();
		const element = getAudioElement();

		if (!element) {
			return;
		}

		if (isPlayingState) {
			if (element.paused && onResumeFromPause) {
				onResumeFromPause();
			}

			element.play().catch((error) => {
				// If AbortError, ignore it
				if (error.name !== "AbortError") {
					console.error("Error playing audio:", error);
				}
			});
		} else {
			element.pause();
		}
	});
}

export function useSyncVolume(
	getAudioElement: Accessor<HTMLAudioElement | null>,
	volume: Accessor<number>,
) {
	// Sync volume with the audio element
	createEffect(() => {
		const audioElement = getAudioElement();
		if (!audioElement) {
			return;
		}
		audioElement.volume = volume() / 100;
	});
}

const HLS_MIME_TYPES = new Set(["application/vnd.apple.mpegurl", "application/x-mpegURL"]);

export function getHlsStreamUrl(radio: Radio): string | undefined {
	return radio.streams.find((stream) => stream.mime_type && HLS_MIME_TYPES.has(stream.mime_type))
		?.url;
}
