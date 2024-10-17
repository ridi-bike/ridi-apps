import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types.ts";
import type { fetchRequestHandler } from "@trpc/server/adapters/fetch";

type ContextCreatorParams = Parameters<
	NonNullable<Parameters<typeof fetchRequestHandler>[0]["createContext"]>
>[0];

export const createContext = async ({ req }: ContextCreatorParams) => {
	const supabaseClient = createClient<Database, "public", Database["public"]>(
		Deno.env.get("SUPABASE_URL") ?? "",
		Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
	);

	const authHeader = req.headers.get("Authorization")!;
	const token = authHeader.replace("Bearer ", "");
	const { data } = await supabaseClient.auth.getUser(token);
	const user = data.user;

	if (!user) {
		return new Response("user missing", {
			status: 500,
		});
	}

	return {
		supabaseClient,
		user,
	};
};

export type Context = Awaited<ReturnType<typeof createContext>>;
