import {
  BaseEnvVariables,
  getDb,
  initDb,
  Locations,
  pg,
  RidiLogger,
} from "@ridi-router/lib";

import { EnvVariables } from "./env-variables.ts";
import { RegionListProcessor } from "./process-region-list.ts";
import { CacheGenerator, DenoCommand } from "./generate-cache.ts";
import { Handler } from "./check-for-handler-status.ts";
import { Cleaner, DenoRemove } from "./process-cleanup.ts";
import { pgClient } from "./pg.ts";
import { DenoFileReader, KmlConverter, KmlProcessor } from "./process-kml.ts";
import { RegionDownloader } from "./download-region.ts";

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
const regionProcessor = new RegionListProcessor(
  db,
  ridiLogger,
  EnvVariables.get(),
  new CacheGenerator(
    db,
    new DenoCommand(),
    ridiLogger,
    EnvVariables.get(),
    new KmlProcessor(pg, pgClient, new DenoFileReader(), new KmlConverter()),
    handler,
  ),
  handler,
  new Cleaner(
    db,
    pg,
    pgClient,
    ridiLogger,
    new DenoRemove(),
  ),
  new RegionDownloader(locations, EnvVariables.get(), db, ridiLogger),
  pg,
  pgClient,
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
