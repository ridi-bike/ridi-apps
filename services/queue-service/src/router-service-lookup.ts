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

  callRouterService(region: string, req: RouteReq) {
    const routerServiceUrl = env.ROUTER_SERVICE_LIST[region];

    if (!routerServiceUrl) {
      throw this.logger.error("Router service url not found", { region });
    }

    const client = initClient(ridiRouterContract, {
      baseUrl: routerServiceUrl,
    });
    return client.generateRoute({
      body: req,
    });
  }
}
