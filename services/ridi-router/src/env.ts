import * as z from "zod";

const envSchema = z.object({
  region: z.string({ message: "ridi region env variable" }),
  pbfLocation: z.string({ message: "pbf location env variable" }),
  cacheLocation: z.string({ message: "cache location env variable" }),
});

export const env = envSchema.parse(process.env);
