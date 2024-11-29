import { getDb, initDb, locations, ridiLogger } from "@ridi-router/lib";

import { processRegionList } from "./process-region-list.ts";
import { regions, routerBin, routerVersion } from "./env-variables.ts";

initDb(locations.getDbFileLoc());
const db = getDb();

db.handlers.createUpdate("map-data", routerVersion);

ridiLogger.debug("Initialized with configuration", {
  regions,
  routerBin,
  routerVersion,
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
