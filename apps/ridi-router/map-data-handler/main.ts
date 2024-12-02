import {
  BaseEnvVariables,
  getDb,
  initDb,
  Locations,
  pg,
  RidiLogger,
} from "@ridi-router/lib";

import { EnvVariables } from "./env-variables.ts";
import { RegionListProcessor } from "./region-list-processor.ts";
import { CacheGenerator, DenoCommand } from "./cache-generator.ts";
import { Handler } from "./handler.ts";
import { Cleaner, DenoRemove } from "./cleaner.ts";
import { getPgClient } from "./pg-client.ts";
import { DenoFileReader, KmlConverter, KmlProcessor } from "./kml-processor.ts";
import { FileDownloader, RegionDownloader } from "./region-downloader.ts";

const ridiLogger = RidiLogger.get(BaseEnvVariables.get());
const locations = new Locations(BaseEnvVariables.get());
const envVariables = EnvVariables.get();

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
  EnvVariables.get(),
  ridiLogger,
);
const cacheGenerator = new CacheGenerator(
  db,
  new DenoCommand(),
  ridiLogger,
  EnvVariables.get(),
  new KmlProcessor(
    pg,
    getPgClient(),
    new DenoFileReader(),
    new KmlConverter(),
  ),
  handler,
);
const regionProcessor = new RegionListProcessor(
  db,
  ridiLogger,
  EnvVariables.get(),
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
    EnvVariables.get(),
    db,
    ridiLogger,
    new FileDownloader(ridiLogger),
    cacheGenerator,
  ),
  pg,
  getPgClient(),
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
