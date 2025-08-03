import {
  type Request as WorkerRequest,
  type ExecutionContext,
} from "@cloudflare/workers-types";
import {
  routeListDownloadedResponseSchema,
  type RoadTags,
} from "@ridi/api-contracts";
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
  privateUsersGetRow,
  privateUsersUpdateSubType,
  privateCodeGet,
  privateCodeClaim,
  userClaimPlans,
  userClaimRoutes,
  userClaimRouteBreakdownStats,
  userClaimRuleSets,
  userClaimRuleSetRoadTags,
  geoBoundariesFindCoords,
  routeSetDownloadedAt,
  privateUserDecreaseDownloads,
  routesListDownloaded,
} from "@ridi/db-queries";
import { RidiLogger } from "@ridi/logger";
import { coordsDetailsGetAndFormat } from "@ridi/maps-api";
import { Messaging } from "@ridi/messaging";
import { StripeApi } from "@ridi/stripe-api";
import * as Sentry from "@sentry/cloudflare";
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
import { Resend } from "resend";

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
  userClaimData: async ({ body }, ctx) => {
    if (body.version !== "v1") {
      throw ctx.logger.error("Wrong version", { version: body.version });
    }
    const { data } = await ctx.supabaseClient.auth.getUser(
      body.data.fromUserAccessToken,
    );
    const userFrom = data.user;
    if (userFrom && userFrom.is_anonymous) {
      await Promise.all([
        userClaimPlans(ctx.db, {
          fromUserId: userFrom.id,
          toUserId: ctx.request.user.id,
        }),

        userClaimRoutes(ctx.db, {
          fromUserId: userFrom.id,
          toUserId: ctx.request.user.id,
        }),

        userClaimRouteBreakdownStats(ctx.db, {
          fromUserId: userFrom.id,
          toUserId: ctx.request.user.id,
        }),

        userClaimRuleSets(ctx.db, {
          fromUserId: userFrom.id,
          toUserId: ctx.request.user.id,
        }),

        userClaimRuleSetRoadTags(ctx.db, {
          fromUserId: userFrom.id,
          toUserId: ctx.request.user.id,
        }),
      ]);

      await ctx.supabaseClient.auth.admin.deleteUser(userFrom.id);
    }

    return {
      status: 200,
      body: { ok: true },
    };
  },
  codeClaim: async ({ body }, ctx) => {
    if (body.version !== "v1") {
      throw ctx.logger.error("Wrong version", { version: body.version });
    }

    const privateUser = await privateUsersGetRow(ctx.db, {
      userId: ctx.request.user.id,
    });

    if (!privateUser) {
      throw ctx.logger.error("Missing user record", {
        userId: ctx.request.user.id,
      });
    }

    if (privateUser?.subType !== "none") {
      throw ctx.logger.error("Existing subscription in place", {
        userId: ctx.request.user.id,
        subType: privateUser.subType,
      });
    }

    const code = await privateCodeGet(ctx.db, {
      code: body.data.code,
    });

    if (!code) {
      throw ctx.logger.error("Code does not exist", {
        code: body.data.code,
        userId: ctx.request.user.id,
      });
    }

    if (code.claimedByUserId) {
      throw ctx.logger.error("Code already claimed", {
        code: body.data.code,
        claimedByUserId: code.claimedByUserId,
        userId: ctx.request.user.id,
      });
    }

    await privateCodeClaim(ctx.db, {
      code: body.data.code,
      claimedByUserId: ctx.request.user.id,
    });

    await privateUsersUpdateSubType(ctx.db, {
      subType: "code",
      userId: ctx.request.user.id,
    });

    return {
      status: 200,
      body: { ok: true },
    };
  },
  userGet: async ({ query: { version } }, ctx) => {
    if (version !== "v1") {
      throw ctx.logger.error("Wrong version", { version });
    }
    const privateUser = await privateUsersGetRow(ctx.db, {
      userId: ctx.request.user.id,
    });
    return {
      status: 200,
      body: {
        version: "v1" as const,
        data: {
          userId: ctx.request.user.id,
          isAnonymous: !!ctx.request.user.is_anonymous,
          subType: privateUser?.subType || "none",
          downloadCountRemain: privateUser?.downloadCountRemain || 0,
          email: ctx.request.user.email || null,
        },
      },
    };
  },
  billingGet: async ({ query: { version } }, ctx) => {
    if (version !== "v1") {
      throw ctx.logger.error("Wrong version", { version });
    }
    const stripeApi = new StripeApi(
      ctx.db,
      ctx.logger,
      ctx.workerEnv.STRIPE_SECRET_KEY,
      ctx.workerEnv.RIDI_APP_URL,
      ctx.workerEnv.STRIPE_PRICE_ID_MONTLY,
      ctx.workerEnv.STRIPE_PRICE_ID_YEARLY,
    );
    const privateUser = await privateUsersGetRow(ctx.db, {
      userId: ctx.request.user.id,
    });
    if (!privateUser) {
      throw new Error("User must exist");
    }
    if (privateUser.subType === "code") {
      return {
        status: 200,
        body: {
          version: "v1" as const,
          data: {
            subType: "code",
            prices: null,
            subscription: null,
            stripeUrl: null,
          },
        },
      };
    }
    const prices = await stripeApi.getPrices({
      id: ctx.request.user.id,
      email: ctx.request.user.email,
    });
    return {
      status: 200,
      body: {
        version: "v1" as const,
        data: {
          subType: privateUser?.subType || "none",
          prices,
          subscription: privateUser
            ? {
                isActive: privateUser.stripeStatus === "active",
                status: privateUser.stripeStatus,
                price:
                  prices.find((p) => p?.id === privateUser.stripePriceId) ||
                  null,
                currentPeriodEndDate:
                  privateUser.stripeCurrentPeriodEnd?.toString() || null,
                currentPeriodWillRenew: !privateUser.stripeCancelAtPeriodEnd,
              }
            : null,
          stripeUrl: privateUser?.stripeCustomerId
            ? await stripeApi.getStripeBillingPortalSessionUrl({
                id: ctx.request.user.id,
              })
            : null,
        },
      },
    };
  },
  stripeSuccess: async (_, ctx) => {
    const stripeApi = new StripeApi(
      ctx.db,
      ctx.logger,
      ctx.workerEnv.STRIPE_SECRET_KEY,
      ctx.workerEnv.RIDI_APP_URL,
      ctx.workerEnv.STRIPE_PRICE_ID_MONTLY,
      ctx.workerEnv.STRIPE_PRICE_ID_YEARLY,
    );

    const subFound = await stripeApi.syncStripeData({
      type: "ridi",
      id: ctx.request.user.id,
    });

    return {
      status: 200,
      body: { subFound },
    };
  },
  stripeCheckout: async ({ query: { priceType } }, ctx) => {
    const stripeApi = new StripeApi(
      ctx.db,
      ctx.logger,
      ctx.workerEnv.STRIPE_SECRET_KEY,
      ctx.workerEnv.RIDI_APP_URL,
      ctx.workerEnv.STRIPE_PRICE_ID_MONTLY,
      ctx.workerEnv.STRIPE_PRICE_ID_YEARLY,
    );

    const email = ctx.request.user.email;
    if (!email) {
      throw ctx.logger.error("User does not have an email address", {
        userId: ctx.request.user.id,
      });
    }

    const url = await stripeApi.createStripeCheckoutUrl(
      {
        id: ctx.request.user.id,
        email,
      },
      priceType,
    );

    return {
      status: 200,
      body: {
        stripeUrl: url,
      },
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
      throw ctx.logger.error("Wrong version", { version: query.version });
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
      throw ctx.logger.error("Validation error in ruleSetsList", {
        error: validated.error.toString(),
        userId: ctx.request.user.id,
      });
    }

    return {
      status: 200,
      body: validated.data,
    };
  },
  ruleSetSet: async ({ body }, ctx) => {
    if (body.version !== "v1") {
      throw ctx.logger.error("Wrong version", { version: body.version });
    }

    const ruleSetCheck = await ruleSetGet(ctx.db, {
      id: body.data.id,
    });

    if (ruleSetCheck && !ruleSetCheck.userId) {
      throw ctx.logger.error("Cannot modify system rule sets", {
        ruleSetId: body.data.id,
        userId: ctx.request.user.id,
      });
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
      Object.entries(body.data.roadTags).map(([tagKey, value]) => {
        return ruleSetRoadTagsUpsert(ctx.db, {
          ruleSetId: updatedRec.id,
          tagKey,
          value: value as string | null, // it's number but sqlc incorrectly wants a string
          userId: ctx.request.user.id,
        });
      }),
    );

    return {
      status: 200,
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
      throw ctx.logger.error("Cannot delete system rule sets", {
        ruleSetId: body.id,
        userId: ctx.request.user.id,
      });
    }

    await ruleSetSetDeleted(ctx.db, {
      id: body.id,
    });

    return {
      status: 200,
      body: {
        id: body.id,
      },
    };
  },
  planCreate: async ({ body: { version, data } }, ctx) => {
    if (version !== "v1") {
      throw ctx.logger.error("Wrong version", { version });
    }
    let startFinishDesc: [string, null | string];
    try {
      startFinishDesc = await Promise.all([
        coordsDetailsGetAndFormat(
          {
            lat: Number(data.startLat),
            lon: Number(data.startLon),
          },
          (coords) =>
            geoBoundariesFindCoords(ctx.db, {
              lat: coords.lat.toString(),
              lon: coords.lon.toString(),
            }),
        ),
        data.finishLat && data.finishLon
          ? coordsDetailsGetAndFormat(
              {
                lat: Number(data.finishLat),
                lon: Number(data.finishLon),
              },
              (coords) =>
                geoBoundariesFindCoords(ctx.db, {
                  lat: coords.lat.toString(),
                  lon: coords.lon.toString(),
                }),
            )
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
        Number(data.startLon),
        Number(data.startLat),
      ]);
      const finishPoint = turf.point([
        Number(data.finishLon),
        Number(data.finishLat),
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

    await ctx.messaging.send("plan_new", { planId: newPlan.id });
    await ctx.messaging.send("plan_map_gen", { planId: newPlan.id });

    const response = {
      version: "v1" as const,
      data: newPlan,
    };

    return {
      status: 200,
      body: response,
    };
  },
  plansList: async ({ query: { version } }, ctx) => {
    if (version !== "v1") {
      throw ctx.logger.error("Wrong version", { version });
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
                routeDownloadedAt:
                  R.first(oneRouteFlat).routeDownloadedAt?.toString() ?? null,
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
      throw ctx.logger.error("Validation error in plansList", {
        error: validated.error.toString(),
        userId: ctx.request.user.id,
      });
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
      throw ctx.logger.error("Plan record not found", {
        planId,
        userId: ctx.request.user.id,
      });
    }

    await routeDeleteByPlanId(ctx.db, {
      planId,
      userId: ctx.request.user.id,
    });

    return {
      status: 200,
      body: {
        id: deletedPlan.id,
      },
    };
  },
  routeGet: async ({ params: { routeId }, query: { version } }, ctx) => {
    if (version !== "v1") {
      throw ctx.logger.error("Wrong version", { version });
    }

    try {
      const routesFlat = await routesGet(ctx.db, {
        id: routeId,
        userId: ctx.request.user.id,
      });

      if (!routesFlat.length) {
        throw ctx.logger.error("Route not found", {
          routeId,
          userId: ctx.request.user.id,
        });
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
          downloadedAt: routesFlat[0].downloadedAt?.toString() ?? null,
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
        throw ctx.logger.error("Validation error in routeGet", {
          error: validated.error.toString(),
          routeId,
          userId: ctx.request.user.id,
        });
      }
      return {
        status: 200,
        body: validated.data,
      };
    } catch (error) {
      throw ctx.logger.error("Route get error", {
        error,
        routeId,
        userId: ctx.request.user.id,
      });
    }
  },
  routesListDownloaded: async ({ query: { version } }, ctx) => {
    if (version !== "v1") {
      throw ctx.logger.error("Wrong version", { version });
    }

    try {
      const routesFlat = await routesListDownloaded(ctx.db, {
        userId: ctx.request.user.id,
      });

      const response = {
        version: "v1",
        data: routesFlat.map((routeFlat) => ({
          ...routeFlat,
          downloadedAt: routeFlat.downloadedAt?.toString() ?? null,
        })),
      };

      const validated = routeListDownloadedResponseSchema.safeParse(response);

      if (!validated.success) {
        throw ctx.logger.error("Validation error in routeGet", {
          error: validated.error.toString(),
          userId: ctx.request.user.id,
        });
      }
      return {
        status: 200,
        body: validated.data,
      };
    } catch (error) {
      throw ctx.logger.error("Route get error", {
        error,
        userId: ctx.request.user.id,
      });
    }
  },
  routeDelete: async ({ params: { routeId } }, ctx) => {
    const deletedRoute = await routeDelete(ctx.db, {
      id: routeId,
      userId: ctx.request.user.id,
    });

    if (!deletedRoute) {
      throw ctx.logger.error("Route not found for deletion", {
        routeId,
        userId: ctx.request.user.id,
      });
    }

    return {
      status: 200,
      body: {
        id: deletedRoute.id,
      },
    };
  },
  routeSetDownloadedAt: async (
    {
      params: { routeId },
      body: {
        version,
        data: { downloadedAt },
      },
    },
    ctx,
  ) => {
    if (version !== "v1") {
      throw ctx.logger.error("Wrong version", { version });
    }

    const updatedRoute = await routeSetDownloadedAt(ctx.db, {
      id: routeId,
      downloadedAt: new Date(downloadedAt),
    });

    // updating only if first time download
    if (updatedRoute) {
      const privateUser = await privateUserDecreaseDownloads(ctx.db, {
        userId: ctx.request.user.id,
      });

      if (!privateUser) {
        throw ctx.logger.error("Missing private user record", {
          userId: ctx.request.user.id,
        });
      }
    }

    return {
      status: 200,
      body: {
        id: routeId,
      },
    };
  },
});

const ridiLogger = RidiLogger.init({ service: "cfw-api" });

export default Sentry.withSentry(
  (env: CloudflareBindings) => ({
    enabled: env.RIDI_ENV !== "local",
    dsn: env.SENTRY_DSN,
    environment: env.RIDI_ENV,
    sendDefaultPii: true,
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  }),
  {
    async fetch(
      request: Request,
      env: CloudflareBindings,
      ctx: ExecutionContext,
    ): Promise<Response> {
      const url = new URL(request.url);

      if (request.method === "OPTIONS") {
        return new Response("ok", {
          headers: {
            "Access-Control-Allow-Origin": url.pathname.startsWith(
              "/get-notified",
            )
              ? env.RIDI_LANDING_URL
              : env.RIDI_APP_URL,
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

      const dbCon = postgres(env.SUPABASE_DB_URL);

      if (url.pathname.startsWith("/get-notified")) {
        const email = url.searchParams.get("email");
        ridiLogger.info("Get notified call", { email });

        const resend = new Resend(env.RESEND_KEY);
        const resp = { ok: false };
        if (email) {
          await resend.emails.send({
            from: "news@email.ridi.bike",
            subject: "Subscription to Ridi News",
            to: email,
            html: `
              <div style="width: 375px; margin: 0 auto; background-color: #f4f4f5;">
                <table width="100%" cellpadding="0" cellspacing="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                  <tr>
                    <td style="padding: 48px 24px; background-color: #f4f4f5;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px;">
                        <tr>
                          <td style="padding: 32px 24px; text-align: center;">
                            <img src="https://ridi.bike/Name-tagline.svg" alt="Logo" style="width: 120px; height: 40px;">
                            <h1 style="font-size: 24px; font-weight: 600; color: #FF5937; margin: 24px 0 12px;">
                              Ridi News
                            </h1>
                            <p style="font-size: 16px; color: #71717A; margin-bottom: 32px; line-height: 24px;">
                              Thank you for subscribing to Ridi news and updates. 
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>
            `,
          });
          await resend.contacts.create({
            email,
            unsubscribed: false,
            audienceId: env.RESEND_AUD_GENERAL_ID,
          });
          resp.ok = true;
        }
        const response = new Response(JSON.stringify(resp), {
          headers: {
            "Content-Type": "application/json",
          },
        });
        response.headers.set(
          "Access-Control-Allow-Origin",
          env.RIDI_LANDING_URL,
        );
        response.headers.set("Access-Control-Allow-Credentials", "true");
        return response;
      }

      if (url.pathname.startsWith("/geo-boundaries")) {
        const lat = url.searchParams.get("lat");
        const lon = url.searchParams.get("lon");
        ridiLogger.info("Geo Boundaries call", { lat, lon });

        if (!lat || !lon) {
          ridiLogger.warn("Geo Boundaries call missing values", { lat, lon });
          return new Response("missing lat or lon", { status: 400 });
        }

        const boundaries = (
          await geoBoundariesFindCoords(dbCon, {
            lat,
            lon,
          })
        )
          .toSorted((a, b) => b.level - a.level)
          .filter((b) => !!b.name);

        const results = boundaries.map((b) => ({
          name: b.name,
          level: b.level,
        }));

        ridiLogger.warn("Geo Boundaries found", { lat, lon, results });

        const response = new Response(JSON.stringify(results), {
          headers: {
            "Content-Type": "application/json",
          },
        });
        response.headers.set("Access-Control-Allow-Origin", env.RIDI_APP_URL);
        response.headers.set("Access-Control-Allow-Credentials", "true");
        return response;
      }

      const supabaseClient = createClient(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
      );

      let response: Response | undefined;

      await dbCon.begin(async (tx) => {
        const messaging = new Messaging(tx, ridiLogger);

        if (url.pathname.startsWith("/stripe-webhook")) {
          const stripeApi = new StripeApi(
            tx,
            ridiLogger,
            env.STRIPE_SECRET_KEY,
            env.RIDI_APP_URL,
            env.STRIPE_WEBHOOK_SECRET,
            env.STRIPE_PRICE_ID_MONTLY,
            env.STRIPE_PRICE_ID_YEARLY,
          );
          response = await stripeApi.processWebhook(
            request,
            ctx.waitUntil.bind(ctx),
          );
          return;
        }

        response = await fetchRequestHandler({
          request,
          contract: apiContract,
          router,
          options: {
            errorHandler(err, req) {
              console.error(err);
              Sentry.captureException(err, {
                data: {
                  req,
                },
              });
              return TsRestResponse.fromJson(
                { message: "Server error" },
                { status: 500 },
              );
            },
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
            db: tx,
            logger: ridiLogger,
          },
        });
      });

      if (!response) {
        throw ridiLogger.error("Reponse is undefined", { request, response });
      }

      response.headers.set("Access-Control-Allow-Origin", env.RIDI_APP_URL);
      response.headers.set("Access-Control-Allow-Credentials", "true");

      return response;
    },
  },
);
