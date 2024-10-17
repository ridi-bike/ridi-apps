import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router.ts";
import { createContext } from "./context.ts";

Deno.serve((request) => {
	// Only used for start-server-and-test package that
	// expects a 200 OK to start testing the server
	try {
		if (request.method === "HEAD") {
			return new Response();
		}

		return fetchRequestHandler({
			endpoint: "/trpc",
			req: request,
			router: appRouter,
			onError: (err) => console.error(err.error),
			createContext,
		});
	} catch (err) {
		console.error(err);
		return new Response("failed omg", {
			status: 500,
		});
	}
});
