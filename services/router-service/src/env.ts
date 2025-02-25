import * as z from "zod";

const envSchema = z.object({
  ROUTER_BIN: z.string({ message: "ridi router bin env variable" }),
  REGION: z.string({ message: "ridi region env variable" }),
  PBF_LOCATION: z.string({ message: "pbf location env variable" }),
  CACHE_LOCATION: z.string({ message: "cache location env variable" }),
  ROUTER_VERSION: z.string({ message: "router version env variable" }),
  PORT: z.coerce.number(),
});

export const env = envSchema.parse(process.env);
