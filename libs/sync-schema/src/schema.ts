import { z } from "zod";

const dateOut = z.coerce.string();
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
  createdAt: dateOut,
  tripType: planTypeSchema,
  distance: z.coerce.number(),
  bearing: bearing,
  ruleSetId: z.string(),
  mapPreviewLight: z.string().nullable(),
  mapPreviewDark: z.string().nullable(),
});

const routeSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: dateOut,
  downloadedAt: z.string().nullable(),
  mapPreviewLight: z.string().nullable(),
  mapPreviewDark: z.string().nullable(),
  latLonArray: z.array(z.tuple([z.number(), z.number()])),
  lenM: z.number(),
  score: z.number(),
  junctionCount: z.number(),
});

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
});

const roadTypeLargeKeys = ["motorway", "trunk"] as const;

const roadTypeMedKeys = ["primary", "secondary"] as const;

const roadTypeSmallKeys = ["tertiary", "unclassified"] as const;

const roadTypeResidentalKeys = ["residential", "living_street"] as const;

const roadTypeTinyKeys = ["track", "path"] as const;

const roadSurfacePavedKeys = [
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

const roadSurfaceUnpavedKeys = [
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

const roadSurfaceSpecialKeys = [
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

const roadSmoothnessKeys = [
  "excellent",
  "good",
  "intermediate",
  "bad",
  "very_bad",
  "horrible",
  "very_horrible",
  "impassable",
] as const;

const ruleRoadTagSchema = z.object({
  id: z.string(),
  tag: z.enum([
    ...roadTypeLargeKeys,
    ...roadTypeMedKeys,
    ...roadTypeSmallKeys,
    ...roadTypeTinyKeys,
    ...roadTypeResidentalKeys,
    ...roadSurfacePavedKeys,
    ...roadSurfaceUnpavedKeys,
    ...roadSurfaceSpecialKeys,
    ...roadSmoothnessKeys,
  ]),
  value: z.number().optional(),
});
