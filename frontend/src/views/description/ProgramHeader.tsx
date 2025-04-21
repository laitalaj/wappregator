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
	<header
		class={`${classes.header} ${props.photo ? classes.headerWithImage : ""}`}
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
			<h2 class={classes.title} id="program-title">
				{props.title}
			</h2>
			<div class={classes.time}>{props.timeStr}</div>
		</div>
		<button
			type="button"
			class={classes.closeButton}
			onClick={() => props.onClose()}
			title="Close"
			aria-label="Close program description"
		>
			×
		</button>
	</header>
);
