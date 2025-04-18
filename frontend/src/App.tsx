import {
	type Component,
	Match,
	Suspense,
	Switch,
	createResource,
} from "solid-js";
import { NowPlayingTable } from "./nowplaying/NowPlayingTable";
import type { NowPlaying } from "./types";

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
	const [nowPlaying] = createResource(fetchNowPlaying);
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<Switch>
				<Match when={nowPlaying.error}>
					<div>Error: {nowPlaying.error.message}</div>
				</Match>
				<Match when={nowPlaying()}>
					<NowPlayingTable stations={nowPlaying()} />
				</Match>
			</Switch>
		</Suspense>
	);
};

export default App;
