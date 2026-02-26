import {
	IconBrandGithubFilled,
	IconBrandTelegram,
	IconMail,
} from "@tabler/icons-solidjs";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
	lazy,
	Show,
	Suspense,
} from "solid-js";
import { funnySlogansHaha } from "../funnySlogansHaha";
import type { RadioState } from "../radio";
import {
	SocketProvider,
	useChangeChannelEffect,
	useChannelStates,
	useListenersState,
	useMaydayCountdownState,
	useNowPlayingState,
	useRadiosState,
	useScheduleState,
	useWappuState,
	WappuState,
} from "../state";
import type { ProgramInfo } from "../types";
import classes from "./App.module.css";
import { Channels } from "./channels/Channels";
import { PlayerBar } from "./player/PlayerBar";

const Description = lazy(() =>
	import("./description/Description").then((module) => ({
		default: module.Description,
	})),
);

const App: Component = () => {
	const radios = useRadiosState();
	const schedule = useScheduleState();
	const nowPlaying = useNowPlayingState();
	const listeners = useListenersState();
	const channelStates = useChannelStates(
		schedule,
		radios,
		nowPlaying,
		listeners,
	);
	const wappu = useWappuState();

	const isOffSeason = createMemo(() => {
		if (wappu() === WappuState.Wappu) {
			return false;
		}

		const states = channelStates();
		return (
			states.length > 0 && states.every((s) => s.nextPrograms.length === 0)
		);
	});

	const [selectedChannelId, setSelectedChannelId] = createSignal<string | null>(
		null,
	);
	const [selectedProgram, setSelectedProgram] =
		createSignal<ProgramInfo | null>(null);
	const [isPlaying, setIsPlaying] = createSignal(false);

	const selectedAndPlaying = createMemo(() => {
		const channelId = selectedChannelId();
		return isPlaying() ? channelId : null;
	});
	// We're passing this to createEffect in the function, so this is a false alarm
	// (could still be refactored instead of ignored but I'll leave that as an exercise for the reader)
	// eslint-disable-next-line solid/reactivity
	useChangeChannelEffect(selectedAndPlaying);

	const radioState = createMemo((): RadioState | undefined => {
		if (selectedChannelId() === null) {
			return undefined;
		}

		const radio = channelStates().find(
			(station) => station.radio.id === selectedChannelId(),
		);

		if (!radio) {
			// TODO: Auto-deselect channel in this case?
			// Probably can't be done inside memo, needs an effect
			console.warn(
				`Selected channel ID ${selectedChannelId()} not found in nowPlaying data`,
			);

			return undefined;
		}

		return {
			...radio,
			isPlaying: isPlaying(),
		};
	});

	const nonModalElementsInert = () => selectedProgram() !== null;

	return (
		<div class={classes.app}>
			<Header inert={nonModalElementsInert} wappu={wappu} />
			<main>
				<Show when={!isOffSeason()} fallback={<OffSeasonCountdown />}>
					<div
						classList={{
							[classes.content]: true,
							[classes.dimmedContent]: !!selectedProgram(),
						}}
						inert={nonModalElementsInert()}
					>
						<Channels
							channelState={channelStates}
							isPlaying={isPlaying}
							setIsPlaying={setIsPlaying}
							selectedChannelId={selectedChannelId}
							setSelectedChannelId={setSelectedChannelId}
							setSelectedProgram={setSelectedProgram}
						/>
					</div>
					<Show when={selectedProgram()}>
						{(selected) => (
							<Suspense fallback={null}>
								<Description
									programInfo={selected()}
									setSelectedProgram={setSelectedProgram}
								/>
							</Suspense>
						)}
					</Show>
					<PlayerBar radioState={radioState} setIsPlaying={setIsPlaying} />
				</Show>
			</main>
		</div>
	);
};

function OffSeasonCountdown() {
	const daysUntilWappu = useMaydayCountdownState();
	const rainbowIntensity = createMemo(() =>
		Math.max(0, Math.min(1, (100 - daysUntilWappu()) / 100)),
	);

	return (
		<div class={classes.offSeasonWrapper}>
			<div
				class={classes.offSeasonCountdown}
				style={{ "--rainbow-intensity": rainbowIntensity() }}
			>
				<span class={classes.countdownNumber}>{daysUntilWappu()}</span>
				<span class={classes.countdownLabel}>
					{daysUntilWappu() === 1 ? "päivä" : "päivää"} Wappuun
				</span>
				<p class={classes.offSeasonMessage}>Wappregator palaa pian...</p>
			</div>
		</div>
	);
}

interface HeaderProps {
	inert: Accessor<boolean>;
	wappu: Accessor<WappuState>;
}

function Header(props: HeaderProps) {
	const funnySlogan =
		funnySlogansHaha[Math.floor(Math.random() * funnySlogansHaha.length)];

	const wappuImgs = ["/champagne.gif", "/partyblower.gif"];
	const logo = createMemo(() => {
		if (props.wappu() === WappuState.Wappu) {
			return wappuImgs[Math.floor(Math.random() * wappuImgs.length)];
		}
		return "/appicon.png";
	});

	return (
		<header inert={props.inert()}>
			<div class={classes.headerLogo}>
				<h1>
					Wappregat<small>.</small>or<small>g</small>
				</h1>
				<img src={logo()} alt="" width={64} height={64} />
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
				<a
					class={classes.headerLink}
					href="mailto:webmaster@wappregat.org"
					title="Lähetä sähköpostia (boomer)"
				>
					<IconMail height={24} />
				</a>
			</div>
		</header>
	);
}

const AppWithSocket: Component = () => {
	return (
		<SocketProvider>
			<App />
		</SocketProvider>
	);
};

export default AppWithSocket;
