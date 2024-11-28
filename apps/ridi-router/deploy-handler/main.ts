import { getDb, initDb, locations, ridiLogger } from "@ridi-router/lib";
import { routerVersion } from "./env.ts";
import { checkDeploy } from "./check-deploy.ts";

initDb(locations.getDbFileLoc());

const db = getDb();
db.handlers.createUpdate("deploy", routerVersion);

ridiLogger.debug("Initialized with configuration", {
  routerVersion,
});

checkDeploy();

Deno.serve({ port: 2727, hostname: "0.0.0.0" }, (_req) => {
  const handlerRec = db.handlers.get("deploy");
  if (handlerRec) {
    return new Response("ok");
  } else {
    return new Response("nok", { status: 400 });
  }
});
