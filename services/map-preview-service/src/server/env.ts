import * as z from "zod";

const envSchema = z.object({
  PORT: z.coerce.number(),
  CHROME_BIN: z.string(),
});

export const env = envSchema.parse(process.env);
