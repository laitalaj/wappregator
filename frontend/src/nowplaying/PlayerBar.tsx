import { PlayButton } from "./PlayButton";
import classes from "./PlayerBar.module.css";
import { ProgressBar } from "./ProgressBar";

export function PlayerBar() {
	return (
		<div class={classes.playerBar}>
			<div>
				<span>Keksitty Ohjelma | Rakkauden Wappuradio</span>
			</div>
			<div class={classes.controlsRow}>
				<PlayButton />
				<div class={classes.progressBarContainer}>
					<span>17:00</span>
					<ProgressBar progress={() => 0.5} transitionTimeMs={1000} />
					<span>19:00</span>
				</div>
			</div>
		</div>
	);
}
