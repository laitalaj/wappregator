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
import type { NowPlaying, Radios, Schedule } from "./types";

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

	const url = new URL(`${import.meta.env.VITE_API_URL}/schedule`);
	const params = new URLSearchParams({
		start: start.toISOString(),
		end: end.toISOString(),
		min_upcoming: "2",
	});
	const response = await fetch(`${url}?${params}`);
	return response.json();
}

export function getNowPlayingState(
	schedule: Resource<Schedule>,
	radios: Resource<Radios>,
): Accessor<NowPlaying[]> {
	const [nowPlaying, setNowPlaying] = createSignal<NowPlaying[]>([]);
	const updateNowPlaying = () => {
		const scheduleData = schedule();
		const radiosData = radios();
		if (!scheduleData || !radiosData) {
			return;
		}

		const now = new Date();
		const res: NowPlaying[] = [];

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

			const nextProgram = programs.find((program) => {
				const start = parseISO(program.start);
				return isBefore(now, start);
			});

			res.push({
				radio,
				now_playing: currentProgram,
				up_next: nextProgram,
			});
		}
		setNowPlaying(res);
	};

	createEffect(updateNowPlaying);

	const nowPlayingInterval = setInterval(() => {
		updateNowPlaying();
	}, NOW_PLAYING_UPDATE_INTERVAL_MS);

	onCleanup(() => {
		clearInterval(nowPlayingInterval);
	});

	return nowPlaying;
}
