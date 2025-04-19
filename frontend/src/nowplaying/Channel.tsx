import { type Accessor, createSignal, onCleanup, Show } from "solid-js";
import type { NowPlaying } from "../types";
import classes from "./Channel.module.css";
import { Program } from "./Program";

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
				<h2>
					<a href={radio().url}>{radio().name}</a>
				</h2>
			</div>

			<Show when={nowPlaying()}>
				<Program program={nowPlaying} playingNow={true} />
			</Show>
			<Show when={upNext()}>
				<Program program={upNext} playingNow={false} />
			</Show>
		</div>
	);
}
