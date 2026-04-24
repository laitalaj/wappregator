import { createMemo, type JSX, Show } from "solid-js";

import { useMaydayCountdownState } from "../../state";
import { useLayoutState } from "../layoutState";

import classes from "./Countdown.module.css";

interface MaydayCountdownProps {
	labelGenerator?: (daysUntilWappu: number) => string;
	numberClasses?: string[];
}

function MaydayCountdown(props: MaydayCountdownProps) {
	const daysUntilWappu = useMaydayCountdownState();
	const { enableSFX } = useLayoutState();
	const rainbowIntensity = createMemo(() =>
		enableSFX() ? Math.max(0, Math.min(1, (100 - daysUntilWappu()) / 100)) : 0,
	);
	const numberClass = createMemo(
		() => `${classes.countdownNumber} ${props.numberClasses ? props.numberClasses.join(" ") : ""}`,
	);

	return (
		<>
			<span class={numberClass()} style={{ "--rainbow-intensity": rainbowIntensity() }}>
				{daysUntilWappu()}
			</span>
			<Show when={props.labelGenerator !== undefined}>
				<span class={classes.countdownLabel} style={{ "--rainbow-intensity": rainbowIntensity() }}>
					{props.labelGenerator?.(daysUntilWappu())}
				</span>
			</Show>
		</>
	);
}

interface OffSeasonCountdownProps {
	isPostWappu?: boolean;
	overrideMessage?: string | JSX.Element;
}

export function OffSeasonCountdown(props: OffSeasonCountdownProps) {
	const message = () =>
		props.overrideMessage
			? props.overrideMessage
			: props.isPostWappu
				? "Kiitos kuuntelusta! Nähdään ensi Wappuna!"
				: "Wappregator palaa pian...";
	return (
		<div class={classes.offSeasonWrapper}>
			<div class={classes.offSeasonCountdown}>
				<MaydayCountdown
					labelGenerator={(daysUntilWappu) =>
						`${daysUntilWappu === 1 ? "päivä" : "päivää"} Wappuun`
					}
				/>
				<p class={classes.offSeasonMessage}>{message()}</p>
			</div>
		</div>
	);
}

export function RibbonCountdown() {
	return (
		<div class={classes.ribbonCountdown}>
			<span class={classes.ribbonLabel}>TJ</span>
			<MaydayCountdown numberClasses={[classes.ribbonNumber]} />
		</div>
	);
}
