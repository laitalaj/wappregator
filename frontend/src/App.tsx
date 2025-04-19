import { type Component, Suspense, createResource, onCleanup } from "solid-js";
import { Channels } from "./nowplaying/Channels";
import classes from "./App.module.css";
import { PlayerBar } from "./nowplaying/PlayerBar";

const App: Component = () => {
	return (
		<div class={classes.app}>
			<header>
				<h1>Wappregator</h1>
				<span>Vapun epävirallinen aggregoija</span>
			</header>
			<main>
				<Channels />
				<PlayerBar />
			</main>
		</div>
	);
};

export default App;
