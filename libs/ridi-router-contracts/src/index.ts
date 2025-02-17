import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { ruleRoadTagchema } from "@ridi/api-contracts";

const c = initContract();

const latLonSchema = z.object({
  lat: z.number(),
  lon: z.number(),
});

const reqSchema = z.object({
  reqId: z.string(),
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

const respSchema = z.object({
  reqId: z.string(),
  routes: z.array(
    z.object({
      route: z.array(latLonSchema),
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
      400: z.object({}),
      500: z.object({}),
    },
  },
});
