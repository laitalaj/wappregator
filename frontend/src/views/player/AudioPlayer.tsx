import {
	type Accessor,
	createEffect,
	createMemo,
	createSignal,
	onMount,
	Index,
	onCleanup,
	untrack,
} from "solid-js";

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

const INITIAL_STALL_RECOVER_DELAY = 1000;
const MAX_STALL_RECOVER_DELAY = 16000;

export function AudioPlayer(props: AudioPlayerProps) {
	let audioRef: HTMLAudioElement | null = null;
	let [stallTimeout, setStallTimeout] = createSignal<number | undefined>(undefined);
	let [stallRecoverDelay, setStallRecoverDelay] = createSignal(INITIAL_STALL_RECOVER_DELAY);

	const handleStall = () => {
		if (stallTimeout()) return;
		setStallTimeout(
			// eslint-disable-next-line solid/reactivity -- no need for this to be reactive, it's triggered by event listeners / itself
			window.setTimeout(() => {
				if (!props.isPlaying()) {
					clearStalled();
					return;
				}
				loadFreshStream(audioRef!);
				setStallRecoverDelay((prev) => Math.min(prev * 2, MAX_STALL_RECOVER_DELAY));
				setStallTimeout(undefined);
				handleStall();
			}, stallRecoverDelay()),
		);
	};

	const clearStalled = () => {
		clearTimeout(stallTimeout());
		setStallTimeout(undefined);
		setStallRecoverDelay(INITIAL_STALL_RECOVER_DELAY);
	};

	createEffect(() => {
		// Depend on some signals without using them...
		radioId();
		props.isPlaying();
		// ...and then do what we actually want to do when those change without depending on any of our action's signals:
		untrack(clearStalled);
	});

	onMount(() => {
		audioRef!.addEventListener("playing", clearStalled);
		audioRef!.addEventListener("stalled", handleStall);
		onCleanup(() => {
			audioRef!.removeEventListener("playing", clearStalled);
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
