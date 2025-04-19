import { type Component, Suspense, createResource, onCleanup } from "solid-js";
import { NowPlayingTable } from "./nowplaying/NowPlayingTable";
import type { NowPlaying } from "./types";
import classes from "./App.module.css";

interface ImportMetaEnv {
	readonly VITE_API_URL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

const fetchNowPlaying = async (): Promise<NowPlaying[]> => {
	const response = await fetch(`${import.meta.env.VITE_API_URL}/now_playing`);
	return response.json();
};

const App: Component = () => {
	const [nowPlaying, { refetch }] = createResource(fetchNowPlaying, {});

	const interval = setInterval(() => {
		refetch();
	}, 5000);
	onCleanup(() => clearInterval(interval));

	return (
		<div class={classes.app}>
			<header>
				<h1>Wappregator</h1>
				<span>Vapun epävirallinen aggregoija</span>
			</header>
			<main>
				<Suspense fallback={<div>Loading...</div>}>
					<NowPlayingTable stations={nowPlaying.latest} />
				</Suspense>
			</main>
		</div>
	);
};

export default App;
