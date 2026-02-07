import {
	type Component,
	createMemo,
	onCleanup,
	onMount,
	type Setter,
	Show,
} from "solid-js";
import { formatTimeRange } from "../../timeUtils";
import type { ProgramInfo } from "../../types";
import classes from "./Description.module.css";
import { InfoGrid } from "./InfoGrid";
import { ProgramHeader } from "./ProgramHeader";

interface Props {
	programInfo: ProgramInfo;
	setSelectedProgram: Setter<ProgramInfo | null>;
}

export const Description: Component<Props> = (props) => {
	const timeRange = createMemo(() =>
		formatTimeRange(
			props.programInfo.program.start,
			props.programInfo.program.end,
		),
	);

	const handleClose = () => props.setSelectedProgram(null);

	const handleOverlayClick = (e: MouseEvent) => {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Escape") {
			handleClose();
		}
	};

	onMount(() => {
		document.addEventListener("keydown", handleKeyDown);
	});

	onCleanup(() => {
		document.removeEventListener("keydown", handleKeyDown);
	});

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: click-to-dismiss backdrop
		<div class={classes.overlay} onClick={handleOverlayClick}>
			<dialog
				class={classes.description}
				aria-modal
				aria-label={`Ohjelman tiedot: ${props.programInfo.program.title}`}
			>
				<ProgramHeader
					title={props.programInfo.program.title}
					timeStr={timeRange()}
					photo={props.programInfo.program.photo}
					brandColor={props.programInfo.radio.brand}
					onClose={handleClose}
				/>

				<div class={classes.content}>
					<InfoGrid program={props.programInfo.program} />

					<Show when={props.programInfo.program.description}>
						<p>{props.programInfo.program.description}</p>
					</Show>
				</div>
			</dialog>
		</div>
	);
};
