import {
	IconPlayerPauseFilled,
	IconPlayerPlayFilled,
} from "@tabler/icons-solidjs";
import type { Accessor } from "solid-js";
import { Dynamic } from "solid-js/web";
import commonClasses from "../common/common.module.css";
import classes from "./PlayButton.module.css";

interface Props {
	onClick?: () => void;
	isPlaying: Accessor<boolean>;
}

export function PlayButton(props: Props) {
	const iconType = () =>
		props.isPlaying() ? IconPlayerPauseFilled : IconPlayerPlayFilled;

	return (
		<button
			classList={{
				[classes.playButton]: true,
				[commonClasses.buttonHover]: true,
			}}
			type="button"
			onClick={() => props.onClick?.()}
			title={props.isPlaying() ? "Pysäytä" : "Toista"}
			aria-pressed={props.isPlaying()}
		>
			<Dynamic
				component={iconType()}
				color="currentcolor"
				role="presentation"
			/>
		</button>
	);
}
