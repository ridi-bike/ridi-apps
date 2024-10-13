import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router.ts";
import { createClient } from "jsr:@supabase/supabase-js";

Deno.serve((request) => {
	// Only used for start-server-and-test package that
	// expects a 200 OK to start testing the server
	try {
		console.log("req", request);
		if (request.method === "HEAD") {
			return new Response();
		}
		console.log("about to check auth");
		const authHeader = request.headers.get("Authorization");
		if (!authHeader) {
			console.error("missing auth in req");
			return new Response("missing auth in req", {
				status: 500,
			});
		}

		console.log("auth ok");

		const supabaseClient = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_ANON_KEY") ?? "",
			{
				global: { headers: { Authorization: authHeader } },
			},
		);

		console.log("supabase client ok");

		console.log({ appRouter });
		console.log({ procs: appRouter._def.procedures });
		return fetchRequestHandler({
			endpoint: "/trpc",
			req: request,
			router: appRouter,
			onError: (err) => console.error(err.error),
			createContext: () => ({
				supabaseClient,
				user: supabaseClient.auth.getUser(),
			}),
		});
	} catch (err) {
		console.error(err);
		return new Response("failed omg", {
			status: 500,
		});
	}
});
