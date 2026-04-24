import { IconSettings, IconX } from "@tabler/icons-solidjs";
import { type Accessor, type Setter, createSignal, onCleanup, onMount, Show } from "solid-js";

import { useLayoutState } from "../layoutState";

import commonClasses from "../common/common.module.css";
import classes from "./Settings.module.css";

export function SettingsButton() {
	const [open, setOpen] = createSignal(false);
	let wrapperRef: HTMLDivElement;

	const handlePointerDown = (e: PointerEvent) => {
		if (open() && !wrapperRef.contains(e.target as Node)) {
			setOpen(false);
		}
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Escape" && open()) {
			setOpen(false);
		}
	};

	onMount(() => {
		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
	});

	onCleanup(() => {
		document.removeEventListener("pointerdown", handlePointerDown);
		document.removeEventListener("keydown", handleKeyDown);
	});

	return (
		<div ref={(el) => (wrapperRef = el)} class={classes.settingsWrapper}>
			<button
				type="button"
				class={commonClasses.iconButton}
				onClick={() => setOpen((prev) => !prev)}
				title="Asetukset"
				aria-expanded={open()}
			>
				<IconSettings size={20} role="presentation" />
			</button>
			<Show when={open()}>
				<SettingsPanel onClose={() => setOpen(false)} />
			</Show>
		</div>
	);
}

interface SettingProps {
	label: string;
	checked: Accessor<boolean>;
	onChange: Setter<boolean>;
}

function Setting(props: SettingProps) {
	return (
		<label class={classes.settingRow}>
			<span class={classes.settingLabel}>{props.label}</span>
			<span class={classes.toggleSwitch}>
				<input
					type="checkbox"
					class={classes.toggleCheckbox}
					checked={props.checked()}
					onChange={(e) => props.onChange(e.currentTarget.checked)}
				/>
				<span class={classes.toggle} aria-hidden="true" />
			</span>
		</label>
	);
}

function SettingsPanel(props: { onClose: () => void }) {
	const { autoSwitchToFavourite, setAutoSwitchToFavourite, enableSFX, setEnableSFX } =
		useLayoutState();

	return (
		<div class={classes.settingsPanel} role="dialog" aria-label="Asetukset">
			<div class={classes.panelHeader}>
				<h2>Asetukset</h2>
				<button
					type="button"
					class={commonClasses.iconButton}
					onClick={() => props.onClose()}
					title="Sulje"
				>
					<IconX size={18} role="presentation" />
				</button>
			</div>
			<Setting
				label="Vaihda kanavaa automaattisesti suosikkiohjelman alkaessa"
				checked={autoSwitchToFavourite}
				onChange={setAutoSwitchToFavourite}
			/>
			<Setting label="Näytä erikoisefektit" checked={enableSFX} onChange={setEnableSFX} />
		</div>
	);
}
