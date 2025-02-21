import * as z from "zod";

const envSchema = z.object({
  SUPABASE_DB_URL: z.string(),
});

export const env = envSchema.parse(process.env);
