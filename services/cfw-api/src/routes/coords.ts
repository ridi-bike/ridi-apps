import { zValidator } from "@hono/zod-validator";
import { latIn, lonIn, RidiHonoApp } from "./shared";
import { z } from "zod";
import { Schema } from "hono";

export function addCoordsHandler<T extends Schema>(app: RidiHonoApp<T>) {
  return app.post(
    "/user/coords/selected",
    zValidator(
      "json",
      z.discriminatedUnion("version", [
        z.object({
          version: z.literal("v1"),
          data: z.object({
            lat: latIn,
            lon: lonIn,
          }),
        }),
      ]),
    ),
    async (c) => {
      const {
        version,
        data: { lat, lon },
      } = c.req.valid("json");

      if (version === "v1") {
        await c.var.messaging.send("coords-activty", { lat, lon });
      }

      const response = { success: true };
      return c.json(response);
    },
  );
}
