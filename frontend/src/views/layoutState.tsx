import {
	type Accessor,
	createContext,
	createEffect,
	createSignal,
	type ParentProps,
	useContext,
} from "solid-js";

import { useBirthdayState, useWappuState, type WappuState } from "../state";

const FAVOURITES_STORAGE_KEY = "wappregator.favourites";
const AUTO_SWITCH_TO_FAVOURITE_STORAGE_KEY = "wappregator.autoSwitchToFavourite";

export interface LayoutState {
	birthday: Accessor<number | null>;
	wappu: Accessor<WappuState>;
	nonModalElementsInert: Accessor<boolean>;
	setNonModalElementsInert: (inert: boolean) => void;
	favourites: Accessor<Set<string>>;
	toggleFavourite: (key: string) => void;
	isFavourite: (key: string) => boolean;
	autoSwitchToFavourite: Accessor<boolean>;
	setAutoSwitchToFavourite: (value: boolean) => void;
}

const LayoutStateContext = createContext<LayoutState>();

function loadFavourites(): Set<string> {
	try {
		const raw = localStorage.getItem(FAVOURITES_STORAGE_KEY);
		if (!raw) return new Set();
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return new Set();
		return new Set(parsed.filter((item): item is string => typeof item === "string"));
	} catch {
		return new Set();
	}
}

function persistFavourites(favourites: Set<string>): void {
	try {
		localStorage.setItem(FAVOURITES_STORAGE_KEY, JSON.stringify([...favourites]));
	} catch {
		// Storage may be unavailable (private mode, disabled); keep in-memory state only.
	}
}

function loadAutoSwitchToFavourite(): boolean {
	try {
		const raw = localStorage.getItem(AUTO_SWITCH_TO_FAVOURITE_STORAGE_KEY);
		return raw === "1";
	} catch {
		return true;
	}
}

function persistAutoSwitchToFavourite(value: boolean): void {
	try {
		localStorage.setItem(AUTO_SWITCH_TO_FAVOURITE_STORAGE_KEY, value ? "1" : "0");
	} catch {
		// Storage may be unavailable (private mode, disabled); keep in-memory state only.
	}
}

export function LayoutStateProvider(props: ParentProps) {
	const birthday = useBirthdayState();
	const wappu = useWappuState();
	const [nonModalElementsInert, setNonModalElementsInert] = createSignal(false);
	const [favourites, setFavourites] = createSignal<Set<string>>(loadFavourites());
	const [autoSwitchToFavourite, setAutoSwitchToFavourite] = createSignal(
		loadAutoSwitchToFavourite(),
	);

	createEffect(() => {
		persistFavourites(favourites());
	});

	createEffect(() => {
		persistAutoSwitchToFavourite(autoSwitchToFavourite());
	});

	const toggleFavourite = (key: string) => {
		const next = new Set(favourites());
		if (next.has(key)) {
			next.delete(key);
		} else {
			next.add(key);
		}
		setFavourites(next);
	};

	const isFavourite = (key: string) => favourites().has(key);

	const state = {
		birthday,
		wappu,
		nonModalElementsInert,
		setNonModalElementsInert,
		favourites,
		toggleFavourite,
		isFavourite,
		autoSwitchToFavourite,
		setAutoSwitchToFavourite,
	};

	return <LayoutStateContext.Provider value={state}>{props.children}</LayoutStateContext.Provider>;
}

export function useLayoutState(): LayoutState {
	const context = useContext(LayoutStateContext);
	if (!context) {
		throw new Error("useLayoutState must be used within a LayoutStateProvider");
	}
	return context;
}
