import { A, Route, Router, useMatch } from "@solidjs/router";
import { IconBrandGithubFilled, IconBrandTelegram, IconMail } from "@tabler/icons-solidjs";
import {
	type Component,
	Switch,
	Match,
	Show,
	createMemo,
	ErrorBoundary,
	lazy,
	type ParentComponent,
	type ParentProps,
} from "solid-js";

import { funnySlogansHaha } from "../funnySlogansHaha";
import { SocketProvider, WappuState, useOffSeasonState } from "../state";
import { OffSeasonCountdown, RibbonCountdown } from "./countdown/Countdown";
import { LayoutStateProvider, useLayoutState } from "./layoutState";
import { PlayerBar } from "./player/PlayerBar";
import { PlayerStateProvider, usePlayerState } from "./player/playerState";

import classes from "./App.module.css";

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

const InnestLayout: ParentComponent = (props: ParentProps) => {
	const { channel } = usePlayerState();
	return (
		<>
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
				<Navigation />
				<ErrorBoundary fallback={ErrorFallback}>
					<InnerLayout>{props.children}</InnerLayout>
				</ErrorBoundary>
			</div>
		</LayoutStateProvider>
	);
};

function Header() {
	const { wappu, nonModalElementsInert } = useLayoutState();

	const funnySlogan = funnySlogansHaha[Math.floor(Math.random() * funnySlogansHaha.length)];

	const wappuImgs = ["/champagne.gif", "/partyblower.gif"];
	const logo = createMemo(() => {
		if (wappu() === WappuState.Wappu) {
			return wappuImgs[Math.floor(Math.random() * wappuImgs.length)];
		}
		return "/appicon.png";
	});

	return (
		<header inert={nonModalElementsInert()}>
			<div class={classes.headerTop}>
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
			</div>
		</header>
	);
}

function Navigation() {
	const matchRadio = useMatch(() => "/");
	const matchOpas = useMatch(() => "/opas");

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
			</ul>
		</nav>
	);
}

const Radio = lazy(() => import("./radio/Radio"));

const Guide = lazy(() => import("./guide/Guide"));

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
			<Route path="*" component={NotFound} />
		</Router>
	);
};

export default App;
