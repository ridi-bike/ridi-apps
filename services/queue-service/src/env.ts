import * as z from "zod";

const envSchema = z.object({
  SUPABASE_DB_URL: z.string(),
  ROUTER_SERVICE_LIST: z
    .string()
    .transform((v) => JSON.parse(v) as Record<string, string>),
});

export const env = envSchema.parse(process.env);
