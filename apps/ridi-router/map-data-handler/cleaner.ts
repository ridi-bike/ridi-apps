import { getDb, pg } from "@ridi-router/lib";
import type { RidiLogger } from "@ridi-router/lib";
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
    private readonly db: ReturnType<typeof getDb>,
    private readonly pgQueries: typeof pg,
    private readonly pgClient: PgClient,
    private readonly logger: RidiLogger,
    private readonly denoRemove: DenoRemove,
  ) {
  }

  async processCleanup(): Promise<void> {
    const cleanupRecords = this.db.mapData.getRecordsDiscardedAndPrevious();
    this.logger.debug("{count} Records for cleanup found", {
      count: cleanupRecords.length,
    });

    for (const record of cleanupRecords) {
      this.logger.debug("Record cleanup", { ...record });
      if (!this.db.mapData.isCacheDirInUse(record.cache_location)) {
        this.logger.debug("Cache can be removed");
        await this.denoRemove.remove(record.cache_location, {
          recursive: true,
        });
      }
      if (!this.db.mapData.isPbfInUse(record.pbf_location)) {
        this.logger.debug("Pbf can be removed");
        await this.denoRemove.remove(record.pbf_location);
      }

      if (!this.db.mapData.isKmlInUse(record.kml_location)) {
        this.logger.debug("Kml can be removed");
        await this.denoRemove.remove(record.kml_location);
      }

      this.db.mapData.deleteRecord(record.id);
      await this.pgQueries.regionDeleteDiscardedAndPrevious(this.pgClient, {
        region: record.region,
        pbfMd5: record.pbf_md5,
      });
    }
  }
}
