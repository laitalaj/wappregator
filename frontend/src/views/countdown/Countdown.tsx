import { createMemo, Show } from "solid-js";
import { useMaydayCountdownState } from "../../state";
import classes from "./Countdown.module.css";

interface MaydayCountdownProps {
	labelGenerator?: (daysUntilWappu: number) => string;
	numberClasses?: string[];
}

function MaydayCountdown(props: MaydayCountdownProps) {
	const daysUntilWappu = useMaydayCountdownState();
	const rainbowIntensity = createMemo(() =>
		Math.max(0, Math.min(1, (100 - daysUntilWappu()) / 100)),
	);
	const numberClass = createMemo(
		() =>
			`${classes.countdownNumber} ${props.numberClasses ? props.numberClasses.join(" ") : ""}`,
	);

	return (
		<>
			<span
				class={numberClass()}
				style={{ "--rainbow-intensity": rainbowIntensity() }}
			>
				{daysUntilWappu()}
			</span>
			<Show when={props.labelGenerator !== undefined}>
				<span
					class={classes.countdownLabel}
					style={{ "--rainbow-intensity": rainbowIntensity() }}
				>
					{props.labelGenerator?.(daysUntilWappu())}
				</span>
			</Show>
		</>
	);
}

interface OffSeasonCountdownProps {
	isPostWappu?: boolean;
}

export function OffSeasonCountdown(props: OffSeasonCountdownProps) {
	return (
		<div class={classes.offSeasonWrapper}>
			<div class={classes.offSeasonCountdown}>
				<MaydayCountdown
					labelGenerator={(daysUntilWappu) =>
						`${daysUntilWappu === 1 ? "päivä" : "päivää"} Wappuun`
					}
				/>
				<p class={classes.offSeasonMessage}>
					{props.isPostWappu
						? "Kiitos kuuntelusta! Nähdään ensi Wappuna!"
						: "Wappregator palaa pian..."}
				</p>
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
