import { type Component, createMemo, createSignal } from "solid-js";
import classes from "./App.module.css";
import { Channels } from "./channels/Channels";
import { PlayerBar } from "./player/PlayerBar";
import type { RadioState } from "../radio";
import { getNowPlayingState, getRadiosState, getScheduleState } from "../state";

const App: Component = () => {
	const radios = getRadiosState();
	const schedule = getScheduleState();
	const nowPlaying = getNowPlayingState(schedule, radios);

	const [selectedChannelId, setSelectedChannelId] = createSignal<string | null>(
		null,
	);
	const [isPlaying, setIsPlaying] = createSignal(false);

	const radioState = createMemo((): RadioState => {
		if (selectedChannelId() === null) {
			return { type: "channelNotSelected" };
		}

		const radio = nowPlaying().find(
			(station) => station.radio.id === selectedChannelId(),
		);

		if (!radio) {
			// TODO: Auto-deselect channel in this case?
			// Probably can't be done inside memo, needs an effect
			console.warn(
				`Selected channel ID ${selectedChannelId()} not found in nowPlaying data`,
			);
			return { type: "channelNotSelected" };
		}

		return {
			type: "channelSelected",
			radio: radio.radio,
			nowPlaying: radio.now_playing,
			isPlaying: isPlaying(),
		};
	});

	return (
		<div class={classes.app}>
			<header>
				<h1>Wappregator</h1>
				<span>Vapun epävirallinen aggregoija</span>
			</header>
			<main>
				<Channels
					nowPlaying={nowPlaying}
					isPlaying={isPlaying}
					setIsPlaying={setIsPlaying}
					selectedChannelId={selectedChannelId}
					setSelectedChannelId={setSelectedChannelId}
				/>
				<PlayerBar radioState={radioState} setIsPlaying={setIsPlaying} />
			</main>
		</div>
	);
};

export default App;
