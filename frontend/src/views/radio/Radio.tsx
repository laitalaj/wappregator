import { createEffect, createMemo, createSignal, lazy, Show, Suspense } from "solid-js";

import {
	SocketProvider,
	useChangeChannelEffect,
	useChannelStates,
	useListenersState,
	useNowPlayingState,
	useRadiosState,
	useScheduleState,
	useStreamStatusState,
} from "../../state";
import { useSelectedProgram } from "../../useSelectedProgram";
import { Channels } from "../channels/Channels";
import { useLayoutState } from "../layoutState";
import { usePlayerState } from "../player/playerState";

import classes from "../App.module.css";

const Description = lazy(() =>
	import("../programModal/ProgramModal").then((module) => ({
		default: module.ProgramModal,
	})),
);

function Radio() {
	const { nonModalElementsInert, setNonModalElementsInert } = useLayoutState();
	const { setChannel, isPlaying, setIsPlaying } = usePlayerState();
	const radios = useRadiosState();
	const schedule = useScheduleState();
	const nowPlaying = useNowPlayingState();
	const streamStatus = useStreamStatusState();
	const listeners = useListenersState();
	const channelStates = useChannelStates(schedule, radios, nowPlaying, streamStatus, listeners);

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

	const selectedAndPlaying = createMemo(() => {
		const channelId = selectedChannelId();
		return isPlaying() ? channelId : null;
	});
	// We're passing this to createEffect in the function, so this is a false alarm
	// (could still be refactored instead of ignored but I'll leave that as an exercise for the reader)
	// eslint-disable-next-line solid/reactivity
	useChangeChannelEffect(selectedAndPlaying);

	createEffect(() => {
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

		setChannel(radio);
	});

	createEffect(() => setNonModalElementsInert(selectedProgram() !== null));

	return (
		<>
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
