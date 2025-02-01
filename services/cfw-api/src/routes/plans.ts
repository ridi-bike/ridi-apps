import { z } from "zod";
import { latIn, latOut, lonIn, lonOut, RidiHonoApp } from "./shared";
import { zValidator } from "@hono/zod-validator";
import { planCreate, planList, routesGet } from "../queries_sql";

const planListOutputSchema = z.discriminatedUnion("version", [
  z.object({
    version: z.literal("v1"),
    data: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        fromLat: latOut,
        fromLon: lonOut,
        toLat: latOut,
        toLon: lonOut,
        state: z.enum(["new", "planning", "done", "error"]),
        createdAt: z.date(),
        routes: z.array(
          z.object({
            routeId: z.string(),
            routeName: z.string(),
            routeCreatedAt: z.date(),
          }),
        ),
      }),
    ),
  }),
]);

const planCreateOutputSchema = z.discriminatedUnion("version", [
  z.object({
    version: z.literal("v1"),
    data: z.object({
      id: z.string(),
    }),
  }),
]);

export function addPlanHandlers(app: RidiHonoApp) {
  app.get(
    "/user/plans/all/v/:version",
    zValidator(
      "param",
      z.object({
        version: z.literal("v1"),
      }),
    ),
    async (c) => {
      const { version } = c.req.valid("param");

      if (version !== "v1") {
        throw new Error("wrong version");
      }

      const plansFlat = await planList(c.var.db, {
        userId: c.var.user.id,
      });

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
                })),
              )
            : [],
        })),
      );

      const response = {
        version: "v1",
        data: plans,
      };

      const validated = planListOutputSchema.parse(response);
      return c.json(validated);
    },
  );

  app.post(
    "/user/plans/create",
    zValidator(
      "json",
      z.discriminatedUnion("version", [
        z.object({
          version: z.literal("v1"),
          data: z.object({
            fromLat: latIn,
            fromLon: lonIn,
            toLat: latIn,
            toLon: lonIn,
            name: z.string(),
            id: z.string(),
            createdAt: z.date(),
          }),
        }),
      ]),
    ),
    async (c) => {
      const data = c.req.valid("json");

      if (data.version !== "v1") {
        throw new Error("wrong version");
      }

      const newPlan = await planCreate(c.var.db, {
        ...data.data,
        userId: c.var.user.id,
      });

      if (!newPlan) {
        throw new Error("can't happen");
      }

      await c.var.messaging.send("new-plan", { planId: newPlan.id });

      const response = {
        version: "v1",
        data: newPlan,
      };

      const validated = planCreateOutputSchema.parse(response);
      return c.json(validated);
    },
  );
}
