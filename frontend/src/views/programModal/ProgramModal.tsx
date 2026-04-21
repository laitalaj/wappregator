import { IconCalendarPlus, IconCalendarDown } from "@tabler/icons-solidjs";
import { type Component, createMemo, onCleanup, onMount, type Setter, Show } from "solid-js";

import { buildGoogleCalendarUrl } from "../../calendarUtils";
import { encodeProgramKey } from "../../programKey";
import { formatDate, formatTimeRange } from "../../timeUtils";
import type { ProgramInfo } from "../../types";
import { useLayoutState } from "../layoutState";
import { InfoGrid } from "./InfoGrid";
import { ProgramHeader } from "./ProgramHeader";

import classes from "./ProgramModal.module.css";

interface Props {
	programInfo: ProgramInfo;
	setSelectedProgram: Setter<ProgramInfo | null>;
}

export const ProgramModal: Component<Props> = (props) => {
	const { isFavourite, toggleFavourite } = useLayoutState();

	const timeStr = createMemo(() => {
		const date = formatDate(props.programInfo.program.start);
		const timeRange = formatTimeRange(
			props.programInfo.program.start,
			props.programInfo.program.end,
		);
		return `${date} @ ${timeRange}`;
	});

	const programKey = createMemo(() => encodeProgramKey(props.programInfo));
	const favourite = createMemo(() => isFavourite(programKey()));
	const googleCalendarUrl = createMemo(() => buildGoogleCalendarUrl(props.programInfo));

	const handleDownloadIcs = async () => {
		const { buildIcsFile, downloadIcsFile } = await import("../../icsExport");
		downloadIcsFile(buildIcsFile([props.programInfo]), `${programKey()}.ics`);
	};

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
					isFavourite={favourite()}
					onToggleFavourite={() => toggleFavourite(programKey())}
					onClose={handleClose}
				/>

				<div class={classes.content}>
					<InfoGrid program={props.programInfo.program} />

					<Show when={props.programInfo.program.description}>
						<p>{props.programInfo.program.description}</p>
					</Show>

					<div class={classes.exportActions}>
						<a
							class={classes.exportLink}
							href={googleCalendarUrl()}
							target="_blank"
							rel="noopener noreferrer"
						>
							<IconCalendarPlus size={18} role="presentation" />
							Lisää kalenteriin (Google)
						</a>
						<button type="button" class={classes.exportLink} onClick={handleDownloadIcs}>
							<IconCalendarDown size={18} role="presentation" />
							Lisää kalenteriin (.ics)
						</button>
					</div>
				</div>
			</dialog>
		</div>
	);
};
