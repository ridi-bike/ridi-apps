import { getDb, MapDataRecord } from "@ridi-router/lib";

import type { RidiLogger } from "@ridi-router/logging/main.ts";
import { EnvVariables } from "./env-variables.ts";

export class Handler {
  constructor(
    private readonly db: ReturnType<typeof getDb>,
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

  public checkStatus(): void {
    this.logger.debug("Checking handler status");

    const nextRecords = this.db.mapData.getRecordsAllNext();

    if (this.areAllRegionsProcessed(nextRecords)) {
      this.logger.debug("All regions processed, setting handler to idle");
      this.db.handlers.updateRecordDone("map-data");
    } else {
      this.db.handlers.updateRecordUpdatedAt("map-data");
    }
  }
}
