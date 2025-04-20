import { type Accessor, Index, createEffect, createMemo } from "solid-js";
import type { Radio } from "../types";

interface Props {
	radio: Accessor<Radio>;
	isPlaying: Accessor<boolean>;
}

export function AudioPlayer(props: Props) {
	let audioRef: HTMLAudioElement | null = null;

	createEffect(async () => {
		if (!audioRef) {
			return;
		}

		if (props.isPlaying()) {
			// If the element is paused but we should be playing, we need to load the stream again
			// (to catch up to the current time)
			if (audioRef.paused) {
				audioRef.load();
			}

			await audioRef.play().catch((error) => {
				// If AbortError, ignore it
				if (error.name !== "AbortError") {
					console.error("Error playing audio:", error);
				}
			});
		} else {
			audioRef.pause();
		}
	});

	const radioId = createMemo(() => {
		return props.radio().id;
	});

	// If the stream changes, we need to load the new stream
	createEffect(async () => {
		// When channel changes and we're playing, we need to load the new stream
		const id = radioId();

		if (!audioRef) {
			return;
		}

		if (!audioRef.paused) {
			audioRef.load();
			await audioRef.play().catch((error) => {
				// If AbortError, ignore it
				if (error.name !== "AbortError") {
					console.error("Error playing audio:", error);
				}
			});
		}
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
