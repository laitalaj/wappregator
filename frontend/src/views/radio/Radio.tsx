import { createEffect, createMemo, lazy, Show, Suspense } from "solid-js";

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

export default function Radio() {
	const { nonModalElementsInert, setNonModalElementsInert } = useLayoutState();
	const {
		channelId,
		setChannelId,
		channels,

		radios,
		schedule,

		isPlaying,
		setIsPlaying,
	} = usePlayerState();

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

	// eslint-disable-next-line solid/reactivity
	const [selectedProgram, setSelectedProgram] = useSelectedProgram(allPrograms);

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
					channelState={channels}
					isPlaying={isPlaying}
					setIsPlaying={setIsPlaying}
					selectedChannelId={channelId}
					setSelectedChannelId={setChannelId}
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
