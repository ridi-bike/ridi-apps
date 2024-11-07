import { initTRPC, TRPCError } from "@trpc/server";
import {
	array,
	date,
	literal,
	object,
	parser,
	string,
	union,
	variant,
} from "valibot";
import type { Context } from "./context.ts";
import { planCreate, planList, routesGet } from "./queries_sql.ts";
import { type FieldsNotNull, lat, lon, numberStr } from "./util.ts";
import * as R from "remeda";
import superjson from "superjson";

const t = initTRPC.context<Context>().create({
	transformer: superjson,
});

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
							createdAt: date(),
							plan: object({
								planId: string(),
								planName: string(),
								planState: union([
									literal("new"),
									literal("planning"),
									literal("done"),
								]),
							}),
							points: array(
								object({
									pointLat: lat,
									pointLon: lon,
									pointSequence: numberStr,
								}),
							),
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
				const routesFlat = await routesGet(ctx.db, {
					id: routeId,
					userId: ctx.user.id,
				});
				console.log("routes get", routesFlat);
				if (!routesFlat.length) {
					throw new Error("not found");
				}
				return {
					version: "v1",
					data: {
						...routesFlat[0],
						plan: {
							...routesFlat[0],
						},
						points: routesFlat[0].pointId
							? (routesFlat as FieldsNotNull<(typeof routesFlat)[number]>[])
							: [],
					},
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
								fromLat: lat,
								fromLon: lon,
								toLat: lat,
								toLon: lon,
								state: union([
									literal("new"),
									literal("planning"),
									literal("done"),
								]),
								createdAt: date(),
								routes: array(
									object({
										routeId: string(),
										routeName: string(),
										routeCreatedAt: date(),
										points: array(
											object({
												pointLat: lat,
												pointLon: lon,
												pointSequence: numberStr,
											}),
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
			const plansFlat = await planList(ctx.db, {
				userId: ctx.user.id,
			});
			console.log("plans list", plansFlat);
			const plans = R.pipe(
				plansFlat,
				R.groupBy(R.prop("id")),
				R.entries(),
				R.map(([_planId, onePlanFlat]) => ({
					...R.first(onePlanFlat),
					routes: R.first(onePlanFlat).routeId
						? R.pipe(
							onePlanFlat as FieldsNotNull<(typeof onePlanFlat)[number]>[],
							R.groupBy(R.prop("routeId")),
							R.entries(),
							R.map(([_routeId, oneRouteFlat]) => ({
								...R.first(oneRouteFlat),
								points: R.first(onePlanFlat)?.pointId
									? (onePlanFlat as FieldsNotNull<
										(typeof onePlanFlat)[number]
									>[])
									: ([] as FieldsNotNull<(typeof onePlanFlat)[number]>[]),
							})),
						)
						: [],
				})),
			);
			return {
				version: "v1",
				data: plans,
			};
		}),
	create: userProcedure
		.input(
			parser(
				variant("version", [
					object({
						version: literal("v1"),
						data: object({
							fromLat: lat,
							fromLon: lon,
							toLat: lat,
							toLon: lon,
							name: string(),
							id: string(),
							createdAt: date(),
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
		.mutation(async ({ ctx, input: { version, data } }) => {
			console.log("new plan", data);
			if (version !== "v1") {
				throw new Error("wrong version");
			}
			const newPlan = await planCreate(ctx.db, {
				...data,
				userId: ctx.user.id,
			});
			if (!newPlan) {
				throw new Error("can't happen");
			}
			return {
				version: "v1",
				data: newPlan,
			};
		}),
});

export const appRouter = router({
	plans: planRouter,
	routes: routeRouter,
});

export type AppRouter = typeof appRouter;
