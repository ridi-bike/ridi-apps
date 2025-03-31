import { initContract } from "@ts-rest/core";
import { z } from "zod";

const numericOut = z.coerce.number();
const dateIn = z.coerce.date();
const dateOut = z.coerce.string();
const latIn = z
  .number()
  .min(-90)
  .max(90)
  .transform((v) => v.toString());
const lonIn = z
  .number()
  .min(-180)
  .max(180)
  .transform((v) => v.toString());
const latOut = z.coerce.number().min(-90).max(90);
const lonOut = z.coerce.number().min(-180).max(180);

const bearingIn = z
  .number()
  .min(0)
  .max(360)
  .nullable()
  .transform((t) => (Number(t) === t ? t.toString() : null));
const bearingOut = z.coerce.number().min(0).max(360).nullable();

const c = initContract();

const planStateSchema = z.enum(["new", "planning", "done", "error"]);
const planTypeSchema = z.enum(["round-trip", "start-finish"]);

export const routeGetRespopnseSchema = z.discriminatedUnion("version", [
  z.object({
    version: z.literal("v1"),
    data: z.object({
      id: z.string(),
      name: z.string(),
      createdAt: dateOut,
      mapPreviewLight: z.string().nullable(),
      mapPreviewDark: z.string().nullable(),
      plan: z.object({
        planId: z.string(),
        planName: z.string(),
        planState: planStateSchema,
      }),
      latLonArray: z.array(z.tuple([z.number(), z.number()])),
      stats: z.object({
        lenM: numericOut,
        score: numericOut,
        junctionCount: numericOut,
        breakdown: z.array(
          z.object({
            id: z.string(),
            statType: z.union([
              z.literal("type"),
              z.literal("surface"),
              z.literal("smoothness"),
            ]),
            statName: z.string(),
            lenM: numericOut,
            percentage: numericOut,
          }),
        ),
      }),
    }),
  }),
]);

export type RouteGetResponse = z.infer<typeof routeGetRespopnseSchema>;

export const plansListResponseSchema = z.discriminatedUnion("version", [
  z.object({
    version: z.literal("v1"),
    data: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        startLat: latOut,
        startLon: lonOut,
        startDesc: z.string(),
        finishLat: latOut.nullable(),
        finishLon: lonOut.nullable(),
        finishDesc: z.string().nullable(),
        state: planStateSchema,
        createdAt: dateOut,
        tripType: planTypeSchema,
        distance: z.coerce.number(),
        bearing: bearingOut,
        ruleSetId: z.string(),
        mapPreviewLight: z.string().nullable(),
        mapPreviewDark: z.string().nullable(),
        routes: z.array(
          z.object({
            routeId: z.string(),
            routeName: z.string(),
            routeCreatedAt: dateOut,
            mapPreviewLight: z.string().nullable(),
            mapPreviewDark: z.string().nullable(),
          }),
        ),
      }),
    ),
  }),
]);

export type PlansListResponse = z.infer<typeof plansListResponseSchema>;

export const planCreateRequestSchema = z.discriminatedUnion("version", [
  z.object({
    version: z.literal("v1"),
    data: z.object({
      startLat: latIn,
      startLon: lonIn,
      finishLat: latIn.nullable(),
      finishLon: lonIn.nullable(),
      name: z.string(),
      id: z.string(),
      createdAt: dateIn,
      bearing: bearingIn,
      tripType: planTypeSchema,
      distance: z.number().transform((t) => (t ? t.toString() : null)),
      ruleSetId: z.string(),
    }),
  }),
]);

export type PlanCreateRequest = z.input<typeof planCreateRequestSchema>;

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

export const ruleSetsListSchema = z.discriminatedUnion("version", [
  z.object({
    version: z.literal("v1"),
    data: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        icon: z
          .union([
            z.literal("adv"),
            z.literal("touring"),
            z.literal("dualsport"),
          ])
          .nullable(),
        isSystem: z.boolean(),
        isDefault: z.boolean(),
        roadTags: ruleRoadTagchema,
      }),
    ),
  }),
]);
export type RuleSetsListResponse = z.infer<typeof ruleSetsListSchema>;

export const ruleSetSetSchema = z.discriminatedUnion("version", [
  z.object({
    version: z.literal("v1"),
    data: z.object({
      id: z.string(),
      name: z.string(),
      roadTags: ruleRoadTagchema,
    }),
  }),
]);
export type RuleSetsSetRequest = z.infer<typeof ruleSetSetSchema>;
const userSubType = z.union([
  z.literal("none"),
  z.literal("stripe"),
  z.literal("code"),
]);

const priceSchema = z.object({
  id: z.string(),
  priceType: z.union([z.literal("montly"), z.literal("yearly")]),
  price: z.number(),
  priceMontly: z.number(),
});

