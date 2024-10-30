import { initTRPC, TRPCError } from "@trpc/server";
import {
	array,
	isoTimestamp,
	literal,
	maxValue,
	minValue,
	number,
	object,
	optional,
	parser,
	pipe,
	string,
	transform,
	union,
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

const routeRouter = router({
	get: userProcedure
		.input(
			parser(
				variant("version", [
					object({
						version: literal("v1"),
						data: object({ routeId: string() }),
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
							name: string(),
							created_at: pipe(
								string(),
								transform((v) => `${v}Z`),
								isoTimestamp(),
							),
							plan: object({
								id: string(),
								name: string(),
								from_lat: number(),
								from_lon: number(),
								to_lat: number(),
								to_lon: number(),
								state: union([
									literal("new"),
									literal("planning"),
									literal("done"),
								]),
								created_at: pipe(
									string(),
									transform((v) => `${v}Z`),
									isoTimestamp(),
								),
							}),
						}),
					}),
				]),
			),
		)
		.query(
			async ({
				ctx,
				input: {
					version,
					data: { routeId },
				},
			}) => {
				if (version !== "v1") {
					throw new Error("wrong version");
				}
				const routeRes = await ctx.supabaseClient
					.from("routes")
					.select(`
						id,
						name,
						created_at,
						plans (
							id,
							name,
							from_lat,
							from_lon,
							to_lat,
							to_lon,
							state,
							created_at	
						)
					`)
					.filter("routes.user_id", "eq", ctx.user.id)
					.filter("routes.id", "eq", routeId)
					.order("created_at", {
						ascending: false,
					})
					.single();
				if (routeRes.error) {
					throw routeRes.error;
				}
				const route = routeRes.data;
				if (!route.plans) {
					throw new Error("missing plan");
				}
				const plan = route.plans;
				return {
					version: "v1",
					data: { ...route, plan },
				};
			},
		),
});

const planRouter = router({
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
								name: string(),
								from_lat: number(),
								from_lon: number(),
								to_lat: number(),
								to_lon: number(),
								state: union([
									literal("new"),
									literal("planning"),
									literal("done"),
								]),
								created_at: pipe(
									string(),
									transform((v) => `${v}Z`),
									isoTimestamp(),
								),
								routes: array(
									object({
										id: string(),
										name: string(),
										created_at: pipe(
											string(),
											transform((v) => `${v}Z`),
											isoTimestamp(),
										),
									}),
								),
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
			const plans = await ctx.supabaseClient
				.from("plans")
				.select(`
					id,
					name,
					from_lat,
					from_lon,
					to_lat,
					to_lon,
					state,
					created_at,
					routes (
						id,
						name,
						created_at	
					)
				`)
				.filter("user_id", "eq", ctx.user.id)
				.order("created_at", {
					ascending: false,
				});
			if (plans.error) {
				throw plans.error;
			}
			console.log(plans.data);
			return {
				version: "v1",
				data: plans.data,
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
							id: string(),
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
					data: { id, name, from_lat, to_lon, from_lon, to_lat },
				},
			}) => {
				console.log("new plan", name);
				if (version !== "v1") {
					throw new Error("wrong version");
				}
				const result = await ctx.supabaseClient
					.from("plans")
					.insert({
						user_id: ctx.user.id,
						from_lat,
						from_lon,
						to_lat,
						to_lon,
						name: name || `req ${new Date().getTime()}`,
						id,
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
	plans: planRouter,
	routes: routeRouter,
});

export type AppRouter = typeof appRouter;
