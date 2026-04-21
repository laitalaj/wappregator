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
	createMemo,
	createResource,
	createSignal,
	onCleanup,
	type ParentProps,
	type Resource,
	useContext,
} from "solid-js";

import { getPreWappuStartDate, getWappuEndDate, getWappuStartDate } from "./timeUtils";
import {
	type ChannelState,
	type ListenerCounts,
	type NowPlaying,
	RadioStatus,
	type Radios,
	type Schedule,
	type StreamStatus,
} from "./types";

const RADIOS_FETCH_INTERVAL_MS = 15 * 60 * 1000;
const SCHEDULE_FETCH_INTERVAL_MS = 5 * 60 * 1000;
const NOW_PLAYING_UPDATE_INTERVAL_MS = 1000;
const RADIO_SORT_TIMEOUT_MS = 512;

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
	const [schedule, { refetch: refetchSchedule }] = createResource(fetchSchedule);

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

function generateRadioOrder(
	state: Accessor<{ [radioId: string]: ChannelState }>,
	stateIsReady: Accessor<boolean>,
): Accessor<string[] | null> {
	const [timedOut, setTimedOut] = createSignal(false);
	const [radioOrder, setRadioOrder] = createSignal<string[] | null>(null);

	const timeout = setTimeout(() => {
		setTimedOut(true);
	}, RADIO_SORT_TIMEOUT_MS);

	onCleanup(() => {
		clearTimeout(timeout);
	});

	const byListeners = (
		[, channelStateA]: [string, ChannelState],
		[, channelStateB]: [string, ChannelState],
	) => {
		const listenersA = channelStateA.listenerCount ?? 0;
		const listenersB = channelStateB.listenerCount ?? 0;
		return listenersB - listenersA;
	};

	const byNextProgramStart = (
		[, channelStateA]: [string, ChannelState],
		[, channelStateB]: [string, ChannelState],
	) => {
		const nextProgramA = channelStateA.nextPrograms[0];
		const nextProgramB = channelStateB.nextPrograms[0];
		if (!nextProgramA && !nextProgramB) return 0;
		if (!nextProgramA) return 1;
		if (!nextProgramB) return -1;
		return parseISO(nextProgramA.start).getTime() - parseISO(nextProgramB.start).getTime();
	};

	createEffect(() => {
		if (radioOrder() !== null) return;
		if (Object.keys(state()).length === 0) return;
		if (!timedOut() && !stateIsReady()) {
			return;
		}

		const activeRadios = Object.entries(state()).filter(
			([_, channelState]) =>
				channelState.currentProgram && channelState.radioStatus === RadioStatus.Online,
		);
		const brokenRadios = Object.entries(state()).filter(
			([_, channelState]) =>
				channelState.currentProgram && channelState.radioStatus !== RadioStatus.Online,
		);
		const offlineButPlayingRadios = Object.entries(state()).filter(
			([_, channelState]) =>
				!channelState.currentProgram && channelState.radioStatus === RadioStatus.Online,
		);
		const offlineRadios = Object.entries(state()).filter(
			([_, channelState]) =>
				!channelState.currentProgram && channelState.radioStatus !== RadioStatus.Online,
		);

		const activeOrder = activeRadios.sort(byListeners).map(([id]) => id);
		const brokenOrder = brokenRadios.sort(byListeners).map(([id]) => id);
		const offlineButPlayingOrder = offlineButPlayingRadios
			.sort(byNextProgramStart)
			.map(([id]) => id);
		const offlineOrder = offlineRadios.sort(byNextProgramStart).map(([id]) => id);

		setRadioOrder([...activeOrder, ...brokenOrder, ...offlineButPlayingOrder, ...offlineOrder]);
	});

	return radioOrder;
}

export function useChannelStates(
	schedule: Resource<Schedule>,
	radios: Resource<Radios>,
	nowPlaying: Accessor<NowPlaying>,
	streamStatus: Accessor<StreamStatus>,
	listeners: Accessor<ListenerCounts>,
): Accessor<ChannelState[]> {
	const [channelStateMap, setChannelStateMap] = createSignal<{ [radioId: string]: ChannelState }>(
		{},
	);
	const [readyToGenerateOrder, setReadyToGenerateOrder] = createSignal(false);

	const updateChannelState = () => {
		const scheduleData = schedule();
		const radiosData = radios();
		const nowPlayingData = nowPlaying();
		const streamStatusData = streamStatus();
		const listenerData = listeners();

		if (!scheduleData || !radiosData) {
			return;
		}

		const now = new Date();
		const res: { [radioId: string]: ChannelState } = {};

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
			const streamStatus = streamStatusData?.[radio.id] ?? undefined; // TODO: Stream selection based on what we think is available
			const listenerCount = listenerData[radio.id];

			let radioStatus: RadioStatus;
			if (streamStatus === undefined || Object.keys(streamStatus).length === 0) {
				radioStatus = RadioStatus.Unknown;
			} else if (Object.values(streamStatus).some((status) => status)) {
				radioStatus = RadioStatus.Online;
			} else if (currentProgram) {
				radioStatus = RadioStatus.Broken;
			} else {
				radioStatus = RadioStatus.Offline;
			}

			res[radio.id] = {
				radio,
				currentProgram,
				nextPrograms,
				currentSong,
				streamStatus,
				listenerCount,
				radioStatus,
			};
		}
		setChannelStateMap(res);

		setReadyToGenerateOrder(
			schedule() !== undefined &&
				radios() !== undefined &&
				Object.keys(streamStatus()).length > 0 &&
				Object.keys(listeners()).length > 0,
		);
	};

	createEffect(updateChannelState);

	const channelStateInterval = setInterval(() => {
		updateChannelState();
	}, NOW_PLAYING_UPDATE_INTERVAL_MS);

	onCleanup(() => {
		clearInterval(channelStateInterval);
	});

	// eslint-disable-next-line solid/reactivity
	const order = generateRadioOrder(channelStateMap, readyToGenerateOrder);

	const channelState = createMemo(() => {
		const channelMap = channelStateMap();
		const channelOrder = order();
		if (channelOrder === null) {
			return [];
		}
		return channelOrder.map((id) => channelMap[id]);
	});

	return channelState;
}

