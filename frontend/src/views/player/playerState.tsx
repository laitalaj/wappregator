import {
	type Accessor,
	type Setter,
	createContext,
	createSignal,
	type ParentProps,
	useContext,
} from "solid-js";

import type { ChannelState } from "../../types";

export interface PlayerState {
	channel: Accessor<ChannelState | undefined>;
	setChannel: Setter<ChannelState | undefined>;
	isPlaying: Accessor<boolean>;
	setIsPlaying: Setter<boolean>;
}

const PlayerStateContext = createContext<PlayerState>();

export function PlayerStateProvider(props: ParentProps) {
	const [channel, setChannel] = createSignal<ChannelState | undefined>(undefined);
	const [isPlaying, setIsPlaying] = createSignal(false);

	const state = {
		channel,
		setChannel,
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
