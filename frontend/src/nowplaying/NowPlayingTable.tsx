import { createSignal, For, onCleanup, Show } from "solid-js";
import type { NowPlaying } from "../types";
import classes from "./NowPlayingTable.module.css";

interface Props {
	stations: NowPlaying[];
}

export function NowPlayingTable(props: Props) {
	return (
		<div class={classes.tableContainer}>
			<div class={classes.channels}>
				<For each={props.stations}>
					{(station) => {
						const [currentProgramCompletion, setCurrentProgramCompletion] =
							createSignal(0);

						const updateCompletion = setTimeout(() => {
							if (!station.now_playing) {
								return 0;
							}

							const now = new Date();
							const start = new Date(station.now_playing.start);
							const end = new Date(station.now_playing.end);
							const totalDuration = end.getTime() - start.getTime();
							const elapsed = now.getTime() - start.getTime();

							const completion = Math.min(
								Math.max(0, elapsed / totalDuration),
								1,
							);
							setCurrentProgramCompletion(completion);
						}, 1000);

						onCleanup(() => clearTimeout(updateCompletion));

						return (
							<div class={classes.channel} data-type={station.radio.id}>
								<div class={classes.channelName}>
									<h3>
										<a href={station.radio.url}>{station.radio.name}</a>
									</h3>
								</div>
								<div
									class={classes.nowPlaying}
									style={{ "--completion": currentProgramCompletion() }}
								>
									<Show when={station.now_playing}>
										<h4>
											{station.now_playing.title}
											<br />
											<span>
												{new Date(station.now_playing.start).toLocaleString()} -{" "}
												{new Date(station.now_playing.end).toLocaleString()}
											</span>
										</h4>
									</Show>
								</div>
								<div class={classes.upNext}>
									<Show when={station.up_next}>
										<h4>
											{station.up_next.title}
											<br />
											<span>
												{new Date(station.up_next.start).toLocaleString()} -{" "}
												{new Date(station.up_next.end).toLocaleString()}
											</span>
										</h4>
									</Show>
								</div>
							</div>
						);
					}}
				</For>
			</div>
		</div>
	);
}
