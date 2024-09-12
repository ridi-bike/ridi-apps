import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import type { AppRouter } from "../../../web/src/server/api/root";
import { getEnvVariables } from "../env-vars";
import { isLocalDev } from "../env";

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
      // url: getEnvVariables().RIDI_API_URL,
      url: "https://b366-212-3-199-40.ngrok-free.app/api/trpc",
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
