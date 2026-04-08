import { type Component, createMemo, onCleanup, onMount, type Setter, Show } from "solid-js";

import { formatDate, formatTimeRange } from "../../timeUtils";
import type { ProgramInfo } from "../../types";
import { InfoGrid } from "./InfoGrid";
import { ProgramHeader } from "./ProgramHeader";

import classes from "./ProgramModal.module.css";

interface Props {
	programInfo: ProgramInfo;
	setSelectedProgram: Setter<ProgramInfo | null>;
}

export const ProgramModal: Component<Props> = (props) => {
	const timeStr = createMemo(() => {
		const date = formatDate(props.programInfo.program.start);
		const timeRange = formatTimeRange(
			props.programInfo.program.start,
			props.programInfo.program.end,
		);
		return `${date} @ ${timeRange}`;
	});

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
		// oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- click-to-dismiss backdrop
		<div class={classes.overlay} onClick={handleOverlayClick}>
			<dialog
				class={classes.description}
				aria-modal
				aria-label={`Ohjelman tiedot: ${props.programInfo.program.title}`}
			>
				<ProgramHeader
					radio={props.programInfo.radio.name}
					title={props.programInfo.program.title}
					timeStr={timeStr()}
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
