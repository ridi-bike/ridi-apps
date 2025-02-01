import { z } from "zod";
import { Variables } from "../middlewares";
import { Hono, Schema } from "hono";

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

export type RidiHonoApp<T extends Schema> = Hono<
  { Bindings: CloudflareBindings } & Variables,
  T
>;

export type FieldsNotNull<T extends object> = {
  [n in keyof T]: NonNullable<T[n]>;
};
