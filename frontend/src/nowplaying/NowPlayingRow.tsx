import { type Component, For, Show } from "solid-js";
import type { NowPlaying, Program } from "../types";

interface Props {
	label: string;
	stations: NowPlaying[];
	getProgram: (station: NowPlaying) => Program | undefined;
}

export const NowPlayingRow: Component<Props> = (props) => {
	return (
		<tr>
			<th>{props.label}</th>
			<For each={props.stations}>
				{(station) => {
					const program = props.getProgram(station);
					return (
						<td>
							<Show when={program} fallback={"-"}>
								{program.title}
								<br />
								<span>
									{new Date(program.start).toLocaleString()} -{" "}
									{new Date(program.end).toLocaleString()}
								</span>
							</Show>
						</td>
					);
				}}
			</For>
		</tr>
	);
};
