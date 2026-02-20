import {
	addHours,
	differenceInCalendarDays,
	isBefore,
	isWithinInterval,
	parseISO,
	startOfHour,
	subHours,
} from "date-fns";
import { io, type Socket } from "socket.io-client";
import {
	type Accessor,
	createContext,
	createEffect,
	createResource,
	createSignal,
	onCleanup,
	type ParentProps,
	type Resource,
	useContext,
} from "solid-js";
import type {
	ChannelState,
	ListenerCounts,
	NowPlaying,
	Radios,
	Schedule,
} from "./types";

const RADIOS_FETCH_INTERVAL_MS = 15 * 60 * 1000;
const SCHEDULE_FETCH_INTERVAL_MS = 5 * 60 * 1000;
const NOW_PLAYING_UPDATE_INTERVAL_MS = 1000;

export function useRadiosState(): Resource<Radios> {
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

export function useScheduleState(): Resource<Schedule> {
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

export function useChannelStates(
	schedule: Resource<Schedule>,
	radios: Resource<Radios>,
	nowPlaying: Accessor<NowPlaying>,
): Accessor<ChannelState[]> {
	const [channelState, setChannelState] = createSignal<ChannelState[]>([]);
	const updateChannelState = () => {
		const scheduleData = schedule();
		const radiosData = radios();
		const nowPlayingData = nowPlaying();

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

			const currentSong = nowPlayingData?.[radio.id] ?? undefined;

			res.push({
				radio,
				currentProgram,
				nextPrograms,
				currentSong,
			});
		}
		setChannelState(res);
	};

	createEffect(updateChannelState);

	const channelStateInterval = setInterval(() => {
		updateChannelState();
	}, NOW_PLAYING_UPDATE_INTERVAL_MS);

	onCleanup(() => {
		clearInterval(channelStateInterval);
	});

	return channelState;
}

const SocketContext = createContext<Socket>();

export function SocketProvider(props: ParentProps) {
	const socket_options = import.meta.env.VITE_SOCKETIO_PATH
		? { path: import.meta.env.VITE_SOCKETIO_PATH }
		: undefined;
	const socket_url = import.meta.env.VITE_API_URL?.startsWith("http")
		? import.meta.env.VITE_API_URL
		: undefined; // undefined = use current location
	const socket = io(socket_url, socket_options);

	onCleanup(() => {
		socket.close();
	});

	return (
		<SocketContext.Provider value={socket}>
			{props.children}
		</SocketContext.Provider>
	);
}

export function useNowPlayingState(): Accessor<NowPlaying> {
	const socket = useContext(SocketContext);
	if (!socket) {
		throw new Error("useNowPlayingState must be used within a SocketProvider");
	}

	const [nowPlaying, setNowPlaying] = createSignal<NowPlaying>({});

	createEffect(() => {
		const updateNowPlaying = (data: NowPlaying) => {
			setNowPlaying({ ...nowPlaying(), ...data });
		};
		socket.removeAllListeners("now_playing");
		socket.on("now_playing", updateNowPlaying);
	});

	return nowPlaying;
}

export function useListenersState(): Accessor<ListenerCounts> {
	const socket = useContext(SocketContext);
	if (!socket) {
		throw new Error("useListenersState must be used within a SocketProvider");
	}

	const [listenerCounts, setListenerCounts] = createSignal<ListenerCounts>({});

	createEffect(() => {
		const updateListenerCounts = (data: ListenerCounts) => {
			setListenerCounts(data);
		};
		socket.removeAllListeners("listeners");
		socket.on("listeners", updateListenerCounts);
	});

	return listenerCounts;
}

export function useChangeChannelEffect(
	selectedChannelId: Accessor<string | null>,
) {
	const socket = useContext(SocketContext);
	if (!socket) {
		throw new Error(
			"useChangeChannelEffect must be used within a SocketProvider",
		);
	}

	createEffect(() => {
		const channelId = selectedChannelId() || "none";
		socket.emit("change_channel", channelId);
	});
}

export enum WappuState {
	Pre = "pre",
	Wappu = "wappu",
	Post = "post",
}

function getWappuState(): WappuState {
	const now = new Date();
	const year = now.getFullYear();
	const preStart = new Date(year, 3, 1); // April 1st, midnight
	const wappuStart = new Date(year, 3, 30); // April 30th, midnight
	const wappuEnd = new Date(year, 4, 2); // May 2nd, midnight

	if (isWithinInterval(now, { start: preStart, end: wappuStart })) {
		return WappuState.Pre;
	}
	if (isWithinInterval(now, { start: wappuStart, end: wappuEnd })) {
		return WappuState.Wappu;
	}
	return WappuState.Post;
}

export function useWappuState(): Accessor<WappuState> {
	const searchParams = new URLSearchParams(window.location.search);
	const wappuOverride = searchParams.get("wappu");
	if (wappuOverride) {
		if (wappuOverride === "pre") {
			return () => WappuState.Pre;
		}
		if (wappuOverride === "wappu") {
			return () => WappuState.Wappu;
		}
		if (wappuOverride === "post") {
			return () => WappuState.Post;
		}
	}

	const [wappuState, setWappuState] = createSignal<WappuState>(getWappuState());

	const interval = setInterval(
		() => setWappuState(getWappuState()),
		1000 * 60, // Would be cool to first wait until midnight and then daily, but that'd complicate this a bunch
	);
	onCleanup(() => {
		clearInterval(interval);
	});

	return wappuState;
}

function getMaydayCountdown(): number {
	const now = new Date();
	const year = now.getFullYear();
	let mayday = new Date(year, 4, 1); // May 1st
	if (now >= mayday) {
		mayday = new Date(year + 1, 4, 1);
	}
	return differenceInCalendarDays(mayday, now);
}

export function useMaydayCountdownState(): Accessor<number> {
	const [countdownState, setCountdownState] = createSignal<number>(
		getMaydayCountdown(),
	);

	const interval = setInterval(
		() => setCountdownState(getMaydayCountdown()),
		1000 * 60,
	);
	onCleanup(() => {
		clearInterval(interval);
	});

	return countdownState;
}