export const apiContract = c.router({
  userClaimData: {
    method: "POST",
    path: "/user/data/claim",
    body: z.discriminatedUnion("version", [
      z.object({
        version: z.literal("v1"),
        data: z.object({
          fromUserAccessToken: z.string(),
        }),
      }),
    ]),
    responses: {
      200: z.void(),
      500: z.object({ message: z.string() }),
    },
  },
  codeClaim: {
    method: "POST",
    path: "/user/code",
    body: z.discriminatedUnion("version", [
      z.object({
        version: z.literal("v1"),
        data: z.object({
          code: z.string(),
        }),
      }),
    ]),
    responses: {
      200: z.void(),
      500: z.object({ message: z.string() }),
    },
  },
  stripeSuccess: {
    method: "GET",
    path: "/user/success",
    responses: {
      200: z.object({ subFound: z.boolean() }),
      500: z.object({ message: z.string() }),
    },
  },
  stripeCheckout: {
    method: "GET",
    path: "/user/checkout",
    query: z.object({
      priceType: z.union([z.literal("montly"), z.literal("yearly")]),
    }),
    responses: {
      200: z.object({ stripeUrl: z.string() }),
      500: z.object({ message: z.string() }),
    },
  },
  userGet: {
    method: "GET",
    path: "/user",
    query: z.discriminatedUnion("version", [
      z.object({
        version: z.literal("v1"),
      }),
    ]),
    responses: {
      200: z.object({
        version: z.literal("v1"),
        data: z.object({
          userId: z.string(),
          isAnonymous: z.boolean(),
          subType: userSubType,
          email: z.string().nullable(),
        }),
      }),
      500: z.object({ message: z.string() }),
    },
  },
  billingGet: {
    method: "GET",
    path: "/user/billing",
    query: z.discriminatedUnion("version", [
      z.object({
        version: z.literal("v1"),
      }),
    ]),
    responses: {
      200: z.object({
        version: z.literal("v1"),
        data: z.object({
          subType: userSubType,
          subscription: z
            .object({
              isActive: z.boolean(),
              status: z.string().nullable(),
              price: priceSchema.nullable(),
              currentPeriodEndDate: z.string().nullable(),
              currentPeriodWillRenew: z.boolean().nullable(),
            })
            .nullable(),
          stripeUrl: z.string().nullable(),
          prices: z.array(priceSchema).nullable(),
        }),
      }),
      500: z.object({ message: z.string() }),
    },
  },
  regionGet: {
    method: "GET",
    path: "/region/:lat/:lon",
    query: z.discriminatedUnion("version", [
      z.object({
        version: z.literal("v1"),
      }),
    ]),
    responses: {
      200: z.array(
        z.object({
          region: z.string(),
          geojson: z.string(),
        }),
      ),
      500: z.object({ message: z.string() }),
    },
    summary: "Get a route by ID",
  },
  ruleSetsList: {
    method: "GET",
    path: "/user/rules",
    query: z.discriminatedUnion("version", [
      z.object({
        version: z.literal("v1"),
      }),
    ]),
    responses: {
      200: ruleSetsListSchema,
      500: z.object({ message: z.string() }),
    },
    summary: "Get a route by ID",
  },
  ruleSetSet: {
    method: "POST",
    path: "/user/rules",
    body: ruleSetSetSchema,
    responses: {
      200: z.object({
        version: z.literal("v1"),
        data: z.object({
          id: z.string(),
        }),
      }),
      500: z.object({ message: z.string() }),
    },
    summary: "Set a route by ID",
  },
  ruleSetDelete: {
    method: "DELETE",
    path: "/user/rules",
    body: z.object({
      id: z.string(),
    }),
    responses: {
      200: z.object({ id: z.string() }),
      500: z.object({ message: z.string() }),
    },
    summary: "Delete a route by ID",
  },
  routeGet: {
    method: "GET",
    path: "/user/routes/:routeId",
    query: z.discriminatedUnion("version", [
      z.object({
        version: z.literal("v1"),
      }),
    ]),
    responses: {
      200: routeGetRespopnseSchema,
      500: z.object({ message: z.string() }),
    },
    summary: "Get a route by ID",
  },
  routeDelete: {
    method: "DELETE",
    path: "/user/routes/:routeId",
    responses: {
      200: z.object({ id: z.string() }),
      500: z.object({ message: z.string() }),
    },
    summary: "Delete route by ID",
  },
  planDelete: {
    method: "DELETE",
    path: "/user/plans/:planId",
    responses: {
      200: z.object({ id: z.string() }),
      500: z.object({ message: z.string() }),
    },
    summary: "Delete plan by ID",
  },
  plansList: {
    method: "GET",
    path: "/user/plans",
    query: z.discriminatedUnion("version", [
      z.object({
        version: z.literal("v1"),
      }),
    ]),
    responses: {
      200: plansListResponseSchema,
      500: z.object({ message: z.string() }),
    },
    summary: "List all plans for the user",
  },

  planCreate: {
    method: "POST",
    path: "/user/plans",
    body: planCreateRequestSchema,
    responses: {
      200: z.object({
        version: z.literal("v1"),
        data: z.object({
          id: z.string(),
        }),
      }),
      500: z.object({ message: z.string() }),
    },
    summary: "Create a new plan",
  },
});

export type ApiContract = typeof apiContract;
