import { IconPlayerPlayFilled } from "@tabler/icons-solidjs";
import classes from "./PlayButton.module.css";

export function PlayButton() {
	return (
		<button class={classes.playButton} type="button">
			<IconPlayerPlayFilled color="currentcolor" />
		</button>
	);
}
