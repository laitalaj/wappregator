import type { Accessor } from "solid-js";
import classes from "./ProgressBar.module.css";

interface Props {
	progress: Accessor<number>;
	transitionTimeMs?: number;
}

export function ProgressBar(props: Props) {
	return (
		<div
			class={classes.progressBar}
			style={{
				"--progress": `${props.progress() * 100}%`,
				"--transition-time-ms": `${props.transitionTimeMs ?? 0}ms`,
			}}
		>
			<div class={classes.progressBarFill} />
		</div>
	);
}
