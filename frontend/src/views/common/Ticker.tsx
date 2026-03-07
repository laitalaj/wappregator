import type { JSX } from "solid-js/jsx-runtime";
import classes from "./Ticker.module.css";
import {
	children,
	createEffect,
	createMemo,
	createSignal,
	onMount,
} from "solid-js";

interface TickerProps {
	children: JSX.Element;
	style?: JSX.CSSProperties;
	/**
	 * Scroll speed, in pixels per second.
	 */
	scrollSpeed: number;
}

export function Ticker(props: TickerProps) {
	const [containerWidth, setContainerWidth] = createSignal(0);
	const [contentWidth, setContentWidth] = createSignal(0);

	const c = children(() => props.children);

	let container: HTMLDivElement | undefined;
	let content: HTMLSpanElement | undefined;

	onMount(() => {
		if (!container || !content) {
			return;
		}

		const containerSizeObserver = new ResizeObserver(() => {
			setContainerWidth(container?.clientWidth || 0);
		});

		const contentSizeObserver = new ResizeObserver(() => {
			setContentWidth(content?.clientWidth || 0);
		});

		containerSizeObserver.observe(container);
		contentSizeObserver.observe(content);
	});

	createEffect(() => {
		console.log("Container width:", containerWidth());
		console.log("Content width:", contentWidth());
	});

	const animationDuration = createMemo(() => {
		if (contentWidth() === 0 || containerWidth() === 0) {
			return 0;
		}

		const distance = contentWidth() + containerWidth();
		const duration = (distance / props.scrollSpeed) * 1000;

		return duration;
	});
	const tickerCloneDelay = createMemo(() => animationDuration() / 2);

	const animationDurationStyle = createMemo((): JSX.CSSProperties => {
		if (animationDuration() === 0) {
			return {};
		}
		return {
			"animation-duration": `${animationDuration()}ms`,
		};
	});

	const tickerCloneDelayStyle = createMemo((): JSX.CSSProperties => {
		if (tickerCloneDelay() === 0) {
			return {};
		}
		return {
			...animationDurationStyle(),
			"animation-delay": `${tickerCloneDelay()}ms`,
		};
	});

	return (
		<div
			class={classes.ticker}
			style={props.style}
			ref={(el: HTMLDivElement) => {
				container = el;
			}}
		>
			<span
				class={classes.tickerContent}
				ref={(el: HTMLSpanElement) => {
					content = el;
				}}
			>
				{c()}
			</span>
			<span
				class={classes.tickerContent}
				style={{}}
				ref={(el: HTMLSpanElement) => {
					content = el;
				}}
			>
				{c()}
			</span>
		</div>
	);
}
