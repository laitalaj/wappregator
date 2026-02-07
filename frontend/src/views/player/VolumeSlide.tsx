import { IconVolume, IconVolume2, IconVolume3 } from "@tabler/icons-solidjs";
import {
	type Accessor,
	createMemo,
	createSignal,
	createUniqueId,
	Show,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import classes from "./PlayerBar.module.css";

interface VolumeSliderProps {
	volume: Accessor<number>;
	setVolume?: (volume: number) => void;
}

export function VolumeSlider(props: VolumeSliderProps) {
	const handleVolumeChange = (e: Event) => {
		const target = e.target as HTMLInputElement;
		const newVolume = Number(target.value);
		props.setVolume?.(newVolume);
	};
	const [showVolume, setShowVolume] = createSignal(false);

	const volumeIcon = createMemo(() => {
		if (props.volume() === 0) {
			return IconVolume3;
		}

		if (props.volume() < 50) {
			return IconVolume2;
		}

		return IconVolume;
	});

	const popupId = createUniqueId();

	return (
		<>
			<button
				class={classes.volumeButton}
				type="button"
				onClick={() => setShowVolume((prev) => !prev)}
				aria-label="Äänenvoimakkuus"
				aria-haspopup={true}
				aria-expanded={showVolume()}
				aria-controls={popupId}
			>
				<Dynamic
					component={volumeIcon()}
					color="currentcolor"
					width={32}
					role="presentation"
				/>
			</button>
			<Show when={showVolume()}>
				<div class={classes.volumeSliderContainer} id={popupId}>
					<input
						type="range"
						min="0"
						max="100"
						class={classes.volumeSlider}
						id="volume"
						value={props.volume()}
						onInput={handleVolumeChange}
						aria-label="Äänenvoimakkuus"
						aria-orientation="vertical"
						aria-valuetext={`${props.volume()} prosenttia`}
					/>
				</div>
			</Show>
		</>
	);
}
