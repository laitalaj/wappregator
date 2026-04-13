import { type Component, Suspense, createMemo } from "solid-js";

import { usePlayerState } from "../player/playerState";
import { NowPlayingTable } from "./nowplaying/NowPlayingTable";

import classes from "./Old.module.css";

const Old: Component = () => {
	const { channels } = usePlayerState();
	const nowPlaying = createMemo(() =>
		channels().map((channel) => ({
			radio: channel.radio,
			now_playing: channel.currentProgram,
			up_next: channel.nextPrograms[0],
		})),
	);

	return (
		<div class={classes.oldContainer}>
			<Suspense fallback={<div>Loading...</div>}>
				<NowPlayingTable stations={nowPlaying()} />
			</Suspense>
		</div>
	);
};

export default Old;
