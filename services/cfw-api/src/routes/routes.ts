import { z } from "zod";
import { latOut, lonOut, RidiHonoApp } from "./shared";
import { routesGet } from "../queries_sql";
import { zValidator } from "@hono/zod-validator";
import { Schema } from "hono";

const routeOutputSchema = z.discriminatedUnion("version", [
  z.object({
    version: z.literal("v1"),
    data: z.object({
      id: z.string(),
      name: z.string(),
      createdAt: z.date(),
      plan: z.object({
        planId: z.string(),
        planName: z.string(),
        planState: z.enum(["new", "planning", "done", "error"]),
      }),
      latLonArray: z.array(z.tuple([latOut, lonOut])),
    }),
  }),
]);

export function addRouteHandlers<T extends Schema>(app: RidiHonoApp<T>) {
  return app.get(
    "/user/routes/:routeId/v/:version",
    zValidator(
      "param",
      z.object({
        routeId: z.string(),
        version: z.literal("v1"),
      }),
    ),
    async (c) => {
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

      const validated = routeOutputSchema.parse(response);
      return c.json(validated);
    },
  );
}
