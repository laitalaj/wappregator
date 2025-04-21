import { type Accessor, type Setter, Show } from "solid-js";
import type { NowPlaying } from "../../types";
import { PlayButton } from "../common/PlayButton";
import classes from "./Channel.module.css";
import { MaybeProgram } from "./Program";

interface Props {
	station: Accessor<NowPlaying>;
	isPlaying: Accessor<boolean>;
	setIsPlaying: Setter<boolean>;
	isCurrentChannel: Accessor<boolean>;
	setSelectedChannelId: (id: string) => void;
}

export function Channel(props: Props) {
	const radio = () => props.station().radio;
	const nowPlaying = () => props.station().now_playing;
	const upNext = () => props.station().up_next;
	const canPlay = () => radio().streams.length > 0;

	return (
		<div
			class={classes.channel}
			data-type={radio().id}
			style={{
				"--bg-color": radio().brand.background_color,
				"--text-color": radio().brand.text_color,
			}}
		>
			<div class={classes.channelName}>
				<h2>{radio().name}</h2>
				{canPlay() && (
					<PlayButton
						onClick={() => {
							if (!props.isCurrentChannel()) {
								props.setSelectedChannelId(radio().id);

								if (!props.isPlaying()) {
									props.setIsPlaying(true);
								}
							} else {
								props.setIsPlaying((current) => !current);
							}
						}}
						isPlaying={() => props.isCurrentChannel() && props.isPlaying()}
					/>
				)}
			</div>

			<div>
				<Show when={radio().frequency_mhz}>
					{radio().frequency_mhz?.toFixed(1)} MHz @{" "}
				</Show>
				{`${radio().location} / `}
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
