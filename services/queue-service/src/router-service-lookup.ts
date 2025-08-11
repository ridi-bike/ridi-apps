import { setTimeout } from "node:timers/promises";

import { type RidiLogger } from "@ridi/logger";
import {
  ridiRouterContract,
  type RouteReq,
} from "@ridi/router-service-contracts";
import { initClient, type ApiFetcherArgs } from "@ts-rest/core";
import axios, { isAxiosError } from "axios";

import { env } from "./env";

export class RouterServiceLookup {
  private readonly logger: RidiLogger;

  constructor(logger: RidiLogger) {
    this.logger = logger.withContext({ module: "ridi-service-lookup" });
  }

  async callRouterService(region: string, req: RouteReq) {
    const routerServiceUrl = env.ROUTER_SERVICE_LIST[region];

    this.logger.info("Router service call", {
      routerServiceUrl,
      req,
    });

    if (!routerServiceUrl) {
      throw this.logger.error("Router service url not found", {
        region,
        reqId: req.reqId,
      });
    }

    const client = initClient(ridiRouterContract, {
      baseUrl: `http://${routerServiceUrl}`,
      validateResponse: true,
      api: async (args: ApiFetcherArgs) => {
        try {
          const result = await axios.request({
            method: args.method,
            url: args.path,
            headers: args.headers,
            data: args.body,
            params: args.rawQuery,
          });
          return {
            status: result.status,
            body: result.data,
            headers: new Headers(result.headers as Record<string, string>),
          };
        } catch (error) {
          if (isAxiosError(error) && error.response) {
            return {
              status: error.response.status,
              body: error.response.data,
              headers: new Headers(
                error.response.headers as Record<string, string>,
              ),
            };
          }
          throw error;
        }
      },
    });

    const retryIfUnderSecs = 5;
    const maxRetries = 5;
    const waitTimeMs = 5000;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const startMoment = Date.now();
      try {
        const result = await client.generateRoute({
          body: req,
        });
        this.logger.info("Router service call done", {
          reqId: req.reqId,
          duration: Date.now() - startMoment,
        });
        return result;
      } catch (error) {
        // if more than X secs passed, don't retry as it's not a netowrk thing
        if (Date.now() - retryIfUnderSecs * 1000 > startMoment) {
          throw this.logger.error("Router service call failed", {
            duration: Date.now() - startMoment,
            reqId: req.reqId,
            attempt,
            error,
            region,
            routerServiceUrl,
            willRetry: attempt < maxRetries,
          });
        }
        lastError = error;
        this.logger.warn("Router service call failed", {
          duration: Date.now() - startMoment,
          reqId: req.reqId,
          attempt,
          error,
          region,
          routerServiceUrl,
          willRetry: attempt < maxRetries,
        });

        if (attempt < maxRetries) {
          await setTimeout(waitTimeMs * attempt);
        }
      }
    }

    throw this.logger.error("Router service call failed after all retries", {
      reqId: req.reqId,
      region,
      attempts: maxRetries,
      error: lastError,
    });
  }
}
