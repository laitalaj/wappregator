import { TinyColor } from "@ctrl/tinycolor";
import { debounce } from "@solid-primitives/scheduled";
import { loadBasic } from "@tsparticles/basic";
import { tsParticles, MoveDirection } from "@tsparticles/engine";
import { loadSquareShape } from "@tsparticles/shape-square";
import { loadStarShape } from "@tsparticles/shape-star";
import { loadRollUpdater } from "@tsparticles/updater-roll";
import { loadRotateUpdater } from "@tsparticles/updater-rotate";
import { loadTiltUpdater } from "@tsparticles/updater-tilt";
import { loadWobbleUpdater } from "@tsparticles/updater-wobble";
import { type Accessor, createEffect, createSignal, onCleanup, onMount } from "solid-js";

const CONFETTI_PER_PIXEL = 1 / 20;

const confettiConfig = (count: number, colors: string[]) => ({
	// Basically https://github.com/tsparticles/tsparticles/blob/7140af4ab787dee2b17a21a53e354af56cc6918e/presets/confettiFalling/src/index.ts
	fullScreen: {
		zIndex: 3,
	},
	particles: {
		number: {
			value: count,
		},
		color: {
			value: Array.from(new Set(colors.map((color) => new TinyColor(color).toHexString()))),
		},
		shape: {
			type: ["circle", "square", "star"],
		},
		size: {
			value: { min: 3, max: 6 },
		},
		move: {
			direction: MoveDirection.bottom,
			enable: true,
		},
		rotate: {
			value: {
				min: 0,
				max: 360,
			},
			direction: "random",
			move: true,
			animation: {
				enable: true,
				speed: 60,
			},
		},
		tilt: {
			direction: "random",
			enable: true,
			value: {
				min: 0,
				max: 360,
			},
			animation: {
				enable: true,
				speed: 60,
			},
		},
		roll: {
			darken: {
				enable: true,
				value: 30,
			},
			enlighten: {
				enable: true,
				value: 30,
			},
			enable: true,
			mode: "both",
			speed: {
				min: 15,
				max: 25,
			},
		},
		wobble: {
			distance: 30,
			enable: true,
			move: true,
			speed: {
				min: -15,
				max: 15,
			},
		},
	},
});

interface ConfettiProps {
	colors: Accessor<string[]>;
}

export default function Confetti(props: ConfettiProps) {
	const [init, setInit] = createSignal<boolean | null>(null);
	const [count, setCount] = createSignal(0);

	onMount(() => {
		const handleResize = debounce(() => {
			setCount(Math.ceil(window.innerWidth * CONFETTI_PER_PIXEL));
		}, 100);
		handleResize();

		window.addEventListener("resize", handleResize);

		onCleanup(() => {
			window.removeEventListener("resize", handleResize);
		});
	});

	createEffect(() => {
		if (init()) return;

		setInit(false);
		Promise.all([
			loadBasic(tsParticles),
			loadRotateUpdater(tsParticles),
			loadRollUpdater(tsParticles),
			loadTiltUpdater(tsParticles),
			loadWobbleUpdater(tsParticles),
			loadSquareShape(tsParticles),
			loadStarShape(tsParticles),
		])
			.then(() => {
				setInit(true);
			})
			.catch((err) => {
				console.error("Failed to load confetti:", err);
			});
	});

	createEffect(() => {
		if (!init()) return;
		if (props.colors().length === 0) return;

		tsParticles
			.load({
				id: "confetti",
				options: confettiConfig(count(), props.colors()),
			})
			.catch((err) => {
				console.error("Failed to update confetti:", err);
			});
	});

	return <></>;
}
