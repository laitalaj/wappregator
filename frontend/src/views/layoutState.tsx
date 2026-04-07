import { type Accessor, createContext, createSignal, type ParentProps, useContext } from "solid-js";

import { useWappuState, type WappuState } from "../state";

export interface LayoutState {
	wappu: Accessor<WappuState>;
	nonModalElementsInert: Accessor<boolean>;
	setNonModalElementsInert: (inert: boolean) => void;
}

const LayoutStateContext = createContext<LayoutState>();

export function LayoutStateProvider(props: ParentProps) {
	const wappu = useWappuState();
	const [nonModalElementsInert, setNonModalElementsInert] = createSignal(false);

	const state = {
		wappu,
		nonModalElementsInert,
		setNonModalElementsInert,
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
