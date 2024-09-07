import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
	vite: {
		ssr: {
			resolve: {
				// this so we can use server-only and client-only packages from next.js
				externalConditions: ["react-server"],
			},
		},
	},
});
