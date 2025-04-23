import type { ChannelState } from "./types";

export interface RadioState extends ChannelState {
	isPlaying: boolean;
}
