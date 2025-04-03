import { setTimeout } from "node:timers/promises";

import { type RidiLogger } from "@ridi/logger";
import { mapPreviewContract } from "@ridi/map-preview-service-contracts";
import { initClient } from "@ts-rest/core";

import { env } from "./env";

const client = initClient(mapPreviewContract, {
  baseUrl: `http://${env.MAP_PREVIEW_SERVICE_URL}`,
});

export class MapPreviewServiceClient {
  private readonly logger: RidiLogger;

  constructor(logger: RidiLogger) {
    this.logger = logger.withContext({ module: "map-preview-service-client" });
  }

  async callMapPreviewService(
    req: Parameters<(typeof client)["createPreview"]>[0]["body"],
  ) {
    this.logger.info("Calling map preview service", {
      reqId: req.reqId,
      baseUrl: `http://${env.MAP_PREVIEW_SERVICE_URL}`,
    });

    const maxRetries = 5;
    const waitTimeMs = 5000;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await client.createPreview({
          body: req,
        });
        return result;
      } catch (error) {
        lastError = error;
        this.logger.warn("Map preview service call failed", {
          reqId: req.reqId,
          attempt,
          error,
          willRetry: attempt < maxRetries,
        });

        if (attempt < maxRetries) {
          await setTimeout(waitTimeMs * attempt);
        }
      }
    }

    throw this.logger.error(
      "Map preview service call failed after all retries",
      {
        reqId: req.reqId,
        attempts: maxRetries,
        error: lastError,
      },
    );
  }
}
