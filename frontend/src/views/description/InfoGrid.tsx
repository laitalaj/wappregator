import { type Component, Show } from "solid-js";
import type { Program } from "../../types";
import classes from "./InfoGrid.module.css";

interface Props {
	program: Program;
}

const InfoItem: Component<{ label: string; value: string }> = (props) => (
	<div class={classes.infoItem}>
		<span class={classes.label}>{props.label}:</span>
		<span class={classes.value}>{props.value}</span>
	</div>
);

export const InfoGrid: Component<Props> = (props) => (
	<Show
		when={props.program.genre || props.program.host || props.program.producer}
	>
		<div class={classes.infoGrid}>
			<Show when={props.program.genre}>
				{(genre) => <InfoItem label="Genre" value={genre()} />}
			</Show>

			<Show when={props.program.host}>
				{(host) => <InfoItem label="Host" value={host()} />}
			</Show>

			<Show when={props.program.producer}>
				{(producer) => <InfoItem label="Producer" value={producer()} />}
			</Show>
		</div>
	</Show>
);
