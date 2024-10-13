import {
	createClient,
	REALTIME_CHANNEL_STATES,
} from "jsr:@supabase/supabase-js";

const supabase_url = Deno.env.get("SUPABASE_URL");
const supabase_key = Deno.env.get("SUPABASE_SECRET_KEY");

if (!supabase_url || !supabase_key) {
	throw new Error("missing supabase creds");
}
const supabase = createClient(supabase_url, supabase_key);

const channel = supabase
	.channel("realtime_tests")
	.on(
		"postgres_changes",
		{
			event: "INSERT",
			schema: "public",
		},
		(payload) => console.log(payload),
	)
	.subscribe();

console.log(`established connection to ${supabase_url}`);

globalThis.addEventListener("unload", () => {
	channel.unsubscribe();
});

Deno.serve({ port: 2727, hostname: "0.0.0.0" }, (_req) => {
	if (channel.state !== REALTIME_CHANNEL_STATES.joined) {
		return new Response(channel.state, {
			status: 500,
		});
	}
	return new Response("Hello, world");
});
