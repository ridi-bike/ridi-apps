import * as z from "zod";

const envSchema = z.object({
  REGION: z.string(),
  MAP_DATA_LOCATION: z.string(),
  PBF_REMOTE_URL: z.string(),
  KML_REMOTE_URL: z.string(),
  PBF_LOCATION: z.string(),
  KML_LOCATION: z.string(),
  SUPABASE_DB_URL: z.string(),
});

export const env = envSchema.parse(process.env);
