import * as turf from "@turf/turf";
import {
  TsRestResponse,
  fetchRequestHandler,
  tsr,
} from "@ts-rest/serverless/fetch";
import * as R from "remeda";
import type {
  Request as WorkerRequest,
  ExecutionContext,
} from "@cloudflare/workers-types/experimental";
import {
  apiContract,
  plansListResponseSchema,
  routeGetRespopnseSchema,
} from "@ridi/api-contracts";
import { User, createClient } from "@supabase/supabase-js";
import { Database } from "./supabase";
import postgres from "postgres";
import { Messaging } from "./messaging";
import { RidiLogger } from "./logging";
import { planCreate, planList, routeStatsGet, routesGet } from "./queries_sql";
import { lookupCooordsInfo } from "./maps/lookup";

export type FieldsNotNull<T extends object> = {
  [n in keyof T]: NonNullable<T[n]>;
};

const router = tsr
  .platformContext<{
    workerRequest: WorkerRequest;
    workerEnv: CloudflareBindings;
    workerContext: ExecutionContext;
    supabaseClient: ReturnType<
      typeof createClient<Database, "public", Database["public"]>
    >;
    db: ReturnType<typeof postgres>;
    messaging: Messaging;
    logger: RidiLogger;
  }>()
  .routerWithMiddleware(apiContract)<{ user: User }>({
  coordsSelect: async ({ body: { version, lon, lat } }, ctx) => {
    if (version !== "v1") {
      return {
        status: 400,
        body: {
          message: "wrong version",
        },
      };
    }

    await ctx.messaging.send("coords-activty", { lat, lon });
    return {
      status: 200,
      body: {
        ok: true,
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
        throw new Error("not found");
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
      return {
        status: 500,
        body: {
          message: "internal error",
        },
      } as const;
    }
  },
});

RidiLogger.init("cfw-api");
const ridiLogger = RidiLogger.get();

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
          "Access-Control-Request-Method": "GET, POST",
        },
      });
    }
    if (request.method === "HEAD") {
      return new Response();
    }

    const supabaseClient = createClient<Database, "public", Database["public"]>(
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
        requestMiddleware: [
          tsr.middleware<{ timeStartMs: number }>((request) => {
            request.timeStartMs = Date.now();
          }),
          tsr.middleware<{ timeStartMs: number }>(async (request) => {
            const netAddr = request.headers.get("CF-Connecting-IP");
            if (netAddr) {
              await messaging.send("net-addr-activity", {
                netAddr,
              });
            }
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
