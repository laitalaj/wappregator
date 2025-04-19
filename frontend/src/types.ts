export interface Program {
	start: string;
	end: string;
	title: string;
	description?: string;
	genre?: string;
	host?: string;
	producer?: string;
	photo?: string;
}

export interface Radio {
	id: string;
	name: string;
	url: string;
}

export interface Radios {
	[id: string]: Radio;
}

export interface Schedule {
	[id: string]: Program[];
}

export interface NowPlaying {
	radio: Radio;
	now_playing?: Program;
	up_next?: Program;
}
