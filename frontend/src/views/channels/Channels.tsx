import { type Accessor, Index, type Setter, Suspense } from "solid-js";
import type { NowPlaying, ProgramInfo } from "../../types";
import { Channel } from "./Channel";
import classes from "./Channels.module.css";

interface Props {
	nowPlaying: Accessor<NowPlaying[]>;
	isPlaying: Accessor<boolean>;
	setIsPlaying: Setter<boolean>;
	selectedChannelId: Accessor<string | null>;
	setSelectedChannelId: (id: string | null) => void;
	setSelectedProgram: Setter<ProgramInfo | null>;
}

export function Channels(props: Props) {
	return (
		<Suspense fallback={<ChannelsSkeleton />}>
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
								setSelectedProgram={props.setSelectedProgram}
							/>
						);
					}}
				</Index>
			</div>
		</Suspense>
	);
}

function ChannelsSkeleton() {
	return (
		<div class={classes.channels}>
			<Index each={Array.from({ length: 6 })}>
				{() => {
					return (
						<div class={classes.channelSkeleton}>
							<div class={classes.nameSkeleton} />
						</div>
					);
				}}
			</Index>
		</div>
	);
}
