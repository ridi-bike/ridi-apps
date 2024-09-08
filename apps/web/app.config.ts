import { defineConfig } from "@solidjs/start/config";
import checker from "vite-plugin-checker";

export default defineConfig({
	vite: {
		plugins: [
			checker({
				biome: true,
				typescript: true,
				overlay: true,
				enableBuild: true,
			}),
		],
	},
});
