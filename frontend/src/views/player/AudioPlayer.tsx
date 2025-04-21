import {
	type Accessor,
	Index,
	createEffect,
	createMemo,
	onMount,
} from "solid-js";
import type { Program, Radio } from "../../types";

interface Props {
	radio: Accessor<Radio>;
	nowPlaying: Accessor<Program | undefined>;
	isPlaying: Accessor<boolean>;
	setIsPlaying: (isPlaying: boolean) => void;
	volume: Accessor<number>;
}

export function AudioPlayer(props: Props) {
	let audioRef: HTMLAudioElement | null = null;

	createEffect(() => {
		if (!audioRef) {
			return;
		}

		if (props.isPlaying()) {
			// If the element is paused but we should be playing, we need to load the stream again
			// (to catch up to the current time)
			if (audioRef.paused) {
				audioRef.load();
			}

			audioRef.play().catch((error) => {
				// If AbortError, ignore it
				if (error.name !== "AbortError") {
					console.error("Error playing audio:", error);
				}
			});
		} else {
			audioRef.pause();
		}
	});

	createEffect(() => {
		if (!audioRef) {
			return;
		}
		audioRef.volume = props.volume() / 100;
	});

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
			audioRef.play().catch((error) => {
				// If AbortError, ignore it
				if (error.name !== "AbortError") {
					console.error("Error playing audio:", error);
				}
			});
		}
	});

	const start = () => props.setIsPlaying(true);
	const pause = () => props.setIsPlaying(false);

	// Media Session API: play/pause
	createEffect(() => {
		// Not supported in e.g. Firefox
		if (!("mediaSession" in navigator)) {
			return;
		}

		navigator.mediaSession.setActionHandler("play", start);
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

	return (
		// biome-ignore lint/a11y/useMediaCaption: wappu
		<audio
			hidden
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
