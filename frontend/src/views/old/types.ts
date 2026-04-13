import type { Radio, Program } from "../../types";

export interface NowPlaying {
	radio: Radio;
	now_playing?: Program;
	up_next?: Program;
}
