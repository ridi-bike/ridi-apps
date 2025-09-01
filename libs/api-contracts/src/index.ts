import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

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
  syncTokenGet: {
    method: "GET",
    path: "/user/sync/token",
    responses: {
      200: z.object({ token: z.string() }),
      500: z.object({ message: z.string() }),
    },
  },
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
      200: z.object({ ok: z.boolean() }),
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
      200: z.object({ ok: z.boolean() }),
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
          downloadCountRemain: z.number(),
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
          prices: z.array(priceSchema.nullable()).nullable(),
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
    summary: "Get a region by ID",
  },
});

export type ApiContract = typeof apiContract;
