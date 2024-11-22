import { getDb, locations, ridiLogger } from "@ridi-router/lib";

import { parse, string } from "valibot";
import { coolify } from "./coolify.ts";

const routerVersion = parse(
  string("RIDI_ROUTER_VERSION env variable"),
  Deno.env.get("RIDI_ROUTER_VERSION"),
);

const db = getDb(locations.getDbFileLoc());

db.handlers.createUpdate("deploy", routerVersion);

ridiLogger.debug("Initialized with configuration", {
  routerVersion,
});

let checkInterval: number | null = null;

const deployed = {
  mapDataHandler: false,
  routerHandler: false,
};

async function checkDeploy() {
  db.handlers.updateRecordProcessing("deploy");

  const mapDataHandler = db.handlers.get("map-data");
  const routerHandler = db.handlers.get("router");

  ridiLogger.debug("Checking map data handler", { ...mapDataHandler });

  if (!deployed.mapDataHandler && mapDataHandler?.status === "done") {
    await coolify.deployMapDataHandler();
    deployed.mapDataHandler = true;
    ridiLogger.debug("Map data handler deployment triggered");
  }

  ridiLogger.debug("Checking router handler", { ...routerHandler });

  if (
    !deployed.routerHandler &&
    mapDataHandler?.router_version === routerHandler?.router_version &&
    mapDataHandler?.status === "done"
  ) {
    await coolify.deployRouterHandler();
    deployed.routerHandler = true;
    ridiLogger.debug("Router handler deployment triggered");
  }

  if (
    deployed.routerHandler && deployed.mapDataHandler && checkInterval !== null
  ) {
    ridiLogger.debug("Deployments done, clearing check interval");
    clearInterval(checkInterval);
    db.handlers.updateRecordDone("deploy");
  }
}

checkInterval = setInterval(checkDeploy, 10 * 60 * 1000);

checkDeploy();

Deno.serve({ port: 2727, hostname: "0.0.0.0" }, async (_req) => {
  return new Response("Hello, world");
});
