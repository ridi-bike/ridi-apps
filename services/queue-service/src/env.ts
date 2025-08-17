import * as z from "zod";

const envSchema = z.object({
  SUPABASE_DB_URL: z.string(),
  ROUTER_SERVICE_LIST: z
    .string()
    .transform((v) => JSON.parse(v) as Record<string, string>),
  MAP_PREVIEW_SERVICE_URL: z.string(),
  RESEND_SECRET: z.string(),
  RESEND_AUDIENCE_ID: z.string(),
  API_URL: z.string(),
});

export const env = envSchema.parse(process.env);
