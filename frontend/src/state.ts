import {
	addHours,
	isBefore,
	isWithinInterval,
	parseISO,
	startOfHour,
	subHours,
} from "date-fns";
import {
	type Accessor,
	type Resource,
	createEffect,
	createResource,
	createSignal,
	onCleanup,
} from "solid-js";
import type { ChannelState, Radios, Schedule } from "./types";

const RADIOS_FETCH_INTERVAL_MS = 15 * 60 * 1000;
const SCHEDULE_FETCH_INTERVAL_MS = 5 * 60 * 1000;
const NOW_PLAYING_UPDATE_INTERVAL_MS = 1000;

export function getRadiosState(): Resource<Radios> {
	const [radios, { refetch: refetchRadios }] = createResource(fetchRadios);

	const radiosInterval = setInterval(() => {
		refetchRadios();
	}, RADIOS_FETCH_INTERVAL_MS);

	onCleanup(() => {
		clearInterval(radiosInterval);
	});

	return radios;
}

async function fetchRadios(): Promise<Radios> {
	const response = await fetch(`${import.meta.env.VITE_API_URL}/radios`);
	return response.json();
}

export function getScheduleState(): Resource<Schedule> {
	const [schedule, { refetch: refetchSchedule }] =
		createResource(fetchSchedule);

	const scheduleInterval = setInterval(() => {
		refetchSchedule();
	}, SCHEDULE_FETCH_INTERVAL_MS);

	onCleanup(() => {
		clearInterval(scheduleInterval);
	});

	return schedule;
}

async function fetchSchedule(): Promise<Schedule> {
	const now = new Date();
	const start = subHours(startOfHour(now), 1);
	const end = addHours(startOfHour(now), 2);

	const url = `${import.meta.env.VITE_API_URL}/schedule`;
	const params = new URLSearchParams({
		start: start.toISOString(),
		end: end.toISOString(),
		min_upcoming: "4",
	});
	const response = await fetch(`${url}?${params}`);
	return response.json();
}

export function getChannelState(
	schedule: Resource<Schedule>,
	radios: Resource<Radios>,
): Accessor<ChannelState[]> {
	const [channelState, setChannelState] = createSignal<ChannelState[]>([]);
	const updateChannelState = () => {
		const scheduleData = schedule();
		const radiosData = radios();
		if (!scheduleData || !radiosData) {
			return;
		}

		const now = new Date();
		const res: ChannelState[] = [];

		for (const [radioId, programs] of Object.entries(scheduleData)) {
			const radio = radiosData[radioId];
			if (!radio) continue;

			const currentProgram = programs.find((program) => {
				const interval = {
					start: parseISO(program.start),
					end: parseISO(program.end),
				};
				return isWithinInterval(now, interval);
			});

			const nextPrograms = programs.filter((program) => {
				const start = parseISO(program.start);
				return isBefore(now, start);
			});

			res.push({
				radio,
				now_playing: currentProgram,
				up_next: nextPrograms,
			});
		}
		setChannelState(res);
	};

	createEffect(updateChannelState);

	const nowPlayingInterval = setInterval(() => {
		updateChannelState();
	}, NOW_PLAYING_UPDATE_INTERVAL_MS);

	onCleanup(() => {
		clearInterval(nowPlayingInterval);
	});

	return channelState;
}
