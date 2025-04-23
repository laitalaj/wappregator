import type { Brand } from "../../types";

export function brandColorVariablesStyle(brand: Brand) {
	return {
		"--bg-color": brand.background_color,
		"--text-color": brand.text_color,
		"--contrast-color": brand.contrast_color ?? brand.text_color,
	};
}
