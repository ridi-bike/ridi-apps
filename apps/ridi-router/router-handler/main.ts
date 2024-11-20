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
	.channel("plans_routes")
	.on(
		"postgres_changes",
		{
			event: "INSERT",
			schema: "public",
			table: "plans",
		},
		(payload) => {
			const newPlan: Database["public"]["Tables"]["plans"]["Row"] = payload.new;
			console.log("new record", newPlan.id);

			setTimeout(async () => {
				console.log("processing", newPlan.id);
				await supabase
					.from("plans")
					.update({
						state: "planning",
					})
					.eq("id", newPlan.id);
			}, 3000);

			setTimeout(async () => {
				console.log("done", newPlan.id);
				const { data: newRoute } = await supabase
					.from("routes")
					.insert({
						plan_id: newPlan.id,
						user_id: newPlan.user_id,
						name: `planId: ${newPlan.id} route`,
					})
					.select("*")
					.single();

				if (!newRoute) throw new Error("Failed to create route");

				let prevPoint = {
					lat: newPlan.from_lat,
					lon: newPlan.from_lon,
				};

				// Generate route points
				const points: { lat: number; lon: number }[] = [prevPoint];

				const stepSize = 0.0001;

				const isCloseEnough = (n1: number, n2: number) => {
					return Math.abs(n1 - n2) < stepSize;
				};

				const getNextVal = (prevVal: number, add: boolean) => {
					const nextStep = Math.random() * stepSize * 10;
					const nextAddFlip = Math.random() < 0.3;
					const nextAdd = nextAddFlip ? !add : add;
					return nextAdd ? prevVal + nextStep : prevVal - nextStep;
				};

				while (
					!isCloseEnough(prevPoint.lat, newPlan.to_lat) ||
					!isCloseEnough(prevPoint.lon, newPlan.to_lon)
				) {
					const latAdd = prevPoint.lat < newPlan.to_lat;
					const lonAdd = prevPoint.lon < newPlan.to_lon;
					prevPoint = {
						lat: getNextVal(prevPoint.lat, latAdd),
						lon: getNextVal(prevPoint.lon, lonAdd),
					};

					points.push(prevPoint);
				}
				points.push({
					lat: newPlan.to_lat,
					lon: newPlan.to_lon,
				});

				console.log("points count", points.length);

				// Insert points into route_points table
				await supabase.from("route_points").insert(
					points.map(
						(
							point,
							index,
						): Database["public"]["Tables"]["route_points"]["Insert"] => ({
							route_id: newRoute.id,
							user_id: newRoute.user_id,
							lat: point.lat,
							lon: point.lon,
							sequence: index,
						}),
					),
				);

				await supabase
					.from("plans")
					.update({
						state: "done",
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
