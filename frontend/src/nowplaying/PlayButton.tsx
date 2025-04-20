import {
	IconPlayerPauseFilled,
	IconPlayerPlayFilled,
} from "@tabler/icons-solidjs";
import { Dynamic } from "solid-js/web";
import commonClasses from "../common.module.css";
import classes from "./PlayButton.module.css";

interface Props {
	onClick?: () => void;
	isPlaying: boolean;
}

export function PlayButton(props: Props) {
	const iconType = () =>
		props.isPlaying ? IconPlayerPauseFilled : IconPlayerPlayFilled;

	return (
		<button
			classList={{
				[classes.playButton]: true,
				[commonClasses.buttonHover]: true,
			}}
			type="button"
			onClick={props.onClick}
		>
			<Dynamic component={iconType()} color="currentcolor" />
		</button>
	);
}
