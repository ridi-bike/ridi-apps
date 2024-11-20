const regionListLoc = Deno.env.get("REGION_LIST");

if (!regionListLoc) {
	throw new Error("missing REGION_LIST env var");
}

const regions = JSON.parse(Deno.readTextFileSync(regionListLoc)) as string[];

if (
	!Array.isArray(regions) ||
	regions.length === 0 ||
	typeof regions[0] !== "string"
) {
	throw new Error("region list unexpected shape");
}

Deno.serve({ port: 2727, hostname: "0.0.0.0" }, async (_req) => {
	return new Response("Hello, world");
});
