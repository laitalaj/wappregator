import type { Accessor } from "solid-js";
import classes from "./ProgressBar.module.css";

interface Props {
	progress: Accessor<number>;
	transitionTimeMs?: number;
}

export function ProgressBar(props: Props) {
	return (
		<div
			role="progressbar"
			aria-valuenow={props.progress() * 100}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-label="Ohjelman eteneminen"
			aria-valuetext={`${Math.round(props.progress() * 100)}%`}
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
