import { IconChevronDown, IconChevronUp, IconHeadphones } from "@tabler/icons-solidjs";
import { startOfDay } from "date-fns";
import {
	type Accessor,
	createMemo,
	createSignal,
	Index,
	onMount,
	type Setter,
	Show,
} from "solid-js";

import { WappuState } from "../../state";
import type { ChannelState, Program, ProgramInfo, Radio } from "../../types";
import { brandColorVariablesStyle } from "../common/brandUtils";
import { PlayButton } from "../common/PlayButton";
import { useLayoutState } from "../layoutState";
import { MaybeProgram, PresentationalProgramGroup, ProgramGroup } from "./Program";

import classes from "./Channel.module.css";

interface Props {
	station: Accessor<ChannelState>;
	isPlaying: Accessor<boolean>;
	setIsPlaying: Setter<boolean>;
	isCurrentChannel: Accessor<boolean>;
	setSelectedChannelId: (id: string) => void;
	setSelectedProgram: Setter<ProgramInfo | null>;
}

const toProgramInfo = (program: Program | undefined, radio: Radio): ProgramInfo | undefined => {
	if (!program) {
		return undefined;
	}
	return {
		program: program,
		radio: radio,
	};
};

export function Channel(props: Props) {
	const { wappu } = useLayoutState();

	const [showAllPrograms, setShowAllPrograms] = createSignal(false);

	const [isMobile, setIsMobile] = createSignal(false);
	const MOBILE_BREAKPOINT = 600;

	onMount(() => {
		// Listen to window resize events
		const handleResize = () => {
			setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		};
		handleResize(); // Set initial value

		window.addEventListener("resize", handleResize);

		// Cleanup event listener on component unmount
		return () => {
			window.removeEventListener("resize", handleResize);
		};
	});

	const radio = () => props.station().radio;

	// Randomness needs to be memoized separately
	// as channel states (and by extension the value of radio()) update on a 1-second interval
	// which would cause reshuffling every second if we throw the dice in the location memo directly.
	const luckyNumber = createMemo(Math.random);
	const location = createMemo(() => {
		if (wappu() !== WappuState.Wappu) {
			return radio().location;
		}

		const wappuLocations = radio().wappu_locations;
		if (wappuLocations && wappuLocations.length > 0) {
			return wappuLocations[Math.floor(luckyNumber() * wappuLocations.length)];
		}
		return radio().location;
	});

	const currentProgram = createMemo(() => toProgramInfo(props.station().currentProgram, radio()));
	const nowPlaying = createMemo(() => props.station().currentSong);

	const upNext = createMemo((): ProgramInfo[] => {
		const radioState = radio();
		if (!radioState) {
			return [];
		}

		return props.station().nextPrograms.map((program) => ({ program, radio: radioState }));
	});

	const canPlay = () => radio().streams.length > 0;

	const UPCOMING_MOBILE_LIMIT = 1;
	const UPCOMING_STANDARD_LIMIT = 4;
	const MAX_GROUPS_PER_CHANNEL = 3;

	const maxProgramsToShow = createMemo(() => {
		const isNowMobile = isMobile();
		const showAllProgramsValue = showAllPrograms();
		const maxPrograms =
			isNowMobile && !showAllProgramsValue ? UPCOMING_MOBILE_LIMIT : UPCOMING_STANDARD_LIMIT;
		return maxPrograms;
	});

	const hasMoreProgamsToShowOnMobile = createMemo(() => {
		return upNext().length > UPCOMING_MOBILE_LIMIT;
	});

	const programsByDate = createMemo(() => {
		return chunkProgramsByDate(upNext().slice(0, maxProgramsToShow()));
	});

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
						radioStatus={() => props.station().radioStatus}
					/>
				)}
			</div>

			<div class={classes.channelInfo}>
				<Show when={radio().frequency_mhz}>{radio().frequency_mhz?.toFixed(1)} MHz @ </Show>
				{location()}
				{" / "}
				<a href={radio().url} class={classes.listenButton}>
					WWW
				</a>
			</div>

			<PresentationalProgramGroup
				title={() => (
					<>
						Nyt
						<Show when={props.station().listenerCount}>
							{(count) => (
								<span class={classes.listenerCount}>
									<IconHeadphones size={16} aria-hidden="true" /> {count()}
									<span class={classes.srOnly}>{count() === 1 ? "kuuntelija" : "kuuntelijaa"}</span>
								</span>
							)}
						</Show>
					</>
				)}
			>
				<MaybeProgram
					programInfo={currentProgram}
					playingNow={true}
					setSelectedProgram={props.setSelectedProgram}
					showScheduleLabel
				/>
				<Show when={nowPlaying()}>
					{(song) => {
						const title = createMemo(() => {
							if (radio().current_song_type === "realtime") {
								return "Nyt soi";
							}

							return "Viimeisimpänä soi";
						});

						return (
							<div class={classes.nowPlaying}>
								<h4>{title()}</h4>
								{song().artist ? (
									<span>
										{song().artist} – {song().title}
									</span>
								) : (
									<span>{song().title}</span>
								)}
							</div>
						);
					}}
				</Show>
			</PresentationalProgramGroup>

			<Index each={programsByDate().slice(0, MAX_GROUPS_PER_CHANNEL)}>
				{(chunk) => (
					<ProgramGroup
						date={() => chunk().date}
						programs={() => chunk().programs}
						setSelectedProgram={props.setSelectedProgram}
					/>
				)}
			</Index>

			<Show when={isMobile() && hasMoreProgamsToShowOnMobile()}>
				<button
					type="button"
					class={classes.showMoreButton}
					onClick={() => setShowAllPrograms((prev) => !prev)}
					aria-pressed={showAllPrograms()}
				>
					{showAllPrograms() ? (
						<>
							Näytä vähemmän <IconChevronUp />
						</>
					) : (
						<>
							Näytä lisää <IconChevronDown />
						</>
					)}
				</button>
			</Show>
		</div>
	);
}

interface ProgramsChunk {
	date: Date;
	programs: ProgramInfo[];
}

function chunkProgramsByDate(programInfos: ProgramInfo[]): ProgramsChunk[] {
	const programsByDate: ProgramsChunk[] = [];
	let currentDate: Date | null = null;

	for (const programInfo of programInfos) {
		const programDate = startOfDay(new Date(programInfo.program.start));

		// If there's a new date, create a new chunk
		if (programDate.getTime() !== currentDate?.getTime()) {
			currentDate = programDate;
			programsByDate.push({ date: programDate, programs: [] });
		}

		programsByDate[programsByDate.length - 1].programs.push(programInfo);
	}

	return programsByDate;
}
