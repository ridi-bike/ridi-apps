import {
  BaseEnvVariables,
  DenoCommand,
  getDb,
  initDb,
  Locations,
  pg,
  RidiLogger,
} from "@ridi-router/lib";

import { EnvVariables } from "./env-variables.ts";
import { Md5Downloader, RegionListProcessor } from "./region-list-processor.ts";
import { CacheGenerator, DenoDirStat } from "./cache-generator.ts";
import { Handler } from "./handler.ts";
import { Cleaner, DenoRemove } from "./cleaner.ts";
import { getPgClient } from "./pg-client.ts";
import { DenoFileReader, KmlConverter, KmlProcessor } from "./kml-processor.ts";
import { FileDownloader, RegionDownloader } from "./region-downloader.ts";
import { OsmLocations } from "./osm-locations.ts";
const baseEnv = new BaseEnvVariables();
const envVariables = new EnvVariables();
const ridiLogger = RidiLogger.get(baseEnv);
const locations = new Locations(baseEnv);

initDb(locations.getDbFileLoc());
const db = getDb();

db.handlers.createUpdate("map-data", envVariables.routerVersion);

ridiLogger.debug("Initialized with configuration", {
  regions: envVariables.regions,
  routerBin: envVariables.routerBin,
  routerVersion: envVariables.routerVersion,
});

const handler = new Handler(
  db,
  envVariables,
  ridiLogger,
);
const cacheGenerator = new CacheGenerator(
  db,
  new DenoCommand(),
  ridiLogger,
  envVariables,
  new KmlProcessor(
    pg,
    getPgClient(),
    new DenoFileReader(),
    new KmlConverter(),
  ),
  handler,
  new DenoDirStat(),
);
const regionProcessor = new RegionListProcessor(
  db,
  ridiLogger,
  envVariables,
  cacheGenerator,
  handler,
  new Cleaner(
    db,
    pg,
    getPgClient(),
    ridiLogger,
    new DenoRemove(),
  ),
  new RegionDownloader(
    locations,
    envVariables,
    db,
    ridiLogger,
    new FileDownloader(ridiLogger),
    cacheGenerator,
    new OsmLocations(envVariables),
  ),
  pg,
  getPgClient(),
  new Md5Downloader(ridiLogger, new OsmLocations(envVariables)),
);
regionProcessor.process();

setInterval(() => regionProcessor.process(), 24 * 60 * 60 * 1000); // every 24h

Deno.serve({ port: 2727, hostname: "0.0.0.0" }, (_req) => {
  const handlerRec = db.handlers.get("map-data");
  if (handlerRec) {
    return new Response("ok");
  } else {
    return new Response("nok", { status: 400 });
  }
});
