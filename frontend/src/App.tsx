import { type Component, Suspense, createResource, onCleanup } from "solid-js";
import { Channels } from "./nowplaying/Channels";
import classes from "./App.module.css";

const App: Component = () => {
	return (
		<div class={classes.app}>
			<header>
				<h1>Wappregator</h1>
				<span>Vapun epävirallinen aggregoija</span>
			</header>
			<main>
				<Channels />
			</main>
		</div>
	);
};

export default App;
