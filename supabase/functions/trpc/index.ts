import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router.ts";
import { createContext } from "./context.ts";

Deno.serve(async (request) => {
	// Only used for start-server-and-test package that
	// expects a 200 OK to start testing the server
	try {
		if (request.method === "OPTIONS") {
			return new Response("ok", {
				headers: {
					"Access-Control-Allow-Origin": "https://app.ridi.bike",
					"Access-Control-Allow-Credentials": "true",
					"Access-Control-Allow-Headers":
						"authorization, origin, content-type, accept",
					"Access-Control-Request-Method": "GET, POST",
				},
			});
		}
		if (request.method === "HEAD") {
			return new Response();
		}

		const response = await fetchRequestHandler({
			endpoint: "/trpc",
			req: request,
			router: appRouter,
			onError: (err) =>
				console.error(
					err.path,
					err.type,
					err.input,
					err.error,
					err.error.cause,
				),
			createContext,
		});
		response.headers.set(
			"Access-Control-Allow-Origin",
			"https://app.ridi.bike",
		);
		response.headers.set("Access-Control-Allow-Credentials", "true");
		return response;
	} catch (err) {
		console.error(err);
		return new Response("failed omg", {
			status: 500,
		});
	}
});
