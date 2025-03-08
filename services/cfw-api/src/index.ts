import {
  type Request as WorkerRequest,
  type ExecutionContext,
} from "@cloudflare/workers-types/experimental";
import { type RoadTags } from "@ridi/api-contracts";
import {
  apiContract,
  plansListResponseSchema,
  routeGetRespopnseSchema,
  ruleSetsListSchema,
} from "@ridi/api-contracts";
import {
  planCreate,
  planList,
  routeStatsGet,
  routesGet,
  ruleSetGet,
  ruleSetRoadTagsUpsert,
  ruleSetsList,
  ruleSetUpsert,
  ruleSetRoadTagsList,
  ruleSetSetDeleted,
  regionFindFromCoords,
  routeDelete,
  planDelete,
  routeDeleteByPlanId,
} from "@ridi/db-queries";
import { RidiLogger } from "@ridi/logger";
import { lookupCooordsInfo } from "@ridi/maps-api";
import { Messaging } from "@ridi/messaging";
import { type User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import {
  TsRestResponse,
  fetchRequestHandler,
  tsr,
} from "@ts-rest/serverless/fetch";
import * as turf from "@turf/turf";
import postgres from "postgres";
import * as R from "remeda";

export type FieldsNotNull<T extends object> = {
  [n in keyof T]: NonNullable<T[n]>;
};

const router = tsr
  .platformContext<{
    workerRequest: WorkerRequest;
    workerEnv: CloudflareBindings;
    workerContext: ExecutionContext;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabaseClient: ReturnType<typeof createClient<any, "public", any>>;
    db: ReturnType<typeof postgres>;
    messaging: Messaging;
    logger: RidiLogger;
  }>()
  .routerWithMiddleware(apiContract)<{ user: User }>({
  stripeCheckout: async (_, ctx) => {
    ctx.responseHeaders.set("location", "https:///google.com");
    return {
      status: 302,
      body: undefined,
    };
  },
  regionGet: async ({ params: { lon, lat } }, ctx) => {
    const regions = await regionFindFromCoords(ctx.db, {
      lat,
      lon,
    });

    return {
      status: 200,
      body: regions.map((r) => ({
        region: r.region,
        geojson: r.geojson,
      })),
    };
  },
  ruleSetsList: async ({ query }, ctx) => {
    if (query.version !== "v1") {
      return {
        status: 400,
        body: {
          message: "wrong version",
        },
      };
    }
    const rules = await ruleSetsList(ctx.db, {
      userId: ctx.request.user.id,
    });
    const tags = await ruleSetRoadTagsList(ctx.db, {
      userId: ctx.request.user.id,
    });

    const data = {
      version: "v1" as const,
      data: rules.map((r) => ({
        ...r,
        isSystem: r.userId === null,
        isDefault: r.defaultSet,
        roadTags: tags
          .filter((t) => t.ruleSetId === r.id)
          .reduce(
            (all, curr) => ({ ...all, [curr.tagKey]: curr.value }),
            {} as Record<RoadTags, number | null>,
          ),
      })),
    };
    const validated = ruleSetsListSchema.safeParse(data);

    if (!validated.success) {
      return {
        status: 500,
        body: {
          message: validated.error.toString(),
        },
      };
    }

    return {
      status: 200,
      body: validated.data,
    };
  },
  ruleSetSet: async ({ body }, ctx) => {
    if (body.version !== "v1") {
      return {
        status: 400,
        body: {
          message: "wrong version",
        },
      };
    }

    const ruleSetCheck = await ruleSetGet(ctx.db, {
      id: body.data.id,
    });

    if (ruleSetCheck && !ruleSetCheck.userId) {
      return {
        status: 400,
        body: {
          message: "Cannot modify system rule sets",
        },
      };
    }
    const updatedRec = await ruleSetUpsert(ctx.db, {
      userId: ctx.request.user.id,
      id: body.data.id,
      name: body.data.name,
    });
    if (!updatedRec) {
      throw new Error("can't happen");
    }

    await Promise.all(
      Object.entries(body.data.roadTags).map(([tagKey, value]) =>
        ruleSetRoadTagsUpsert(ctx.db, {
          ruleSetId: updatedRec.id,
          tagKey,
          value: value as string | null, // it's number but sqlc incorrectly wants a string
          userId: ctx.request.user.id,
        }),
      ),
    );
    return {
      status: 201,
      body: {
        version: "v1",
        data: {
          id: updatedRec.id,
        },
      },
    };
  },
  ruleSetDelete: async ({ body }, ctx) => {
    const ruleSetCheck = await ruleSetGet(ctx.db, {
      id: body.id,
    });

    if (ruleSetCheck && !ruleSetCheck.userId) {
      return {
        status: 400,
        body: {
          message: "Cannot modify system rule sets",
        },
      };
    }

    await ruleSetSetDeleted(ctx.db, {
      id: body.id,
    });

    return {
      status: 204,
      body: {
        id: body.id,
      },
    };
  },
  planCreate: async ({ body: { version, data } }, ctx) => {
    if (version !== "v1") {
      return {
        status: 400,
        body: {
          message: "wrong version",
        },
      };
    }
    let startFinishDesc: [string, null | string];
    try {
      startFinishDesc = await lookupCooordsInfo([
        [data.startLat, data.startLon],
        data.finishLat && data.finishLon
          ? [data.finishLat, data.finishLon]
          : null,
      ]);
    } catch (error) {
      ctx.logger.error("Error on coords description prep", { error, data });
      startFinishDesc = [
        `${data.startLat}, ${data.startLon}`,
        `${data.finishLat}, ${data.finishLon}`,
      ];
    }

    let distance = data.distance || "0";
    if (data.finishLat && data.finishLon) {
      const startPoint = turf.point([
        Number(data.startLat),
        Number(data.startLon),
      ]);
      const finishPoint = turf.point([
        Number(data.finishLat),
        Number(data.finishLon),
      ]);

      distance = turf
        .distance(startPoint, finishPoint, {
          units: "meters",
        })
        .toString();
    }

    const newPlan = await planCreate(ctx.db, {
      ...data,
      distance,
      startDesc: startFinishDesc[0],
      finishDesc: startFinishDesc[1],
      userId: ctx.request.user.id,
    });

    if (!newPlan) {
      throw new Error("can't happen");
    }

    await ctx.messaging.send("new-plan", { planId: newPlan.id });

    const response = {
      version: "v1" as const,
      data: newPlan,
    };

    return {
      status: 201,
      body: response,
    };
  },
  plansList: async ({ query: { version } }, ctx) => {
    if (version !== "v1") {
      return {
        status: 400,
        body: {
          message: "wrong version",
        },
      };
    }
    const plansFlat = await planList(ctx.db, {
      userId: ctx.request.user.id,
    });

    const plans = R.pipe(
      plansFlat,
      R.groupBy(R.prop("id")),
      R.entries(),
      R.map(([_planId, onePlanFlat]) => ({
        ...R.first(onePlanFlat),
        routes: R.first(onePlanFlat).routeId
          ? R.pipe(
              onePlanFlat as FieldsNotNull<(typeof onePlanFlat)[number]>[],
              R.groupBy(R.prop("routeId")),
              R.entries(),
              R.map(([_routeId, oneRouteFlat]) => ({
                ...R.first(oneRouteFlat),
              })),
            )
          : [],
      })),
    );

    const validated = plansListResponseSchema.safeParse({
      version: "v1",
      data: plans,
    });

    if (!validated.success) {
      return {
        status: 500,
        body: {
          message: validated.error.toString(),
        },
      };
    }

    return {
      status: 200,
      body: validated.data,
    };
  },
  planDelete: async ({ params: { planId } }, ctx) => {
    const deletedPlan = await planDelete(ctx.db, {
      id: planId,
      userId: ctx.request.user.id,
    });

    if (!deletedPlan) {
      return {
        status: 400,
        body: {
          message: "Record not found",
        },
      };
    }

    await routeDeleteByPlanId(ctx.db, {
      planId,
      userId: ctx.request.user.id,
    });

    return {
      status: 204,
      body: {
        id: deletedPlan.id,
      },
    };
  },
  routeGet: async ({ params: { routeId }, query: { version } }, ctx) => {
    if (version !== "v1") {
      return {
        status: 400,
        body: {
          message: "wrong version",
        },
      } as const;
    }

    try {
      const routesFlat = await routesGet(ctx.db, {
        id: routeId,
        userId: ctx.request.user.id,
      });

      if (!routesFlat.length) {
        return {
          status: 404,
          body: {
            message: `Id ${routeId} not found`,
          },
        };
      }

      const statsBreakdown = await routeStatsGet(ctx.db, {
        routeId: routeId,
        userId: ctx.request.user.id,
      });

      const response = {
        version: "v1",
        data: {
          ...routesFlat[0],
          latLonArray: routesFlat[0].latLonArray,
          plan: {
            ...routesFlat[0],
          },
          stats: {
            lenM: routesFlat[0].statsLenM,
            junctionCount: routesFlat[0].statsJunctionCount,
            score: routesFlat[0].statsScore,
            breakdown: statsBreakdown,
          },
        },
      };

      const validated = routeGetRespopnseSchema.safeParse(response);
      if (!validated.success) {
        return {
          status: 500,
          body: {
            message: validated.error.toString(),
          },
        };
      }
      return {
        status: 200,
        body: validated.data,
      };
    } catch (error) {
      ctx.logger.error("Route get error", { error });
      return {
        status: 500,
        body: {
          message: "internal error",
        },
      } as const;
    }
  },
  routeDelete: async ({ params: { routeId } }, ctx) => {
    const deletedRoute = await routeDelete(ctx.db, {
      id: routeId,
      userId: ctx.request.user.id,
    });

    if (!deletedRoute) {
      return {
        status: 400,
        body: {
          message: "Row not found",
        },
      };
    }

    return {
      status: 204,
      body: {
        id: deletedRoute.id,
      },
    };
  },
});

const ridiLogger = RidiLogger.init({ service: "cfw-api" });

export default {
  async fetch(
    request: Request,
    env: CloudflareBindings,
    ctx: ExecutionContext,
  ): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": env.RIDI_APP_URL,
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Headers":
            "authorization, origin, content-type, accept",
          "Access-Control-Allow-Methods": "GET, POST, DELETE",
        },
      });
    }
    if (request.method === "HEAD") {
      return new Response();
    }

    if (new URL(request.url).pathname.startsWith("/public")) {
      return new Response("this is public");
    }

    const supabaseClient = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const db = postgres(env.SUPABASE_DB_URL);
    const messaging = new Messaging(db, ridiLogger);

    const response = await fetchRequestHandler({
      request,
      contract: apiContract,
      router,
      options: {
        basePath: "/private",
        requestMiddleware: [
          tsr.middleware<{ timeStartMs: number }>((request) => {
            request.timeStartMs = Date.now();
          }),
          tsr.middleware<{ user: User; timeStartMs: number }>(
            async (request) => {
              const authHeader = request.headers.get("Authorization");
              const token = authHeader?.replace("Bearer ", "") || "";
              const { data } = await supabaseClient.auth.getUser(token);
              const user = data.user;
              if (!user) {
                return TsRestResponse.fromJson(
                  { message: "Unauthorized" },
                  { status: 401 },
                );
              }
              request.user = user;
            },
          ),
        ],
        responseHandlers: [
          (_response, request) => {
            ridiLogger.info("Req finished", {
              ms: Date.now() - request.timeStartMs,
            });
          },
        ],
      },
      platformContext: {
        workerRequest: request as unknown as WorkerRequest,
        workerEnv: env,
        workerContext: ctx,
        supabaseClient,
        messaging,
        db,
        logger: ridiLogger,
      },
    });
    response.headers.set("Access-Control-Allow-Origin", env.RIDI_APP_URL);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    return response;
  },
};
