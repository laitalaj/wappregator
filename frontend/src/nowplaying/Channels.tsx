import { createResource, Index, onCleanup, Suspense } from "solid-js";
import type { NowPlaying } from "../types";
import classes from "./Channels.module.css";
import { Channel } from "./Channel";

export function Channels() {
	const [nowPlaying, { refetch }] = createResource(fetchNowPlaying, {});

	const interval = setInterval(() => {
		refetch();
	}, 10_000);
	onCleanup(() => clearInterval(interval));

	return (
		<Suspense fallback={<div>Loading...</div>}>
			<div class={classes.channels}>
				<Index each={nowPlaying.latest}>
					{(station) => <Channel station={station} />}
				</Index>
			</div>
		</Suspense>
	);
}

async function fetchNowPlaying(): Promise<NowPlaying[]> {
	const response = await fetch(`${import.meta.env.VITE_API_URL}/now_playing`);
	return response.json();
}
