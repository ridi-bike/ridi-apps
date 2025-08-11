import { initContract } from "@ts-rest/core";
import { z } from "zod";

const ruleLineValue = z.number().min(0).max(255).nullable();
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

export type RoadTags =
  | (typeof roadTypeLargeKeys)[number]
  | (typeof roadTypeMedKeys)[number]
  | (typeof roadTypeSmallKeys)[number]
  | (typeof roadTypeTinyKeys)[number]
  | (typeof roadTypeResidentalKeys)[number]
  | (typeof roadSurfacePavedKeys)[number]
  | (typeof roadSurfaceUnpavedKeys)[number]
  | (typeof roadSurfaceSpecialKeys)[number]
  | (typeof roadSurfaceSpecialKeys)[number];

function createSchema<TKeysList extends readonly string[]>(
  keys: TKeysList,
): Record<TKeysList[number], typeof ruleLineValue> {
  return keys.reduce(
    (all, curr) => ({ ...all, [curr]: ruleLineValue }),
    {} as Record<TKeysList[number], typeof ruleLineValue>,
  );
}

export const ruleRoadTagchema = z.object({
  ...createSchema(roadTypeLargeKeys),
  ...createSchema(roadTypeMedKeys),
  ...createSchema(roadTypeSmallKeys),
  ...createSchema(roadTypeTinyKeys),
  ...createSchema(roadTypeResidentalKeys),
  ...createSchema(roadSurfacePavedKeys),
  ...createSchema(roadSurfaceUnpavedKeys),
  ...createSchema(roadSurfaceSpecialKeys),
  ...createSchema(roadSmoothnessKeys),
});
const c = initContract();

export const planWiderRetryMax = 6;

const latLonSchema = z.object({
  lat: z.number(),
  lon: z.number(),
});

const reqSchema = z.object({
  reqId: z.string(),
  widerReqNum: z.number().nullable(),
  req: z.discriminatedUnion("tripType", [
    z.object({
      tripType: z.literal("round-trip"),
      startFinish: latLonSchema,
      brearing: z.number().min(0).max(359),
      distance: z.number(),
    }),
    z.object({
      tripType: z.literal("start-finish"),
      start: latLonSchema,
      finish: latLonSchema,
    }),
  ]),
  rules: ruleRoadTagchema,
});

export type RouteReq = z.infer<typeof reqSchema>;

export const respSchema = z.object({
  reqId: z.string(),
  routes: z.array(
    z.object({
      route: z.array(z.tuple([z.number(), z.number()])),
      stats: z.object({
        lenM: z.number(),
        score: z.number(),
        junctionCount: z.number(),
        breakdown: z.array(
          z.object({
            statType: z.union([
              z.literal("type"),
              z.literal("surface"),
              z.literal("smoothness"),
            ]),
            statName: z.string(),
            lenM: z.number(),
            percentage: z.number(),
          }),
        ),
      }),
    }),
  ),
});

export type RouteReqResponse = z.infer<typeof respSchema>;

export const ridiRouterContract = c.router({
  healthcheck: {
    method: "GET",
    path: "/",
    responses: {
      200: z.object({
        routerVersion: z.string(),
        running: z.boolean(),
      }),
    },
  },
  generateRoute: {
    method: "POST",
    path: "/route",
    body: reqSchema,
    responses: {
      200: respSchema,
      400: z.object({ message: z.string() }),
      500: z.object({ message: z.string() }),
    },
  },
});
