import { pg, PgClient } from "@ridi-router/lib";

import type { RidiLogger } from "@ridi-router/logging/main.ts";
import { EnvVariables } from "./env-variables.ts";
import { MapDataRecord } from "./types.ts";

export class Handler {
  constructor(
    private readonly db: typeof pg,
    private readonly pgClient: PgClient,
    private readonly env: EnvVariables,
    private readonly logger: RidiLogger,
  ) {
  }

  private areAllRegionsProcessed(nextRecords: MapDataRecord[]): boolean {
    return !nextRecords.length ||
      this.env.regions.every((r) =>
        nextRecords.find((nr) =>
          nr.region === r && (nr.status === "ready" || nr.status === "error")
        )
      );
  }

  public async checkStatus() {
    this.logger.debug("Checking handler status");

    const nextRecords = await this.db.mapDataGetRecordsAllNext(this.pgClient);

    if (this.areAllRegionsProcessed(nextRecords)) {
      this.logger.debug("All regions processed, setting handler to idle");
      await this.db.servicesUpdateRecordDone(this.pgClient, {
        name: "map-data",
      });
    } else {
      await this.db.servicesUpdateRecordUpdatedAt(this.pgClient, {
        name: "map-data",
      });
    }
  }
}
