import {
  baseEnvVariables,
  getDb,
  initDb,
  Locations,
  ridiLogger,
} from "@ridi-router/lib";

import { processRegionList } from "./process-region-list.ts";
import { envVariables } from "./env-variables.ts";

initDb(new Locations(baseEnvVariables).getDbFileLoc());
const db = getDb();

db.handlers.createUpdate("map-data", envVariables.routerVersion);

ridiLogger.debug("Initialized with configuration", {
  regions: envVariables.regions,
  routerBin: envVariables.routerBin,
  routerVersion: envVariables.routerVersion,
});

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
