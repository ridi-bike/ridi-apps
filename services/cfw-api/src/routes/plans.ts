import { createRoute, z } from "@hono/zod-openapi";
import { Schema } from "hono";
import * as R from "remeda";
import {
  FieldsNotNull,
  latIn,
  latOut,
  lonIn,
  lonOut,
  RidiHonoApp,
} from "./shared";
import { planCreate, planList } from "../queries_sql";

const planListParamsSchema = z.object({
  version: z.literal("v1").openapi({
    param: {
      name: "version",
      in: "path",
    },
    description: "API version",
    example: "v1",
  }),
});

const planListResponseSchema = z
  .discriminatedUnion("version", [
    z.object({
      version: z.literal("v1"),
      data: z.array(
        z.object({
          id: z.string().openapi({
            example: "plan_123abc",
          }),
          name: z.string().openapi({
            example: "Daily Commute Plan",
          }),
          fromLat: latOut,
          fromLon: lonOut,
          toLat: latOut,
          toLon: lonOut,
          state: z.enum(["new", "planning", "done", "error"]).openapi({
            example: "planning",
          }),
          createdAt: z.date().openapi({
            example: "2024-02-02T12:00:00Z",
          }),
          routes: z.array(
            z.object({
              routeId: z.string().openapi({
                example: "route_456def",
              }),
              routeName: z.string().openapi({
                example: "Route via Highway",
              }),
              routeCreatedAt: z.date().openapi({
                example: "2024-02-02T12:00:00Z",
              }),
            }),
          ),
        }),
      ),
    }),
  ])
  .openapi("PlanListResponse");

const planCreateRequestSchema = z
  .discriminatedUnion("version", [
    z.object({
      version: z.literal("v1"),
      data: z.object({
        fromLat: latIn,
        fromLon: lonIn,
        toLat: latIn,
        toLon: lonIn,
        name: z.string().openapi({
          example: "New Commute Plan",
        }),
        id: z.string().openapi({
          example: "plan_789ghi",
        }),
        createdAt: z.date().openapi({
          example: "2024-02-02T12:00:00Z",
        }),
      }),
    }),
  ])
  .openapi("PlanCreateRequest");

const planCreateResponseSchema = z
  .discriminatedUnion("version", [
    z.object({
      version: z.literal("v1"),
      data: z.object({
        id: z.string().openapi({
          example: "plan_789ghi",
        }),
      }),
    }),
  ])
  .openapi("PlanCreateResponse");

const planListRoute = createRoute({
  method: "get",
  path: "/user/plans/all/v/{version}",
  request: {
    params: planListParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: planListResponseSchema,
        },
      },
      description: "List of all plans for the user",
    },
  },
});

const planCreateRoute = createRoute({
  method: "post",
  path: "/user/plans/create",
  request: {
    body: {
      content: {
        "application/json": {
          schema: planCreateRequestSchema,
        },
      },
      description: "Create a new plan",
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: planCreateResponseSchema,
        },
      },
      description: "Successfully created plan",
    },
  },
});

export function addPlanHandlers<T extends Schema>(app: RidiHonoApp<T>) {
  return app
    .openapi(planListRoute, async (c) => {
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

      const validated = planListResponseSchema.parse(response);
      return c.json(validated, 200);
    })
    .openapi(planCreateRoute, async (c) => {
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

      const validated = planCreateResponseSchema.parse(response);
      return c.json(validated, 200);
    });
}
