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

export interface Stream {
	url: string;
	mime_type?: string;
}

export interface Brand {
	background_color: string;
	text_color: string;
}

export interface Radio {
	id: string;
	name: string;
	url: string;
	location: string;
	frequency_mhz?: number;
	brand: Brand;
	streams: Stream[];
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
