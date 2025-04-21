import { IconX } from "@tabler/icons-solidjs";
import type { Component } from "solid-js";
import type { Brand } from "../../types";
import { brandColorVariablesStyle } from "../common/brandUtils";
import classes from "./ProgramHeader.module.css";

interface Props {
	title: string;
	timeStr: string;
	photo?: string;
	brandColor: Brand;
	onClose: () => void;
}

export const ProgramHeader: Component<Props> = (props) => (
	<div
		class={classes.header}
		style={brandColorVariablesStyle(props.brandColor)}
	>
		{props.photo && (
			<div
				class={classes.headerBackground}
				style={{ "background-image": `url(${props.photo})` }}
				role="presentation"
			/>
		)}
		<div class={classes.headerContent}>
			<h2 class={classes.title}>{props.title}</h2>
			<div class={classes.time}>{props.timeStr}</div>
		</div>
		<button
			type="button"
			class={classes.closeButton}
			onClick={() => props.onClose()}
			title="Sulje ohjelman tiedot"
		>
			<IconX width={24} height={24} role="presentation" color="currentcolor" />
		</button>
	</div>
);
