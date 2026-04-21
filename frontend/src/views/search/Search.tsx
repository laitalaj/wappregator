import { debounce } from "@solid-primitives/scheduled";
import { IconSearch } from "@tabler/icons-solidjs";
import { type DocumentData, Document as SearchIndex } from "flexsearch";
import {
	type Accessor,
	createEffect,
	createMemo,
	createResource,
	createSignal,
	type Setter,
} from "solid-js";

import type { ProgramInfo, Radios } from "../../types";
import { RadioFilter } from "./RadioFilter";

import classes from "./Search.module.css";

export interface ProgramInfoWithId extends ProgramInfo {
	id: string;
}

const createIndex = async (programInfos: ProgramInfoWithId[]) => {
	const idx = new SearchIndex({
		tokenize: "bidirectional",
		document: {
			id: "id",
			store: true,
			index: [
				"program:title",
				"program:description",
				"program:genre",
				"program:host",
				"program:producer",
			],
			tag: "radio:id",
		},
	});
	for (const doc of programInfos) {
		await idx.addAsync(doc as unknown as DocumentData);
	}
	return idx;
};

interface SearchProps {
	schedule: Accessor<ProgramInfoWithId[]>;
	radios: Accessor<Radios | undefined>;
	setActive: Setter<boolean>;
	setInProgress: Setter<boolean>;
	setResults: Setter<ProgramInfoWithId[]>;
	favouritesOnly: Accessor<boolean>;
	setFavouritesOnly: Setter<boolean>;
}

export function Search(props: SearchProps) {
	// eslint-disable-next-line solid/reactivity
	const [index] = createResource(props.schedule, createIndex); // (false positive)

	const [searchQuery, setSearchQuery] = createSignal("");
	const [selectedRadioIds, setSelectedRadioIds] = createSignal<Set<string>>(new Set());

	const radioOptions = createMemo(() => {
		const radiosData = props.radios();
		if (!radiosData) return [];
		return Object.values(radiosData).sort((a, b) => a.name.localeCompare(b.name));
	});

	const doSearch = createMemo(() => {
		const idx = index() as any;
		if (!idx) return () => {};

		const innerFn = async (query: string, radioIds: string[]) => {
			const tagOptions = radioIds.length > 0 ? { tag: { "radio:id": radioIds } } : {};
			let res: ProgramInfoWithId[];
			if (query) {
				res = (
					await idx.searchAsync(query, {
						...tagOptions,
						merge: true,
						enrich: true,
						suggest: true,
						limit: Infinity,
					})
				).map((r: { doc: ProgramInfoWithId }) => r.doc as ProgramInfoWithId);
			} else {
				res = (
					await idx.searchAsync({
						...tagOptions,
						merge: true,
						enrich: true,
						limit: Infinity,
					})
				)
					.flatMap((r: { result: { doc: ProgramInfoWithId }[] }) => r.result)
					.map((r: { doc: ProgramInfoWithId }) => r.doc);
			}

			props.setResults(res);
			props.setInProgress(false);
		};

		return debounce(innerFn, 300);
	});

	createEffect(() => {
		const query = searchQuery().trim();
		const radioIds = [...selectedRadioIds()];
		if (!query && radioIds.length === 0) {
			props.setActive(false);
			props.setResults([]);
			return;
		}
		props.setInProgress(true);
		props.setActive(true);
		doSearch()(query, radioIds);
	});

	return (
		<div class={classes.searchContainer}>
			<div class={classes.searchBar}>
				<div class={classes.searchInputWrapper}>
					<input
						class={classes.searchInput}
						type="text"
						placeholder="Hae ohjelmia..."
						value={searchQuery()}
						onInput={(e) => setSearchQuery(e.currentTarget.value)}
						aria-label="Hae ohjelmia"
					/>
					<IconSearch class={classes.inputIcon} size={20} role="presentation" />
				</div>
				<RadioFilter
					radios={radioOptions}
					selectedIds={selectedRadioIds}
					onChange={setSelectedRadioIds}
					favouritesOnly={props.favouritesOnly}
					onToggleFavourites={() => props.setFavouritesOnly(!props.favouritesOnly())}
				/>
			</div>
		</div>
	);
}
