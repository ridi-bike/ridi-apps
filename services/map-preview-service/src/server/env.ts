import * as z from "zod";

const envSchema = z.object({
  PORT: z.coerce.number(),
  CHROME_BIN: z.string(),
  PUPPETEER_WINDOWED: z
    .union([z.literal("true"), z.literal("false")])
    .transform((v) => (v === "true" ? true : false)),
});

export const env = envSchema.parse(process.env);
