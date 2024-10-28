import { initTRPC, TRPCError } from "@trpc/server";
import {
	array,
	literal,
	maxValue,
	minValue,
	number,
	object,
	optional,
	parser,
	pipe,
	string,
	variant,
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
	list: userProcedure
		.input(parser(variant("version", [object({ version: literal("v1") })])))
		.output(
			parser(
				variant("version", [
					object({
						version: literal("v1"),
						data: array(
							object({
								id: string(),
							}),
						),
					}),
				]),
			),
		)
		.query(async ({ ctx, input: { version } }) => {
			if (version !== "v1") {
				throw new Error("wrong version");
			}
			const result = await ctx.supabaseClient
				.from("tracks")
				.select("*")
				.filter("user_id", "eq", ctx.user.id)
				.order("created_at", {
					ascending: false,
				});
			if (result.error) {
				throw result.error;
			}
			return { version: "v1", data: result.data };
		}),
});

const trackRequestsRouter = router({
	list: userProcedure
		.input(parser(variant("version", [object({ version: literal("v1") })])))
		.output(
			parser(
				variant("version", [
					object({
						version: literal("v1"),
						data: array(
							object({
								id: string(),
							}),
						),
					}),
				]),
			),
		)
		.query(async ({ ctx, input: { version } }) => {
			if (version !== "v1") {
				throw new Error("wrong version");
			}
			const result = await ctx.supabaseClient
				.from("track_requests")
				.select("*")
				.filter("user_id", "eq", ctx.user.id)
				.order("created_at", {
					ascending: false,
				});
			if (result.error) {
				throw result.error;
			}
			return {
				version: "v1",
				data: result.data,
			};
		}),
	create: userProcedure
		.input(
			parser(
				variant("version", [
					object({
						version: literal("v1"),
						data: object({
							from_lat: pipe(number(), minValue(-90), maxValue(90)),
							from_lon: pipe(number(), minValue(-180), maxValue(180)),
							to_lat: pipe(number(), minValue(-90), maxValue(90)),
							to_lon: pipe(number(), minValue(-180), maxValue(180)),
							name: optional(string()),
						}),
					}),
				]),
			),
		)
		.output(
			parser(
				variant("version", [
					object({
						version: literal("v1"),
						data: object({
							id: string(),
						}),
					}),
				]),
			),
		)
		.mutation(
			async ({
				ctx,
				input: {
					version,
					data: { name, from_lat, to_lon, from_lon, to_lat },
				},
			}) => {
				if (version !== "v1") {
					throw new Error("wrong version");
				}
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
				return {
					version: "v1",
					data: row,
				};
			},
		),
});

export const appRouter = router({
	tracks: tracksRouter,
	trackRequests: trackRequestsRouter,
});

export type AppRouter = typeof appRouter;
