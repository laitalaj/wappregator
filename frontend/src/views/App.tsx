import {
	IconBrandGithub,
	IconBrandGithubFilled,
	IconBrandTelegram,
} from "@tabler/icons-solidjs";
import { type Component, createMemo, createSignal } from "solid-js";
import { funnySlogansHaha } from "../funnySlogansHaha";
import type { RadioState } from "../radio";
import { getNowPlayingState, getRadiosState, getScheduleState } from "../state";
import classes from "./App.module.css";
import { Channels } from "./channels/Channels";
import { PlayerBar } from "./player/PlayerBar";

const App: Component = () => {
	const radios = getRadiosState();
	const schedule = getScheduleState();
	const nowPlaying = getNowPlayingState(schedule, radios);

	const [selectedChannelId, setSelectedChannelId] = createSignal<string | null>(
		null,
	);
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

	return (
		<div class={classes.app}>
			<Header />
			<main>
				<Channels
					nowPlaying={nowPlaying}
					isPlaying={isPlaying}
					setIsPlaying={setIsPlaying}
					selectedChannelId={selectedChannelId}
					setSelectedChannelId={setSelectedChannelId}
				/>
				<PlayerBar radioState={radioState} setIsPlaying={setIsPlaying} />
			</main>
		</div>
	);
};

function Header() {
	const funnySlogan =
		funnySlogansHaha[Math.floor(Math.random() * funnySlogansHaha.length)];

	return (
		<header>
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
