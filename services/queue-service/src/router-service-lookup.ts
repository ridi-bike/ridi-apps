import { setTimeout } from "node:timers/promises";

import { type RidiLogger } from "@ridi/logger";
import {
  ridiRouterContract,
  type RouteReq,
} from "@ridi/router-service-contracts";
import { initClient } from "@ts-rest/core";

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
    });

    const maxRetries = 5;
    const waitTimeMs = 5000;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await client.generateRoute({
          body: req,
        });
        this.logger.info("Router service call done", {
          reqId: req.reqId,
        });
        return result;
      } catch (error) {
        lastError = error;
        this.logger.warn("Router service call failed", {
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
