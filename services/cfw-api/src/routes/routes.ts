import { createRoute, z } from "@hono/zod-openapi";
import { Schema } from "hono";
import { latOut, lonOut, RidiHonoApp } from "./shared";
import { routesGet } from "../queries_sql";

const routeParamsSchema = z.object({
  routeId: z.string().openapi({
    param: {
      name: "routeId",
      in: "path",
    },
    description: "ID of the route to retrieve",
    example: "route_123abc",
  }),
  version: z.literal("v1").openapi({
    param: {
      name: "version",
      in: "path",
    },
    description: "API version",
    example: "v1",
  }),
});

const routeResponseSchema = z
  .discriminatedUnion("version", [
    z.object({
      version: z.literal("v1"),
      data: z.object({
        id: z.string().openapi({
          example: "route_123abc",
        }),
        name: z.string().openapi({
          example: "Route to Work",
        }),
        createdAt: z.date().openapi({
          example: "2024-02-02T12:00:00Z",
        }),
        plan: z.object({
          planId: z.string().openapi({
            example: "plan_456def",
          }),
          planName: z.string().openapi({
            example: "Daily Commute",
          }),
          planState: z.enum(["new", "planning", "done", "error"]).openapi({
            example: "done",
          }),
        }),
        latLonArray: z.array(z.tuple([latOut, lonOut])).openapi({
          example: [
            [51.5074, -0.1278],
            [51.5098, -0.118],
          ],
        }),
      }),
    }),
  ])
  .openapi("RouteResponse");

// Route definition
const routeGetRoute = createRoute({
  method: "get",
  path: "/user/routes/{routeId}/v/{version}",
  request: {
    params: routeParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: routeResponseSchema,
        },
      },
      description: "Route details including plan information and coordinates",
    },
    404: {
      description: "Route not found",
      content: {
        "application/json": {
          schema: z
            .object({
              error: z.literal("not found"),
            })
            .openapi("NotFoundError"),
        },
      },
    },
  },
});

export function addRouteHandlers<T extends Schema>(app: RidiHonoApp<T>) {
  return app.openapi(routeGetRoute, async (c) => {
    const { routeId, version } = c.req.valid("param");

    if (version !== "v1") {
      throw new Error("wrong version");
    }

    const routesFlat = await routesGet(c.var.db, {
      id: routeId,
      userId: c.var.user.id,
    });

    if (!routesFlat.length) {
      throw new Error("not found");
    }

    const response = {
      version: "v1",
      data: {
        ...routesFlat[0],
        latLonArray: routesFlat[0].latLonArray,
        plan: {
          ...routesFlat[0],
        },
      },
    };

    const validated = routeResponseSchema.parse(response);
    return c.json(validated, 200);
  });
}
