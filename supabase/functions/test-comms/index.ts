import "jsr:@supabase/functions-js";
import { createSign } from "node:crypto";
import { createClient } from "jsr:@supabase/supabase-js";

Deno.serve(async (req) => {
	const { payload } = await req.json();
	const routerTestUrl = Deno.env.get("RIDI_ROUTER_BASE_URL");
	if (!routerTestUrl) {
		return new Response("missing env variables url", {
			status: 500,
		});
	}
	const authHeader = req.headers.get("Authorization");
	if (!authHeader) {
		return new Response("missing auth in req", {
			status: 500,
		});
	}

	const privateKey = Deno.env.get("RIDI_API_SIGNING_PRIVATE_KEY");
	if (!privateKey) {
		return new Response("missing env variables key", {
			status: 500,
		});
	}

	console.log({ authHeader, routerTestUrl, payload });
	const supabaseClient = createClient(
		Deno.env.get("SUPABASE_URL") ?? "",
		Deno.env.get("SUPABASE_ANON_KEY") ?? "",
		{
			global: { headers: { Authorization: authHeader } },
		},
	);

	const userId = await supabaseClient.auth.getUser();

	console.log({ userId, privateKey, payload });

	const sign = createSign("SHA256");
	sign.write(JSON.stringify({ payload }));
	sign.end();
	const signature = sign.sign(privateKey, "hex");

	console.log({ payload }, signature);

	const res = await fetch(`${routerTestUrl}/test`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"ngrok-skip-browser-warning": "true",
			"x-ridi-signature": signature,
		},
		body: JSON.stringify({ payload }),
	});

	console.log({ s: res.status });

	const respText = await res.text();

	return new Response(
		JSON.stringify({
			respText,
			userId,
		}),
		{
			headers: { "Content-Type": "application/json" },
		},
	);
});
