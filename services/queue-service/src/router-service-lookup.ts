import type { RidiLogger } from "@ridi/logger";
import { ridiRouterContract, type RouteReq } from "@ridi/ridi-router-contracts";
import { initClient } from "@ts-rest/core";

export class RouterServiceLookup {
  private readonly logger: RidiLogger;

  constructor(logger: RidiLogger) {
    this.logger = logger.withContext({ module: "ridi-service-lookup" });
  }

  callRouterService(region: string, req: RouteReq) {
    // TODO lookup region
    const client = initClient(ridiRouterContract, {
      baseUrl: "http://localhost:3334",
    });
    return client.generateRoute({
      body: req,
    });
  }
}
