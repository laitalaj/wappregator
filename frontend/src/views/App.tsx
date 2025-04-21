import {
	IconBrandGithubFilled,
	IconBrandTelegram,
} from "@tabler/icons-solidjs";
import {
	type Accessor,
	type Component,
	Show,
	createMemo,
	createSignal,
} from "solid-js";
import { funnySlogansHaha } from "../funnySlogansHaha";
import type { RadioState } from "../radio";
import { getNowPlayingState, getRadiosState, getScheduleState } from "../state";
import type { ProgramInfo } from "../types";
import classes from "./App.module.css";
import { Channels } from "./channels/Channels";
import { Description } from "./description/Description";
import { PlayerBar } from "./player/PlayerBar";

const App: Component = () => {
	const radios = getRadiosState();
	const schedule = getScheduleState();
	const nowPlaying = getNowPlayingState(schedule, radios);

	const [selectedChannelId, setSelectedChannelId] = createSignal<string | null>(
		null,
	);
	const [selectedProgram, setSelectedProgram] =
		createSignal<ProgramInfo | null>(null);
	const [isPlaying, setIsPlaying] = createSignal(false);

	const radioState = createMemo((): RadioState => {
		if (selectedChannelId() === null) {
			return { type: "channelNotSelected" };
		}

		const radio = nowPlaying().find(
			(station) => station.radio.id === selectedChannelId(),
		);

		if (!radio) {
			// TODO: Auto-deselect channel in this case?
			// Probably can't be done inside memo, needs an effect
			console.warn(
				`Selected channel ID ${selectedChannelId()} not found in nowPlaying data`,
			);
			return { type: "channelNotSelected" };
		}

		return {
			type: "channelSelected",
			radio: radio.radio,
			nowPlaying: radio.now_playing,
			isPlaying: isPlaying(),
		};
	});

	const nonModalElementsInert = () => selectedProgram() !== null;

	return (
		<div class={classes.app}>
			<Header inert={nonModalElementsInert} />
			<main>
				<div
					classList={{
						[classes.content]: true,
						[classes.dimmedContent]: !!selectedProgram(),
					}}
					inert={nonModalElementsInert()}
				>
					<Channels
						nowPlaying={nowPlaying}
						isPlaying={isPlaying}
						setIsPlaying={setIsPlaying}
						selectedChannelId={selectedChannelId}
						setSelectedChannelId={setSelectedChannelId}
						setSelectedProgram={setSelectedProgram}
					/>
				</div>
				<Show when={selectedProgram()}>
					{(selected) => (
						<Description
							programInfo={selected()}
							setSelectedProgram={setSelectedProgram}
						/>
					)}
				</Show>
				<PlayerBar radioState={radioState} setIsPlaying={setIsPlaying} />
			</main>
		</div>
	);
};

interface HeaderProps {
	inert: Accessor<boolean>;
}

function Header(props: HeaderProps) {
	const funnySlogan =
		funnySlogansHaha[Math.floor(Math.random() * funnySlogansHaha.length)];

	return (
		<header inert={props.inert()}>
			<div class={classes.headerLogo}>
				<h1>
					Wappregat<small>.</small>or<small>g</small>
				</h1>
				<img src="/appicon.png" alt="" width={64} height={64} />
			</div>
			<span>{funnySlogan}</span>
			<div class={classes.headerLinks}>
				<a
					class={classes.headerLink}
					href="https://github.com/laitalaj/wappregator"
					target="_blank"
					rel="noopener noreferrer"
					title="Kanna kortesi kekoon GitHubissa (uusi välilehti)"
				>
					<IconBrandGithubFilled height={24} />
				</a>
				<a
					class={classes.headerLink}
					href="https://t.me/+qkl_29fGEXpkY2Q0"
					target="_blank"
					rel="noopener noreferrer"
					title="Ota yhteyttä Telegramissa (uusi välilehti)"
				>
					<IconBrandTelegram height={24} />
				</a>
			</div>
		</header>
	);
}

export default App;
