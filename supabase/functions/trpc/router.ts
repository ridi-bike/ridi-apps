import { initTRPC, TRPCError } from "@trpc/server";
import {
	maxValue,
	minValue,
	number,
	object,
	optional,
	parser,
	pipe,
	string,
} from "valibot";
import type { Context } from "./context.ts";

const t = initTRPC.context<Context>().create();

const anonProcedure = t.procedure;
const userProcedure = anonProcedure.use(({ ctx, next }) => {
	if (!ctx.user) {
		throw new TRPCError({ code: "UNAUTHORIZED", message: "User data missing" });
	}

	return next({
		ctx: {
			user: ctx.user,
		},
	});
});

const router = t.router;

const tracksRouter = router({
	list: userProcedure.query(async ({ ctx }) => {
		const result = await ctx.supabaseClient
			.from("tracks")
			.select("*")
			.order("created_at", {
				ascending: false,
			});
		if (result.error) {
			throw result.error;
		}
		return result.data;
	}),
});

const trackRequestsRouter = router({
	list: userProcedure.query(async ({ ctx }) => {
		const result = await ctx.supabaseClient
			.from("track_requests")
			.select("*")
			.order("created_at", {
				ascending: false,
			});
		if (result.error) {
			throw result.error;
		}
		return result.data;
	}),
	create: userProcedure
		.input(
			parser(
				object({
					from_lat: pipe(number(), minValue(-90), maxValue(90)),
					from_lon: pipe(number(), minValue(-180), maxValue(180)),
					to_lat: pipe(number(), minValue(-90), maxValue(90)),
					to_lon: pipe(number(), minValue(-180), maxValue(180)),
					name: optional(string()),
				}),
			),
		)
		.mutation(
			async ({ ctx, input: { name, from_lat, to_lon, from_lon, to_lat } }) => {
				const result = await ctx.supabaseClient
					.from("track_requests")
					.insert({
						user_id: ctx.user.id,
						from_lat,
						from_lon,
						to_lat,
						to_lon,
						name: name || `req ${new Date().getTime()}`,
					})
					.select("*");

				if (result.error) {
					throw result.error;
				}
				const row = result.data[0];
				if (!row) {
					throw new Error("omg");
				}
				return row;
			},
		),
});

export const appRouter = router({
	tracks: tracksRouter,
	trackRequests: trackRequestsRouter,
});

export type AppRouter = typeof appRouter;
