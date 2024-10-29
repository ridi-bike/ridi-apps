import type { Database } from "../../supabase/functions/trpc/types.ts";
import {
	createClient,
	REALTIME_CHANNEL_STATES,
} from "jsr:@supabase/supabase-js";

const supabase_url = Deno.env.get("SUPABASE_URL");
const supabase_key = Deno.env.get("SUPABASE_SECRET_KEY");

if (!supabase_url || !supabase_key) {
	throw new Error("missing supabase credentials");
}
const supabase = createClient<Database>(supabase_url, supabase_key);

const channel = supabase
	.channel("realtime_tests")
	.on(
		"postgres_changes",
		{
			event: "INSERT",
			schema: "public",
		},
		(payload) => {
			const newPlan: Database["public"]["Tables"]["plans"]["Row"] = payload.new;
			console.log("new record", newPlan.id);

			setTimeout(async () => {
				console.log("processing", newPlan.id);
				await supabase
					.from("plans")
					.update({
						status: "planning",
					})
					.eq("id", newPlan.id);
			}, 3000);

			setTimeout(async () => {
				console.log("done", newPlan.id);
				await supabase
					.from("plans")
					.update({
						status: "created",
					})
					.eq("id", newPlan.id);
			}, 6000);
		},
	)
	.subscribe((args, err) => console.log({ args, err }));

console.log(`established connection to ${supabase_url}`);

globalThis.addEventListener("unload", () => {
	channel.unsubscribe();
});

Deno.serve({ port: 2727, hostname: "0.0.0.0" }, async (_req) => {
	const tests = await supabase.from("plans").select("*");
	console.log({ l: tests.data?.length });
	if (channel.state !== REALTIME_CHANNEL_STATES.joined) {
		return new Response(channel.state, {
			status: 500,
		});
	}
	return new Response("Hello, world");
});
