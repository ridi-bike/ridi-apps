import * as z from "zod";

const envSchema = z.object({
  REGION: z.string({ message: "ridi region env variable" }),
  MAP_DATA_LOCATION: z.string({ message: "map data location env variable" }),
  PBF_REMOTE_URL: z.string({ message: "pbf remove url env variable" }),
  KML_REMOTE_URL: z.string({ message: "kml remove url env variable" }),
});

export const env = envSchema.parse(process.env);
