import {
  getDb,
  locations,
  type MapDataRecord,
  ridiLogger,
} from "@ridi-router/lib";
import { parse, string } from "valibot";

import { cacheProcessorQueue, generateCache } from "./generate-cache.ts";

const routerVersion = parse(
  string("RIDI_ROUTER_VERSION env variable"),
  Deno.env.get("RIDI_ROUTER_VERSION"),
);

export async function downloadRegion(
  region: string,
  md5: string,
  nextMapDataRecord: MapDataRecord | null,
) {
  const db = getDb();

  ridiLogger.debug("Starting region download", { region, md5 });

  const remotePbfUrl = `https://download.geofabrik.de/${region}-latest.osm.pbf`;
  const remoteKmlUrl = `https://download.geofabrik.de/${region}.kml`;

  const pbfLocation = await locations.getPbfFileLoc(region, md5);
  const kmlLocation = await locations.getKmlLocation(region, md5);
  const mapDataRecord = nextMapDataRecord || db.mapData.createNextRecord(
    region,
    md5,
    pbfLocation,
    routerVersion,
    await locations.getCacheDirLoc(region, routerVersion, md5),
    kmlLocation,
  );

  ridiLogger.debug("Downloading PBF file", {
    region,
    remotePbfUrl,
    pbfLocation,
    kmlLocation,
  });

  try {
    await downloadFile(remoteKmlUrl, kmlLocation);
    await downloadFile(remotePbfUrl, pbfLocation);
  } catch (err) {
    ridiLogger.error("Region download failed", {
      region,
      error: err,
    });
    db.mapData.updateRecordError(mapDataRecord.id, JSON.stringify(err));
  }
}

async function downloadFile(url: string, dest: string) {
  const fileResponse = await fetch(url, { redirect: "follow" });

  if (fileResponse.body) {
    const file = await Deno.open(dest, {
      write: true,
      create: true,
    });

    await fileResponse.body.pipeTo(file.writable);
  } else {
    ridiLogger.error("no body in download", {
      headers: fileResponse.headers,
    });
  }
}
