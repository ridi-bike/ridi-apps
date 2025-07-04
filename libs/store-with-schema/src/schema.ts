import { z } from "zod";

const dateSchema = z
  .string()
  .regex(
    /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/,
  );
const lat = z.number().min(-90).max(90);
const lon = z.number().min(-180).max(180);

const bearing = z.number().min(0).max(360).nullable();

const planStateSchema = z.enum([
  "new",
  "planning",
  "planning-wider",
  "done",
  "error",
]);
const planTypeSchema = z.enum(["round-trip", "start-finish"]);

const planSchema = z.object({
  id: z.string(),
  name: z.string(),
  startLat: lat,
  startLon: lon,
  startDesc: z.string(),
  finishLat: lat.nullable(),
  finishLon: lon.nullable(),
  finishDesc: z.string().nullable(),
  state: planStateSchema,
  createdAt: dateSchema,
  tripType: planTypeSchema,
  distance: z.coerce.number(),
  bearing: bearing,
  ruleSetId: z.string(),
  mapPreviewLight: z.string().nullable(),
  mapPreviewDark: z.string().nullable(),
  isDeleted: z.boolean().nullable(),
});

const routeSchema = z.object({
  id: z.string(),
  planId: z.string(),
  name: z.string(),
  createdAt: dateSchema,
  downloadedAt: dateSchema.nullable(),
  mapPreviewLight: z.string().nullable(),
  mapPreviewDark: z.string().nullable(),
  latLonArray: z.array(z.tuple([z.number(), z.number()])),
  lenM: z.number(),
  score: z.number(),
  junctionCount: z.number(),
  isDeleted: z.boolean().nullable(),
});

const routeCoordsSchema = z.object({
  id: z.string(),
  routeId: z.string(),
  coordsArrayString: z.string(),
  coordsOverviewArrayString: z.string(),
});

export type Route = z.infer<typeof routeSchema>;

const routeBreakdownSchema = z.object({
  id: z.string(),
  routeId: z.string(),
  statType: z.enum(["type", "surface", "smoothness"]),
  statName: z.string(),
  lenM: z.number(),
  percentage: z.number(),
});

const ruleSetSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z
    .union([z.literal("adv"), z.literal("touring"), z.literal("dualsport")])
    .nullable(),
  isSystem: z.boolean(),
  isDefault: z.boolean(),
  isDeleted: z.boolean().nullable(),
});

export type RuleSet = z.infer<typeof ruleSetSchema>;

export const roadTypeLargeKeys = ["motorway", "trunk"] as const;

export const roadTypeMedKeys = ["primary", "secondary"] as const;

export const roadTypeSmallKeys = ["tertiary", "unclassified"] as const;

export const roadTypeResidentalKeys = ["residential", "living_street"] as const;

export const roadTypeTinyKeys = ["track", "path"] as const;

export const roadSurfacePavedKeys = [
  "paved",
  "asphalt",
  "chipseal",
  "concrete",
  "concrete:lanes",
  "concrete:plates",
  "paving_stones",
  "paving_stones:lanes",
  "grass_paver",
  "sett",
  "unhewn_cobblestone",
  "cobblestone",
  "bricks",
] as const;

export const roadSurfaceUnpavedKeys = [
  "unpaved",
  "compacted",
  "fine_gravel",
  "gravel",
  "shells",
  "rock",
  "pebblestone",
  "ground",
  "dirt",
  "earth",
  "grass",
  "mud",
  "sand",
] as const;

export const roadSurfaceSpecialKeys = [
  "woodchips",
  "snow",
  "ice",
  "salt",
  "metal",
  "metal_grid",
  "wood",
  "stepping_stones",
  "rubber",
  "tiles",
] as const;

export const roadSmoothnessKeys = [
  "excellent",
  "good",
  "intermediate",
  "bad",
  "very_bad",
  "horrible",
  "very_horrible",
  "impassable",
] as const;

export const ruleSetTags = [
  ...roadTypeLargeKeys,
  ...roadTypeMedKeys,
  ...roadTypeSmallKeys,
  ...roadTypeTinyKeys,
  ...roadTypeResidentalKeys,
  ...roadSurfacePavedKeys,
  ...roadSurfaceUnpavedKeys,
  ...roadSurfaceSpecialKeys,
  ...roadSmoothnessKeys,
] as const;

const ruleSetRoadTagSchema = z.object({
  id: z.string(),
  ruleSetId: z.string(),
  tag: z.enum(ruleSetTags),
  value: z.number().nullable(),
});

export type RuleSetRoagTag = z.infer<typeof ruleSetRoadTagSchema>;

const regionsSchema = z.object({
  region: z.string(),
  geojsonString: z.string(),
});

export type Region = z.infer<typeof regionsSchema>;

export const storeSchema = {
  plans: planSchema,
  routes: routeSchema,
  routeCoords: routeCoordsSchema,
  routeBreakdowns: routeBreakdownSchema,
  ruleSets: ruleSetSchema,
  ruleSetRoadTags: ruleSetRoadTagSchema,
  regions: regionsSchema,
};
