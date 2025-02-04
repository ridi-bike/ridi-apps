import { initContract } from "@ts-rest/core";
import { z } from "zod";

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
  .transform((t) => (t ? t.toString() : null));
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
        routes: z.array(
          z.object({
            routeId: z.string(),
            routeName: z.string(),
            routeCreatedAt: dateOut,
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
