import { type Accessor, createEffect } from "solid-js";
import type { Radio } from "../../types";
import type { AudioPlayerProps } from "./AudioPlayer";

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

		navigator.mediaSession.playbackState = props.isPlaying()
			? "playing"
			: "paused";
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

export function seekToLive(audioElement: HTMLAudioElement) {
	if (audioElement.seekable.length > 0) {
		const seekableEnd = audioElement.seekable.end(
			audioElement.seekable.length - 1,
		);

		if (seekableEnd > 0 && Number.isFinite(seekableEnd)) {
			audioElement.currentTime = seekableEnd;
		} else {
			// Force reload
			audioElement.load();
		}
	}
}

export function useSyncPlaybackState(
	getAudioElement: Accessor<HTMLAudioElement | null>,
	isPlaying: Accessor<boolean>,
	seekToLiveAfterPause: boolean,
) {
	// If playback state changes, sync it with the audio element
	createEffect(() => {
		const isPlayingState = isPlaying();
		const element = getAudioElement();

		if (!element) {
			return;
		}

		if (isPlayingState) {
			// If we were paused, try to seek to current live position
			if (element.paused && seekToLiveAfterPause) {
				seekToLive(element);
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

export function getHlsStreamUrl(radio: Radio): string | undefined {
	return radio.streams.find(
		(stream) => stream.mime_type === "application/x-mpegURL",
	)?.url;
}
