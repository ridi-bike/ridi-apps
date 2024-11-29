import { getDb, pg, ridiLogger } from "@ridi-router/lib";

import { pgClient } from "./pg.ts";
import { regions, routerVersion } from "./env-variables.ts";
import { downloadRegion } from "./download-region.ts";
import { cacheProcessorQueue, generateCache } from "./generate-cache.ts";
import { checkForHandlerStatus } from "./check-for-handler-status.ts";
import { Cleaner, DenoRemove } from "./process-cleanup.ts";

export async function processRegionList() {
  const db = getDb();

  ridiLogger.debug("Starting region list processing");

  db.handlers.updateRecordProcessing("map-data");

  for (const region of regions) {
    ridiLogger.debug("Processing region", { region });

    const remoteMd5Url =
      `https://download.geofabrik.de/${region}-latest.osm.pbf.md5`;

    ridiLogger.debug("Fetching MD5 for region", { region, remoteMd5Url });

    const remoteMd5File = await fetch(remoteMd5Url, { redirect: "follow" });
    const remoteMd5 = (await remoteMd5File.text()).split(" ")[0];

    ridiLogger.debug("Remote MD5", { remoteMd5 });

    const nextMapData = db.mapData.getRecordNext(region);

    ridiLogger.debug("Next Map Data Record", { ...nextMapData });

    if (nextMapData) {
      if (
        remoteMd5 !== nextMapData.pbf_md5 || nextMapData.status === "error" ||
        nextMapData.router_version !== routerVersion
      ) {
        ridiLogger.debug("discarding and downloading region", {
          remoteMd5,
          routerVersion,
        });
        db.mapData.updateRecordDiscarded(nextMapData.id);
        await pg.regionSetDiscarded(pgClient, {
          region: nextMapData.region,
          pbfMd5: nextMapData.pbf_md5,
        });
        await downloadRegion(region, remoteMd5, null);
      } else if (nextMapData.status === "new") {
        ridiLogger.debug("Status new, downloading region");
        await downloadRegion(region, remoteMd5, nextMapData);
      } else if (
        nextMapData.status === "downloaded" ||
        nextMapData.status === "processing"
      ) {
        ridiLogger.debug("Status {status}, processing", {
          status: nextMapData.status,
        });
        cacheProcessorQueue.add(() => generateCache(nextMapData));
      }
    } else {
      const currentMapData = db.mapData.getRecordCurrent(region);
      ridiLogger.debug("Current Map Data Record", { ...currentMapData });
      if (currentMapData) {
        if (
          remoteMd5 !== currentMapData.pbf_md5 ||
          currentMapData.router_version !== routerVersion
        ) {
          ridiLogger.debug("MD5 differs, downloading");
          await downloadRegion(region, remoteMd5, null);
        }
      } else {
        ridiLogger.debug("no current record, downloading");
        await downloadRegion(region, remoteMd5, null);
      }
    }
  }

  ridiLogger.debug("All regions checked");

  await new Cleaner(db, pg, pgClient, ridiLogger, new DenoRemove())
    .processCleanup();

  checkForHandlerStatus();
}
