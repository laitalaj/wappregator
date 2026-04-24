import { A, Route, Router, useMatch } from "@solidjs/router";
import { IconBrandGithubFilled, IconBrandTelegram, IconMail } from "@tabler/icons-solidjs";
import {
	type Component,
	Switch,
	Match,
	Show,
	createMemo,
	createSignal,
	ErrorBoundary,
	lazy,
	type ParentComponent,
	type ParentProps,
	Suspense,
} from "solid-js";

import { funnySlogansHaha } from "../funnySlogansHaha";
import { SocketProvider, WappuState, useOffSeasonState } from "../state";
import { OffSeasonCountdown, RibbonCountdown } from "./countdown/Countdown";
import { LayoutStateProvider, useLayoutState } from "./layoutState";
import { PlayerBar } from "./player/PlayerBar";
import { PlayerStateProvider, usePlayerState } from "./player/playerState";
import { SettingsButton } from "./settings/Settings";

import classes from "./App.module.css";
import commonClasses from "./common/common.module.css";

const ErrorFallback = (err: unknown, reset: () => void) => {
	console.error("ErrorBoundary caught an error:", err);
	return (
		<OffSeasonCountdown
			overrideMessage={
				<span>
					<h2>🚧 Putkirikko! 🚧</h2>
					<br />
					Jotain meni pieleen!
					<br />
					Kokeile päivittää sivu tai{" "}
					<button type="button" onClick={reset}>
						painaa tästä!
					</button>
					<br />
					Jos tämä ei auta, vika on luultavasti meidän päässämme.
					<br />
					Korjaamme ongelman mahdollisimman pian!
					<br />
					Tiedottamiset & tiedustelut Telegrammissa.
				</span>
			}
		/>
	);
};

const Confetti = lazy(() => import("./confetti/Confetti"));

const InnestLayout: ParentComponent = (props: ParentProps) => {
	const { wappu, enableSFX } = useLayoutState();
	const { channel, radios } = usePlayerState();
	const showConfetti = () => wappu() === WappuState.Wappu && enableSFX();
	const colors = createMemo(() => {
		if (!showConfetti()) return [];
		return Object.values(radios() || {})
			.map((radio) => [
				radio.brand.background_color,
				radio.brand.text_color,
				radio.brand.contrast_color,
			])
			.flat()
			.filter((color) => color !== null && color !== undefined);
	});

	return (
		<>
			<Show when={showConfetti()}>
				<Suspense fallback={null}>
					<Confetti colors={colors} />
				</Suspense>
			</Show>
			<main>
				{props.children}
				<PlayerBar />
			</main>
			<Show when={channel() === undefined}>
				<RibbonCountdown />
			</Show>
		</>
	);
};

const InnerLayout: ParentComponent = (props: ParentProps) => {
	const { wappu } = useLayoutState();
	const offSeason = useOffSeasonState();
	const isOffSeason = createMemo(() => {
		if (wappu() === WappuState.Post) return true;
		return offSeason();
	});
	return (
		<Switch fallback={<main />}>
			<Match when={isOffSeason()}>
				<main>
					<OffSeasonCountdown isPostWappu={wappu() === WappuState.Post} />
				</main>
			</Match>
			<Match when={!isOffSeason()}>
				<SocketProvider>
					<PlayerStateProvider>
						<InnestLayout>{props.children}</InnestLayout>
					</PlayerStateProvider>
				</SocketProvider>
			</Match>
		</Switch>
	);
};

const Layout: ParentComponent = (props: ParentProps) => {
	return (
		<LayoutStateProvider>
			<div class={classes.app}>
				<Header />
				<div class={classes.navWrapper}>
					<div aria-hidden="true" class={classes.navSpacer} />
					<Navigation />
					<SettingsButton />
				</div>
				<ErrorBoundary fallback={ErrorFallback}>
					<InnerLayout>{props.children}</InnerLayout>
				</ErrorBoundary>
			</div>
		</LayoutStateProvider>
	);
};

function Header() {
	const { birthday, wappu, nonModalElementsInert, enableSFX } = useLayoutState();

	const [luckyNumber, setLuckyNumber] = createSignal(
		Math.floor(Math.random() * funnySlogansHaha.length),
	);
	const [luckyNumberMulliganed, setLuckyNumberMulliganed] = createSignal(false);
	const mulligan = () => {
		setLuckyNumber(Math.floor(Math.random() * funnySlogansHaha.length));
		setLuckyNumberMulliganed(true);
	};

	const funnySlogan = createMemo(() => {
		if (birthday() !== null && !luckyNumberMulliganed()) {
			return `Paljon onnea Wappregator ${birthday()}v! 🎉`;
		}
		return funnySlogansHaha[luckyNumber()];
	});

	const wappuImgs = ["/champagne.gif", "/partyblower.gif"];
	const logo = createMemo(() => {
		if (enableSFX() && (birthday() !== null || wappu() === WappuState.Wappu)) {
			return wappuImgs[Math.floor(Math.random() * wappuImgs.length)];
		}
		return "/appicon.png";
	});

	return (
		<header inert={nonModalElementsInert()}>
			<div class={classes.headerTop}>
				<div class={classes.headerLogo}>
					<h1
						classList={{ [commonClasses.rainbowText]: wappu() === WappuState.Wappu && enableSFX() }}
					>
						Wappregat<small>.</small>or<small>g</small>
					</h1>
					<img src={logo()} alt="" width={64} height={64} />
				</div>
				{/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions
				(just a dumb easter egg, doesn't need a11y) */}
				<span onClick={mulligan}>{funnySlogan()}</span>
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
			</div>
		</header>
	);
}

function Navigation() {
	const { birthday } = useLayoutState();

	const matchRadio = useMatch(() => "/");
	const matchOpas = useMatch(() => "/opas");
	const matchWanha = useMatch(() => "/wanha");

	return (
		<nav class={classes.mainNavigation} aria-label="Päävalikko">
			<ul>
				<li>
					<A
						href="/"
						activeClass={classes.activeNavigationLink}
						end
						aria-current={matchRadio() ? "page" : undefined}
					>
						Radio
					</A>
				</li>
				<li>
					<A
						href="/opas"
						activeClass={classes.activeNavigationLink}
						aria-current={matchOpas() ? "page" : undefined}
					>
						Ohjelmaopas
					</A>
				</li>
				<Show when={birthday() !== null}>
					<li>
						<A
							href="/wanha"
							activeClass={classes.activeNavigationLink}
							aria-current={matchWanha() ? "page" : undefined}
						>
							Ennen oli paremmin
						</A>
					</li>
				</Show>
			</ul>
		</nav>
	);
}

const Radio = lazy(() => import("./radio/Radio"));

const Guide = lazy(() => import("./guide/Guide"));

const Old = lazy(() => import("./old/Old"));

const NotFound: Component = () => (
	<OffSeasonCountdown
		overrideMessage={
			<span>
				<h1>404</h1>
				<br />
				Sivua ei löytynyt!
				<br />
				<A href="/" class={classes.navigationLink}>
					Palaa etusivulle
				</A>
			</span>
		}
	/>
);

const App: Component = () => {
	return (
		<Router root={Layout}>
			<Route path="/" component={Radio} />
			<Route path="/opas" component={Guide} />
			<Route path="/wanha" component={Old} />
			<Route path="*" component={NotFound} />
		</Router>
	);
};

export default App;
