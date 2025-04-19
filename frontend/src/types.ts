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

export interface NowPlaying {
	radio: Radio;
	now_playing?: Program;
	up_next?: Program;
}
