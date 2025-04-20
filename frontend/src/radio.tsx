import type { Program, Radio } from "./types";

export type RadioState =
	| { type: "channelNotSelected" }
	| {
			type: "channelSelected";
			radio: Radio;
			nowPlaying: Program | undefined;
			isPlaying: boolean;
	  };
