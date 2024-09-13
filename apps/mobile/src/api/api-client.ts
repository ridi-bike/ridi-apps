import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import type { AppRouter } from "../../../web/src/server/api/root";
import { isLocalDev } from "~/util/env";
import { getEnvVariables } from "~/util/env-vars";

export const apiClient = createTRPCClient<AppRouter>({
	links: [
		loggerLink({
			enabled: () => true,
			// console: console,
			// logger: (input) => {
			//   console.log(input);
			// },
		}),
		httpBatchLink({
			url: getEnvVariables().RIDI_API_URL,
			async headers() {
				console.log("getting headers");
				const headers: Record<string, string> = {};
				if (isLocalDev()) {
					headers["ngrok-skip-browser-warning"] = "true";
				}
				return headers;
			},
		}),
	],
});
