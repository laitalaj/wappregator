import { type Accessor, Index, type Resource, Suspense } from "solid-js";
import type { NowPlaying } from "../types";
import { Channel } from "./Channel";
import classes from "./Channels.module.css";

interface Props {
	nowPlaying: Accessor<NowPlaying[]>;
	isPlaying: Accessor<boolean>;
	selectedChannelId: Accessor<string | null>;
	setSelectedChannelId: (id: string) => void;
}

export function Channels(props: Props) {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<div class={classes.channels}>
				<Index each={props.nowPlaying()}>
					{(station) => (
						<Channel
							isPlaying={() =>
								props.isPlaying() &&
								station().radio.id === props.selectedChannelId()
							}
							station={station}
							setSelectedChannelId={props.setSelectedChannelId}
						/>
					)}
				</Index>
			</div>
		</Suspense>
	);
}
