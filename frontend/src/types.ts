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
	contrast_color?: string;
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

export interface ChannelState {
	radio: Radio;
	currentProgram?: Program;
	nextPrograms: Program[];
	currentSong: Song | undefined;
	listenerCount?: number;
}

export interface ProgramInfo {
	program: Program;
	radio: Radio;
}

export interface Song {
	title: string;
	artist?: string;
}

export type NowPlaying = Partial<Record<string, Song | null>>;

export type ListenerCounts = Partial<Record<string, number>>;
