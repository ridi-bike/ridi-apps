import { getDb, initDb, locations, ridiLogger } from "@ridi-router/lib";

import { coolify } from "./coolify.ts";
import { routerVersion } from "./env.ts";

export const deployed = {
  mapDataHandler: false,
  routerHandler: false,
};

export let checkInterval: number | null = null;

export function resetDeployed() {
  deployed.mapDataHandler = false;
  deployed.routerHandler = false;
  if (checkInterval !== null) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

export async function checkDeploy() {
  const db = getDb();
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
    deployed.mapDataHandler &&
    mapDataHandler?.router_version === routerVersion &&
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

checkInterval = setInterval(checkDeploy, 60 * 1000);