async function fetchFullSchedule(): Promise<Schedule> {
	const now = new Date();
	const year = now.getFullYear();
	let start = startOfHour(now);
	let end = getWappuEndDate(year);
	if (isBefore(end, start)) {
		start = getPreWappuStartDate(year + 1);
		end = getWappuEndDate(year + 1);
	}

	const url = `${import.meta.env.VITE_API_URL}/schedule`;
	const params = new URLSearchParams({
		start: start.toISOString(),
		end: end.toISOString(),
	});
	const response = await fetch(`${url}?${params}`);
	return response.json();
}

export function useFullScheduleState(): Resource<Schedule> {
	const [schedule, { refetch: refetchSchedule }] = createResource(fetchFullSchedule);

	const scheduleInterval = setInterval(() => {
		refetchSchedule();
	}, SCHEDULE_FETCH_INTERVAL_MS);

	onCleanup(() => {
		clearInterval(scheduleInterval);
	});

	return schedule;
}

async function fetchOffSeason(): Promise<boolean> {
	const response = await fetch(`${import.meta.env.VITE_API_URL}/offseason`);
	return response.json();
}

export function useOffSeasonState(): Resource<boolean> {
	const [offSeason, { refetch: refetchOffSeason }] = createResource(fetchOffSeason);

	const offSeasonInterval = setInterval(
		() => {
			refetchOffSeason();
		},
		60 * 60 * 1000,
	);

	onCleanup(() => {
		clearInterval(offSeasonInterval);
	});

	return offSeason;
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

	return <SocketContext.Provider value={socket}>{props.children}</SocketContext.Provider>;
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

export function useStreamStatusState(): Accessor<StreamStatus> {
	const socket = useContext(SocketContext);
	if (!socket) {
		throw new Error("useStreamStatusState must be used within a SocketProvider");
	}

	const [streamStatus, setStreamStatus] = createSignal<StreamStatus>({});

	createEffect(() => {
		const updateStreamStatus = (data: StreamStatus) => {
			setStreamStatus({ ...streamStatus(), ...data });
		};
		socket.removeAllListeners("stream_status");
		socket.on("stream_status", updateStreamStatus);
	});

	return streamStatus;
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

export function useChangeChannelEffect(selectedChannelId: Accessor<string | null>) {
	const socket = useContext(SocketContext);
	if (!socket) {
		throw new Error("useChangeChannelEffect must be used within a SocketProvider");
	}

	const emitCCEvent = (maybeChannelId: string | null) => {
		if (!socket.connected) return;
		const channelId = maybeChannelId || "none";
		socket.emit("change_channel", channelId);
	};

	createEffect(() => emitCCEvent(selectedChannelId()));
	createEffect(() => {
		socket.removeAllListeners("connect"); // TODO: We might want to do a socket.off here & elsewhere, but for now this should be fine as we don't do other connect events
		socket.on("connect", () => emitCCEvent(selectedChannelId()));
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
	const preStart = getPreWappuStartDate(year);
	const wappuStart = getWappuStartDate(year);
	const wappuEnd = getWappuEndDate(year);

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
	const [countdownState, setCountdownState] = createSignal<number>(getMaydayCountdown());

	const interval = setInterval(() => setCountdownState(getMaydayCountdown()), 1000 * 60);
	onCleanup(() => {
		clearInterval(interval);
	});

	return countdownState;
}

function getBirthday(): number | null {
	const now = new Date();
	if (now.getMonth() !== 3 || now.getDate() !== 17) {
		return null;
	}
	return now.getFullYear() - 2025;
}

export function useBirthdayState(): Accessor<number | null> {
	const searchParams = new URLSearchParams(window.location.search);
	const birthdayOverride = searchParams.get("birthday");
	if (birthdayOverride) {
		return () => parseInt(birthdayOverride, 10) || null;
	}

	const [birthday, setBirthday] = createSignal<number | null>(getBirthday());

	const interval = setInterval(
		() => setBirthday(getBirthday()),
		1000 * 60, // Would be cool to first wait until midnight and then daily, but that'd complicate this a bunch
	);
	onCleanup(() => {
		clearInterval(interval);
	});

	return birthday;
}
