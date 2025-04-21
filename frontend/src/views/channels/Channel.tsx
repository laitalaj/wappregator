import { type Accessor, type Setter, Show, createMemo } from "solid-js";
import type { NowPlaying, Program, ProgramInfo, Radio } from "../../types";
import { PlayButton } from "../common/PlayButton";
import { brandColorVariablesStyle } from "../common/brandUtils";
import classes from "./Channel.module.css";
import { MaybeProgram } from "./Program";

interface Props {
	station: Accessor<NowPlaying>;
	isPlaying: Accessor<boolean>;
	setIsPlaying: Setter<boolean>;
	isCurrentChannel: Accessor<boolean>;
	setSelectedChannelId: (id: string) => void;
	setSelectedProgram: Setter<ProgramInfo | null>;
}

const toProgramInfo = (
	program: Program | undefined,
	radio: Radio,
): ProgramInfo | undefined => {
	if (!program) {
		return undefined;
	}
	return {
		program: program,
		radio: radio,
	};
};

export function Channel(props: Props) {
	const radio = () => props.station().radio;
	const nowPlaying = createMemo(() =>
		toProgramInfo(props.station().now_playing, radio()),
	);
	const upNext = createMemo(() =>
		toProgramInfo(props.station().up_next, radio()),
	);
	const canPlay = () => radio().streams.length > 0;

	return (
		<div
			class={classes.channel}
			data-type={radio().id}
			style={brandColorVariablesStyle(radio().brand)}
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
				<MaybeProgram
					programInfo={nowPlaying}
					playingNow={true}
					setSelectedProgram={props.setSelectedProgram}
				/>
				<MaybeProgram
					programInfo={upNext}
					playingNow={false}
					setSelectedProgram={props.setSelectedProgram}
				/>
			</div>
		</div>
	);
}
