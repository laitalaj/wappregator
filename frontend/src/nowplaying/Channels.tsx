import { type Accessor, Index, type Setter, Suspense } from "solid-js";
import type { NowPlaying } from "../types";
import { Channel } from "./Channel";
import classes from "./Channels.module.css";

interface Props {
	nowPlaying: Accessor<NowPlaying[]>;
	isPlaying: Accessor<boolean>;
	setIsPlaying: Setter<boolean>;
	selectedChannelId: Accessor<string | null>;
	setSelectedChannelId: (id: string | null) => void;
}

export function Channels(props: Props) {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<div class={classes.channels}>
				<Index each={props.nowPlaying()}>
					{(station) => {
						const isCurrentChannel = () => {
							return props.selectedChannelId() === station().radio.id;
						};

						return (
							<Channel
								setIsPlaying={props.setIsPlaying}
								isCurrentChannel={isCurrentChannel}
								isPlaying={props.isPlaying}
								station={station}
								setSelectedChannelId={props.setSelectedChannelId}
							/>
						);
					}}
				</Index>
			</div>
		</Suspense>
	);
}
