import * as z from "zod";

const envSchema = z.object({
  REGION: z.string({ message: "ridi region env variable" }),
  MAP_DATA_LOCATION: z.string({ message: "map data location env variable" }),
  PBF_REMOTE_URL: z.string({ message: "pbf remote url env variable" }),
  KML_REMOTE_URL: z.string({ message: "kml remote url env variable" }),
  PBF_LOCATION: z.string({ message: "pbf location env variable" }),
  KML_LOCATION: z.string({ message: "kml location env variable" }),
});

export const env = envSchema.parse(process.env);
