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

export type CurrentSongType = "none" | "latest" | "realtime";

export interface Radio {
	id: string;
	name: string;
	url: string;
	location: string;
	wappu_locations?: string[];
	frequency_mhz?: number;
	brand: Brand;
	streams: Stream[];
	current_song_type?: CurrentSongType;
}

export interface Radios {
	[id: string]: Radio;
}

export interface Schedule {
	[id: string]: Program[];
}

export enum RadioStatus {
	Online,
	Offline,
	Broken,
	Unknown,
}

export interface ChannelState {
	radio: Radio;
	currentProgram?: Program;
	nextPrograms: Program[];
	currentSong: Song | undefined;
	streamStatus: Record<string, boolean> | undefined;
	listenerCount?: number;
	radioStatus: RadioStatus;
}

export interface ProgramInfo {
	program: Program;
	radio: Radio;
}

export interface Song {
	title: string;
	artist?: string;
	start?: string;
}

export type NowPlaying = Partial<Record<string, Song | null>>;

export type StreamStatus = Partial<Record<string, Record<string, boolean>>>;

export type ListenerCounts = Partial<Record<string, number>>;
