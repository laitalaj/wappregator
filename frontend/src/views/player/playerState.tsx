import {
	type Accessor,
	type Resource,
	type Setter,
	createContext,
	createEffect,
	createMemo,
	createSignal,
	type ParentProps,
	useContext,
} from "solid-js";

import {
	useChannelStates,
	useListenersState,
	useNowPlayingState,
	useRadiosState,
	useScheduleState,
	useStreamStatusState,
	useChangeChannelEffect,
} from "../../state";
import type { ChannelState, Radios, Schedule } from "../../types";

export interface PlayerState {
	channelId: Accessor<string | null>;
	setChannelId: Setter<string | null>;
	channel: Accessor<ChannelState | undefined>;
	channels: Accessor<ChannelState[]>;

	radios: Resource<Radios>;
	schedule: Resource<Schedule>;

	isPlaying: Accessor<boolean>;
	setIsPlaying: Setter<boolean>;
}

const PlayerStateContext = createContext<PlayerState>();

export function PlayerStateProvider(props: ParentProps) {
	const [channelId, setChannelId] = createSignal<string | null>(null);
	const [channel, setChannel] = createSignal<ChannelState | undefined>(undefined);
	const [isPlaying, setIsPlaying] = createSignal(false);

	const radios = useRadiosState();
	const schedule = useScheduleState();
	const nowPlaying = useNowPlayingState();
	const streamStatus = useStreamStatusState();
	const listeners = useListenersState();
	const channels = useChannelStates(schedule, radios, nowPlaying, streamStatus, listeners);

	const selectedAndPlaying = createMemo(() => {
		const selected = channelId();
		return isPlaying() ? selected : null;
	});
	// We're passing this to createEffect in the function, so this is a false alarm
	// (could still be refactored instead of ignored but I'll leave that as an exercise for the reader)
	// eslint-disable-next-line solid/reactivity
	useChangeChannelEffect(selectedAndPlaying);

	createEffect(() => {
		if (channelId() === null) {
			setChannel(undefined);
			return;
		}

		const radio = channels().find((station) => station.radio.id === channelId());

		if (!radio) {
			console.warn(`Selected channel ID ${channelId()} not found in nowPlaying data`);
			setChannelId(null);
			setChannel(undefined);
			return;
		}

		setChannel(radio);
	});

	const state = {
		channelId,
		setChannelId,
		channel,
		channels,

		radios,
		schedule,

		isPlaying,
		setIsPlaying,
	};

	return <PlayerStateContext.Provider value={state}>{props.children}</PlayerStateContext.Provider>;
}

export function usePlayerState(): PlayerState {
	const context = useContext(PlayerStateContext);
	if (!context) {
		throw new Error("usePlayerState must be used within a PlayerStateProvider");
	}
	return context;
}
