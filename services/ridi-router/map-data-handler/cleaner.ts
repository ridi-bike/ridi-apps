import { pg } from "@ridi-router/lib";
import type { RidiLogger } from "@ridi-router/logging/main.ts";
import { PgClient } from "./pg-client.ts";

export class DenoRemove {
  async remove(path: string, options?: Deno.RemoveOptions): Promise<void> {
    try {
      await Deno.remove(path, options);
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) {
        throw err;
      }
    }
  }
}

export class Cleaner {
  constructor(
    private readonly db: typeof pg,
    private readonly pgClient: PgClient,
    private readonly logger: RidiLogger,
    private readonly denoRemove: DenoRemove,
  ) {
  }

  async processCleanup(): Promise<void> {
    const cleanupRecords = await this.db
      .mapDataGetRecordsDiscardedAndPrevious(this.pgClient);

    this.logger.debug("Records for cleanup found", {
      count: cleanupRecords.length,
    });

    for (const record of cleanupRecords) {
      this.logger.debug("Record cleanup", { ...record });
      if (
        !this.db.mapDataIsCacheDirInUse(this.pgClient, {
          cacheLocation: record.cacheLocation,
        })
      ) {
        this.logger.debug("Cache can be removed");
        await this.denoRemove.remove(record.cacheLocation, {
          recursive: true,
        });
      }
      if (
        !this.db.mapDataIsPbfInUse(this.pgClient, {
          pbfLocation: record.pbfLocation,
        })
      ) {
        this.logger.debug("Pbf can be removed");
        await this.denoRemove.remove(record.pbfLocation);
      }

      if (
        !this.db.mapDataIsKmlInUse(this.pgClient, {
          kmlLocation: record.kmlLocation,
        })
      ) {
        this.logger.debug("Kml can be removed");
        await this.denoRemove.remove(record.kmlLocation);
      }

      await this.db.mapDataDeleteRecord(this.pgClient, {
        id: record.id,
      });
      await this.db.regionDeleteDiscardedAndPrevious(this.pgClient, {
        region: record.region,
        pbfMd5: record.pbfMd5,
      });
    }
  }
}
