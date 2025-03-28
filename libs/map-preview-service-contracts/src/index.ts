import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

export const mapPreviewContract = c.router({
  healthcheck: {
    method: "GET",
    path: "/api/health",
    responses: {
      200: z.object({
        running: z.boolean(),
      }),
    },
  },
  createPreview: {
    method: "POST",
    path: "/api/preview",
    body: z.discriminatedUnion("type", [
      z.object({
        type: z.literal("route"),
        route: z.array(z.tuple([z.number(), z.number()])),
        reqId: z.string(),
      }),
      z.object({
        type: z.literal("plan"),
        start: z.tuple([z.number(), z.number()]),
        finish: z.tuple([z.number(), z.number()]),
        reqId: z.string(),
      }),
    ]),
    responses: {
      200: z.object({ url: z.string() }),
      500: z.object({ message: z.string() }),
    },
  },
});
