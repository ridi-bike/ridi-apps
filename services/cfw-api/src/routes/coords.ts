import { createRoute, z } from "@hono/zod-openapi";
import { latIn, lonIn, RidiHonoApp } from "./shared";
import { Schema } from "hono";

const coordsSchema = z
  .discriminatedUnion("version", [
    z.object({
      version: z.literal("v1"),
      data: z.object({
        lat: latIn,
        lon: lonIn,
      }),
    }),
  ])
  .openapi("Coords");

const coordsSelectedRoute = createRoute({
  method: "post",
  path: "/user/coords/selected",
  request: {
    body: {
      content: {
        "application/json": {
          schema: coordsSchema,
        },
      },
      description: "Mark coords as selected",
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }).openapi("Success"),
        },
      },
      description: "Marked coords as selected succesfully",
    },
  },
});

export function addCoordsHandler<T extends Schema>(app: RidiHonoApp<T>) {
  return app.openapi(coordsSelectedRoute, async (c) => {
    const {
      version,
      data: { lat, lon },
    } = c.req.valid("json");

    if (version === "v1") {
      await c.var.messaging.send("coords-activty", { lat, lon });
    }

    const response = { success: true };
    return c.json(response, 200);
  });
}
