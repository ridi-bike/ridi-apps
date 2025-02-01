import { z } from "zod";
import { Variables } from "../middlewares";
import { Hono } from "hono";

// Common validators
export const latIn = z
  .number()
  .min(-90)
  .max(90)
  .transform((v) => v.toString());
export const lonIn = z
  .number()
  .min(-180)
  .max(180)
  .transform((v) => v.toString());
export const latOut = z.coerce.number().min(-90).max(90);
export const lonOut = z.coerce.number().min(-180).max(180);

export type RidiHonoApp = Hono<{ Bindings: CloudflareBindings } & Variables>;
