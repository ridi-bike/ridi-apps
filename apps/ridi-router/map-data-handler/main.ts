import {
  getDb,
  locations,
  type MapDataRecord,
  ridiLogger,
} from "@ridi-router/lib";

import { array, parse, string } from "valibot";
import PQueue from "p-queue";

const cacheProcessorQueue = new PQueue({ concurrency: 1 });

const db = getDb(locations.getDbFileLoc());

const routerBin = parse(
  string("RIDI_ROUTER_BIN env variable"),
  Deno.env.get("RIDI_ROUTER_BIN"),
);

const routerVersion = parse(
  string("RIDI_ROUTER_VERSION env variable"),
  Deno.env.get("RIDI_ROUTER_VERSION"),
);

db.handlers.createUpdate("map-data", routerVersion);

const regions = parse(
  array(string()),
  JSON.parse(Deno.readTextFileSync(locations.getRegionListFileLoc())),
);

ridiLogger.debug("Initialized with configuration", {
  regions,
  routerBin,
  routerVersion,
});

async function generateCache(mapDataRecord: MapDataRecord) {
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
async function processRegionList() {
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

    const nextMapData = db.mapData.getNextRecord(region);

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
      const currentMapData = db.mapData.getCurrentRecord(region);
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
  checkForHandlerStatus();
}

async function downloadRegion(
  region: string,
  md5: string,
  nextMapDataRecord: MapDataRecord | null,
) {
  ridiLogger.debug("Starting region download", { region, md5 });

  const remoteFileUrl =
    `https://download.geofabrik.de/${region}-latest.osm.pbf`;

  const fileLocation = await locations.getPbfFileLoc(region, md5);
  const mapDataRecord = nextMapDataRecord || db.mapData.createNextRecord(
    region,
    md5,
    fileLocation,
    routerVersion,
    await locations.getCacheDirLoc(region, routerVersion),
  );

  ridiLogger.debug("Downloading PBF file", {
    region,
    remoteFileUrl,
    fileLocation,
  });

  try {
    const fileResponse = await fetch(remoteFileUrl, { redirect: "follow" });

    if (fileResponse.body) {
      const file = await Deno.open(fileLocation, {
        write: true,
        create: true,
      });

      await fileResponse.body.pipeTo(file.writable);
      db.mapData.updateRecordDownloaded(mapDataRecord.id);
      cacheProcessorQueue.add(() => generateCache(mapDataRecord));
    } else {
      ridiLogger.error("no body in download", {
        headers: fileResponse.headers,
      });
    }
  } catch (err) {
    ridiLogger.error("Region download failed", {
      region,
      error: err,
    });
    db.mapData.updateRecordError(mapDataRecord.id, JSON.stringify(err));
  }
}

function checkForHandlerStatus() {
  ridiLogger.debug("Checking handler status");
  const nextRecords = db.mapData.getAllNextRecords();
  if (
    regions.every((r) =>
      nextRecords.find((nr) =>
        nr.region === r && (nr.status === "ready" || nr.status === "error")
      )
    )
  ) {
    ridiLogger.debug("All regions processed, setting handler to idle");
    db.handlers.updateRecordDone("map-data");
  } else {
    db.handlers.updateRecordUpdatedAt("map-data");
  }
}

processRegionList();

setInterval(processRegionList, 24 * 60 * 60 * 1000); // every 24h

Deno.serve({ port: 2727, hostname: "0.0.0.0" }, (_req) => {
  const handlerRec = db.handlers.get("map-data");
  if (handlerRec) {
    return new Response("ok");
  } else {
    return new Response("nok", { status: 400 });
  }
});
