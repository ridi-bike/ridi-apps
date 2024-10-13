import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { fetchRequestHandler } from "jsr:@trpc/server/adapters/fetch";
import { appRouter } from "./router.ts";
import { createClient } from "jsr:@supabase/supabase-js";

Deno.serve((request) => {
	// Only used for start-server-and-test package that
	// expects a 200 OK to start testing the server
	if (request.method === "HEAD") {
		return new Response();
	}
	const authHeader = request.headers.get("Authorization");
	if (!authHeader) {
		return new Response("missing auth in req", {
			status: 500,
		});
	}

	const supabaseClient = createClient(
		Deno.env.get("SUPABASE_URL") ?? "",
		Deno.env.get("SUPABASE_ANON_KEY") ?? "",
		{
			global: { headers: { Authorization: authHeader } },
		},
	);

	return fetchRequestHandler({
		endpoint: "/trpc",
		req: request,
		router: appRouter,
		createContext: () => ({
			supabaseClient,
			user: supabaseClient.auth.getUser(),
		}),
	});
});
