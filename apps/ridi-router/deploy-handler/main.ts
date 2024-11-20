Deno.serve({ port: 2727, hostname: "0.0.0.0" }, async (_req) => {
	return new Response("Hello, world");
});
