import { type Component, For } from "solid-js";
import type { NowPlaying } from "../types";

interface Props {
	stations: NowPlaying[];
}

export const NowPlayingHeader: Component<Props> = (props) => {
	return (
		<tr>
			<th />
			<For each={props.stations}>
				{(station) => (
					<th>
						<a href={station.radio.url}>{station.radio.name}</a>
					</th>
				)}
			</For>
		</tr>
	);
};
