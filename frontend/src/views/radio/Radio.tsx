import { createEffect, createMemo, createSignal, lazy, Show, Suspense } from "solid-js";

import type { RadioState } from "../../radio";
import {
	SocketProvider,
	useChangeChannelEffect,
	useChannelStates,
	useListenersState,
	useNowPlayingState,
	useRadiosState,
	useScheduleState,
	useStreamStatusState,
	WappuState,
} from "../../state";
import { useSelectedProgram } from "../../useSelectedProgram";
import { Channels } from "../channels/Channels";
import { OffSeasonCountdown, RibbonCountdown } from "../countdown/Countdown";
import { useLayoutState } from "../layoutState";
import { PlayerBar } from "../player/PlayerBar";

import classes from "../App.module.css";

const Description = lazy(() =>
	import("../programModal/ProgramModal").then((module) => ({
		default: module.ProgramModal,
	})),
);

function Radio() {
	const { wappu, nonModalElementsInert, setNonModalElementsInert } = useLayoutState();
	const radios = useRadiosState();
	const schedule = useScheduleState();
	const nowPlaying = useNowPlayingState();
	const streamStatus = useStreamStatusState();
	const listeners = useListenersState();
	const channelStates = useChannelStates(schedule, radios, nowPlaying, streamStatus, listeners);

	const isOffSeason = createMemo(() => {
		if (wappu() === WappuState.Post) {
			return true;
		}

		if (wappu() === WappuState.Wappu) {
			return false;
		}

		const states = channelStates();
		return states.length > 0 && states.every((s) => s.nextPrograms.length === 0);
	});

	const allPrograms = createMemo(() => {
		const scheduleData = schedule();
		const radiosData = radios();
		if (!scheduleData || !radiosData) return [];
		return Object.entries(scheduleData).flatMap(([channelId, programs]) =>
			programs.map((program) => ({
				radio: radiosData[channelId],
				program,
			})),
		);
	});

	const [selectedChannelId, setSelectedChannelId] = createSignal<string | null>(null);

	// eslint-disable-next-line solid/reactivity
	const [selectedProgram, setSelectedProgram] = useSelectedProgram(allPrograms);
	const [isPlaying, setIsPlaying] = createSignal(false);

	const selectedAndPlaying = createMemo(() => {
		const channelId = selectedChannelId();
		return isPlaying() ? channelId : null;
	});
	// We're passing this to createEffect in the function, so this is a false alarm
	// (could still be refactored instead of ignored but I'll leave that as an exercise for the reader)
	// eslint-disable-next-line solid/reactivity
	useChangeChannelEffect(selectedAndPlaying);

	const radioState = createMemo((): RadioState | undefined => {
		if (selectedChannelId() === null) {
			return undefined;
		}

		const radio = channelStates().find((station) => station.radio.id === selectedChannelId());

		if (!radio) {
			// TODO: Auto-deselect channel in this case?
			// Probably can't be done inside memo, needs an effect
			console.warn(`Selected channel ID ${selectedChannelId()} not found in nowPlaying data`);

			return undefined;
		}

		return {
			...radio,
			isPlaying: isPlaying(),
		};
	});

	createEffect(() => setNonModalElementsInert(selectedProgram() !== null));

	return (
		<>
			<main>
				<Show
					when={!isOffSeason()}
					fallback={<OffSeasonCountdown isPostWappu={wappu() === WappuState.Post} />}
				>
					<div
						classList={{
							[classes.content]: true,
							[classes.dimmedContent]: !!selectedProgram(),
						}}
						inert={nonModalElementsInert()}
					>
						<Channels
							channelState={channelStates}
							isPlaying={isPlaying}
							setIsPlaying={setIsPlaying}
							selectedChannelId={selectedChannelId}
							setSelectedChannelId={setSelectedChannelId}
							setSelectedProgram={setSelectedProgram}
						/>
					</div>
					<Show when={selectedProgram()}>
						{(selected) => (
							<Suspense fallback={null}>
								<Description programInfo={selected()} setSelectedProgram={setSelectedProgram} />
							</Suspense>
						)}
					</Show>
					<PlayerBar radioState={radioState} setIsPlaying={setIsPlaying} />
				</Show>
			</main>
			<Show when={!isOffSeason() && selectedChannelId() === null}>
				<RibbonCountdown />
			</Show>
		</>
	);
}

export default function WrappedRadio() {
	return (
		<SocketProvider>
			<Radio />
		</SocketProvider>
	);
}
