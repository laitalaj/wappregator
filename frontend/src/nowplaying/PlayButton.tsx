import {
	IconPlayerPauseFilled,
	IconPlayerPlayFilled,
} from "@tabler/icons-solidjs";
import { Dynamic } from "solid-js/web";
import classes from "./PlayButton.module.css";

interface Props {
	onClick?: () => void;
	isPlaying: boolean;
}

export function PlayButton(props: Props) {
	const iconType = () =>
		props.isPlaying ? IconPlayerPauseFilled : IconPlayerPlayFilled;

	return (
		<button class={classes.playButton} type="button" onClick={props.onClick}>
			<Dynamic component={iconType()} color="currentcolor" />
		</button>
	);
}
