import type { Accessor } from "solid-js";
import type { NowPlaying } from "../types";
import classes from "./Channel.module.css";
import { PlayButton } from "./PlayButton";
import { MaybeProgram } from "./Program";

interface Props {
	station: Accessor<NowPlaying>;
}

export function Channel(props: Props) {
	const radio = () => props.station().radio;
	const nowPlaying = () => props.station().now_playing;
	const upNext = () => props.station().up_next;

	return (
		<div class={classes.channel} data-type={radio().id}>
			<div class={classes.channelName}>
				<h2>{radio().name}</h2>
				<PlayButton />
			</div>

			<div>
				<a href={radio().url} class={classes.listenButton}>
					WWW
				</a>
			</div>

			<div class={classes.programs}>
				<MaybeProgram program={nowPlaying} playingNow={true} />
				<MaybeProgram program={upNext} playingNow={false} />
			</div>
		</div>
	);
}
