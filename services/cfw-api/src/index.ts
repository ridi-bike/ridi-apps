import {
  type Request as WorkerRequest,
  type ExecutionContext,
} from "@cloudflare/workers-types";
import { apiContract } from "@ridi/api-contracts";
import {
  regionFindFromCoords,
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
} from "@ridi/db-queries";
import { RidiLogger } from "@ridi/logger";
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
import postgres from "postgres";
import { Resend } from "resend";
import { getWsServerDurableObjectFetch } from "tinybase/synchronizers/synchronizer-ws-server-durable-object";
import { notifyPayloadSchema } from "./notify";
import z from "zod";

export { UserStoreDurableObject } from "./sync";

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
    const userId = ctx.request.user.id;
    const email = ctx.request.user.email;

    if (!userId || !email) {
      return {
        status: 400,
        body: {
          message: "Prices only for registered users",
        },
      };
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
      id: userId,
      email,
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

      if (url.pathname.startsWith("/sync")) {
        return getWsServerDurableObjectFetch("UserStoreDurableObject")(
          request,
          env,
        );
      }
      if (url.pathname.startsWith("/notify")) {
        const payload = (await request.json()) as z.infer<
          typeof notifyPayloadSchema
        >;
        const url = new URL(request.url);
        url.pathname = `/sync/${payload.record?.user_id || payload.old_record?.user_id}`;
        return getWsServerDurableObjectFetch("UserStoreDurableObject")(
          new Request(url, {
            method: request.method,
            body: JSON.stringify(payload),
            redirect: request.redirect,
            headers: request.headers,
            cf: { apps: false },
          }),
          env,
        );
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
