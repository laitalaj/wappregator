import { IconHeart, IconHeartFilled } from "@tabler/icons-solidjs";
import { type Accessor, For } from "solid-js";

import type { Radio } from "../../types";

import classes from "./Search.module.css";

interface RadioFilterProps {
	radios: Accessor<Radio[]>;
	selectedIds: Accessor<Set<string>>;
	onChange: (ids: Set<string>) => void;
	favouritesOnly: Accessor<boolean>;
	onToggleFavourites: () => void;
}

export function RadioFilter(props: RadioFilterProps) {
	const toggle = (id: string) => {
		const next = new Set(props.selectedIds());
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		props.onChange(next);
	};

	return (
		<fieldset class={classes.filterGroup}>
			<legend class={classes.visuallyHidden}>Suodata ohjelmia</legend>
			<div class={classes.filterChips}>
				<button
					type="button"
					class={classes.filterChip}
					data-favourite="true"
					aria-pressed={props.favouritesOnly()}
					onClick={() => props.onToggleFavourites()}
				>
					{props.favouritesOnly() ? (
						<IconHeartFilled size={16} role="presentation" />
					) : (
						<IconHeart size={16} role="presentation" />
					)}
					Omat suosikit
				</button>
				<For each={props.radios()}>
					{(radio) => {
						const pressed = () => props.selectedIds().has(radio.id);
						return (
							<button
								type="button"
								class={classes.filterChip}
								aria-pressed={pressed()}
								style={
									pressed()
										? {
												"background-color": radio.brand.background_color,
												color: radio.brand.text_color,
											}
										: undefined
								}
								onClick={() => toggle(radio.id)}
							>
								{radio.name}
							</button>
						);
					}}
				</For>
			</div>
		</fieldset>
	);
}
