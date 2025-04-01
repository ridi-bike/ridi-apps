import * as z from "zod";

const envSchema = z.object({
  PORT: z.coerce.number(),
  CHROME_BIN: z.string(),
  PUPPETEER_WINDOWED: z
    .union([z.literal("true"), z.literal("false")])
    .transform((v) => (v === "true" ? true : false))
    .optional(),
  R2_ENDPOINT: z.string(),
  R2_ACCESS_KEY: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
  MAP_DATA_BUCKET: z.string(),
  BUCKET_URL: z.string(),
  PREVIEW_PREFIX: z.string(),
});

export const env = envSchema.parse(process.env);
