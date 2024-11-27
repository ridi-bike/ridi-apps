import { getDb, pg, ridiLogger } from "@ridi-router/lib";
import { pgClient } from "./pg.ts";

export async function processCleanup() {
  const db = getDb();

  const cleanupRecords = db.mapData.getRecordsDiscardedAndPrevious();
  ridiLogger.debug("{count} Records for cleanup found", {
    count: cleanupRecords.length,
  });
  for (const record of cleanupRecords) {
    ridiLogger.debug("Record cleanup", { ...record });
    if (!db.mapData.isCacheDirInUse(record.cache_location)) {
      ridiLogger.debug("Cache can be removed");
      try {
        await Deno.remove(record.cache_location, { recursive: true });
      } catch (err) {
        if (!(err instanceof Deno.errors.NotFound)) {
          throw err;
        }
      }
    }
    if (!db.mapData.isPbfInUse(record.pbf_location)) {
      ridiLogger.debug("Pbf can be removed");
      try {
        await Deno.remove(record.pbf_location, { recursive: true });
      } catch (err) {
        if (!(err instanceof Deno.errors.NotFound)) {
          throw err;
        }
      }
    }

    db.mapData.deleteRecord(record.id);
    await pg.regionDeleteDiscardedAndPrevious(pgClient, {
      region: record.region,
      pbfMd5: record.pbf_md5,
    });
  }
}
