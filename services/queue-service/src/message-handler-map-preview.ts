import {
  routeUpdateMapPreview,
  routeGet,
  planGetById,
  planUpdateMapPreview,
} from "@ridi/db-queries";
import { type RidiLogger } from "@ridi/logger";
import type postgres from "postgres";

import { type MapPreviewServiceClient } from "./map-preview-service-client";

export class MessageHandlerMapPreview {
  private readonly logger: RidiLogger;
  private readonly pgClient: postgres.Sql;
  private readonly mapPreviewServiceClient: MapPreviewServiceClient;

  constructor(
    logger: RidiLogger,
    pgClient: postgres.Sql,
    mapPreviewServiceClient: MapPreviewServiceClient,
  ) {
    this.logger = logger.withContext({ module: "message-handler-map-preview" });
    this.pgClient = pgClient;
    this.mapPreviewServiceClient = mapPreviewServiceClient;
  }

  async handleRouteMapPreview(routeId: string) {
    const routeRecord = await routeGet(this.pgClient, {
      id: routeId,
    });
    if (!routeRecord) {
      throw this.logger.error("Route record not found", { routeId });
    }

    if (routeRecord.isDeleted) {
      return;
    }

    const response = await this.mapPreviewServiceClient.callMapPreviewService({
      type: "route",
      reqId: routeId,
      route: (routeRecord.latLonArray as unknown as [number, number][]).filter(
        (_c, i) => i % Math.ceil(routeRecord.latLonArray.length / 25) === 0,
      ),
    });

    if (response.status !== 200) {
      throw this.logger.error("Failure received from map preview service", {
        ...response,
      });
    }

    const { urlDark, urlLight } = response.body;

    await routeUpdateMapPreview(this.pgClient, {
      id: routeId,
      mapPreviewLight: urlLight,
      mapPreviewDark: urlDark,
    });
  }

  async handlePlanMapPreview(planId: string) {
    const planRecord = await planGetById(this.pgClient, { id: planId });
    if (!planRecord) {
      throw this.logger.error("Plan record not found", { planId });
    }

    const response = await this.mapPreviewServiceClient.callMapPreviewService(
      planRecord.tripType === "start-finish"
        ? {
            type: "plan-start-finish",
            reqId: planId,
            start: [Number(planRecord.startLat), Number(planRecord.startLon)],
            finish: [
              Number(planRecord.finishLat),
              Number(planRecord.finishLon),
            ],
          }
        : {
            type: "plan-round-trip",
            reqId: planId,
            start: [Number(planRecord.startLat), Number(planRecord.startLon)],
            bearing: Number(planRecord.bearing),
            distance: Number(planRecord.distance),
          },
    );

    if (response.status !== 200) {
      throw this.logger.error("Failure received from map preview service", {
        ...response,
      });
    }

    const { urlDark, urlLight } = response.body;

    await planUpdateMapPreview(this.pgClient, {
      id: planId,
      mapPreviewLight: urlLight,
      mapPreviewDark: urlDark,
    });
  }
}
