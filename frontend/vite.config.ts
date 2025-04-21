import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
	plugins: [solidPlugin()],
	server: {
		port: 3000,
		cors: true,
	},
	publicDir: "public",
	build: {
		target: "esnext",
	},
	resolve: {
		preserveSymlinks: true,
	},
});
