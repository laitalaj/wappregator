import {
	IconPlayerPauseFilled,
	IconPlayerPlayFilled,
	IconPlugOff,
	IconQuestionMark,
	IconZzz,
} from "@tabler/icons-solidjs";
import type { Accessor } from "solid-js";
import { Dynamic } from "solid-js/web";

import { RadioStatus } from "../../types";

import classes from "./PlayButton.module.css";

interface Props {
	onClick?: () => void;
	isPlaying: Accessor<boolean>;
	radioStatus: Accessor<RadioStatus>;
}

export function PlayButton(props: Props) {
	const iconType = () => {
		if (props.isPlaying()) {
			return IconPlayerPauseFilled;
		}

		switch (props.radioStatus()) {
			case RadioStatus.Online:
				return IconPlayerPlayFilled;
			case RadioStatus.Offline:
				return IconZzz;
			case RadioStatus.Broken:
				return IconPlugOff;
			case RadioStatus.Unknown:
				return IconQuestionMark;
		}
	};

	const playText = () => {
		switch (props.radioStatus()) {
			case RadioStatus.Online:
				return "Toista";
			case RadioStatus.Offline:
				return "Ei lähetystä (toista silti)";
			case RadioStatus.Broken:
				return "Radio rikki (toista silti)";
			case RadioStatus.Unknown:
				return "Tila tuntematon (jotain vialla meidän päässä, laitappa viestiä)";
		}
	};

	return (
		<button
			class={classes.playButton}
			type="button"
			onClick={() => props.onClick?.()}
			title={props.isPlaying() ? "Pysäytä" : playText()}
			aria-pressed={props.isPlaying()}
		>
			<Dynamic component={iconType()} color="currentcolor" role="presentation" />
		</button>
	);
}
