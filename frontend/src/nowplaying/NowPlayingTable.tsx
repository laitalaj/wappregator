import type { Component } from "solid-js";
import type { NowPlaying } from "../types";
import { NowPlayingHeader } from "./NowPlayingHeader";
import { NowPlayingRow } from "./NowPlayingRow";

interface Props {
	stations: NowPlaying[];
}

export const NowPlayingTable: Component<Props> = (props) => {
	return (
		<table>
			<NowPlayingHeader stations={props.stations} />
			<NowPlayingRow
				label="Now Playing"
				stations={props.stations}
				getProgram={(station) => station.now_playing}
			/>
			<NowPlayingRow
				label="Up Next"
				stations={props.stations}
				getProgram={(station) => station.up_next}
			/>
		</table>
	);
};
