import { getDb, type MapDataRecord, ridiLogger } from "@ridi-router/lib";

import { checkForHandlerStatus } from "./check-for-handler-status.ts";
import { routerBin } from "./env-variables.ts";
import PQueue from "p-queue";
import { processKml } from "./process-kml.ts";

export const cacheProcessorQueue = new PQueue({ concurrency: 1 });

export async function generateCache(mapDataRecord: MapDataRecord) {
  const db = getDb();

  ridiLogger.debug("Starting cache generation for record", {
    id: mapDataRecord.id,
    region: mapDataRecord.region,
  });
  db.mapData.updateRecordProcessing(mapDataRecord.id);
  const cmd = new Deno.Command(routerBin, {
    args: [
      "cache",
      "-i",
      mapDataRecord.pbf_location,
      "-c",
      mapDataRecord.cache_location,
    ],
  });

  const { code, stdout, stderr } = await cmd.output();

  const stdoutOutput = new TextDecoder().decode(stdout);
  const stderrOutput = new TextDecoder().decode(stderr);
  ridiLogger.debug("Cache generation process output", {
    id: mapDataRecord.id,
    stdout: stdoutOutput,
    stderr: stderrOutput,
  });
  await processKml(mapDataRecord);
  db.mapData.updateRecordReady(mapDataRecord.id);
  if (code !== 0) {
    ridiLogger.error("Cache generation failed", {
      id: mapDataRecord.id,
      code,
      stderr: stderrOutput,
    });
    db.mapData.updateRecordError(
      mapDataRecord.id,
      `stdout: ${stdoutOutput}\n\nstderr: ${stderrOutput}`,
    );
  }

  checkForHandlerStatus();
}
