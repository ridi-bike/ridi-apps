import { initContract } from "@ts-rest/core";
import { z } from "zod";

export const latIn = z
  .number()
  .min(-90)
  .max(90)
  .transform((v) => v.toString());
export const lonIn = z
  .number()
  .min(-180)
  .max(180)
  .transform((v) => v.toString());
export const latOut = z.coerce.number().min(-90).max(90);
export const lonOut = z.coerce.number().min(-180).max(180);

const c = initContract();

const planStateSchema = z.enum(["new", "planning", "done", "error"]);

export const routeGetRespopnseSchema = z.discriminatedUnion("version", [
  z.object({
    version: z.literal("v1"),
    data: z.object({
      id: z.string(),
      name: z.string(),
      createdAt: z.date(),
      plan: z.object({
        planId: z.string(),
        planName: z.string(),
        planState: planStateSchema,
      }),
      latLonArray: z.array(z.tuple([z.number(), z.number()])),
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
        fromLat: latOut,
        fromLon: lonOut,
        toLat: latOut,
        toLon: lonOut,
        state: planStateSchema,
        createdAt: z.date(),
        routes: z.array(
          z.object({
            routeId: z.string(),
            routeName: z.string(),
            routeCreatedAt: z.date(),
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
      fromLat: latIn,
      fromLon: lonIn,
      toLat: latIn,
      toLon: lonIn,
      name: z.string(),
      id: z.string(),
      createdAt: z.date(),
    }),
  }),
]);

export type PlanCreateRequest = z.input<typeof planCreateRequestSchema>;

export const apiContract = c.router({
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
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
      500: z.object({ message: z.string() }),
    },
    summary: "Get a route by ID",
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
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      500: z.object({ message: z.string() }),
    },
    summary: "List all plans for the user",
  },

  planCreate: {
    method: "POST",
    path: "/user/plans",
    body: planCreateRequestSchema,
    responses: {
      201: z.object({
        version: z.literal("v1"),
        data: z.object({
          id: z.string(),
        }),
      }),
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      500: z.object({ message: z.string() }),
    },
    summary: "Create a new plan",
  },

  coordsSelect: {
    method: "POST",
    path: "/user/coords/selected",
    body: z.discriminatedUnion("version", [
      z.object({
        version: z.literal("v1"),
        lat: latIn,
        lon: lonIn,
      }),
    ]),
    responses: {
      200: z.object({ ok: z.boolean() }),
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      500: z.object({ message: z.string() }),
    },
    summary: "Record selected coordinates",
  },
});

export type ApiContract = typeof apiContract;
