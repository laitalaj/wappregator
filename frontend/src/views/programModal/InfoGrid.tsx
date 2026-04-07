import { type Component, Show } from "solid-js";
import type { Program } from "../../types";
import classes from "./InfoGrid.module.css";

interface Props {
	program: Program;
}

const InfoItem: Component<{ label: string; value: string }> = (props) => (
	<div class={classes.infoItem}>
		<dt>{props.label}:</dt>
		<dd>{props.value}</dd>
	</div>
);

export const InfoGrid: Component<Props> = (props) => (
	<Show
		when={props.program.genre || props.program.host || props.program.producer}
	>
		<dl class={classes.infoGrid}>
			<Show when={props.program.genre}>
				{(genre) => <InfoItem label="Lajityyppi" value={genre()} />}
			</Show>

			<Show when={props.program.host}>
				{(host) => <InfoItem label="Juontaja(t)" value={host()} />}
			</Show>

			<Show when={props.program.producer}>
				{(producer) => <InfoItem label="Tuottaja(t)" value={producer()} />}
			</Show>
		</dl>
	</Show>
);
