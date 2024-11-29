import { getDb, initDb, locations, ridiLogger } from "@ridi-router/lib";
import { EnvVariables } from "./env.ts";
import { DeployChecker } from "./check-deploy.ts";
import { CoolifyClient } from "./coolify.ts";

const envVariables = new EnvVariables();
initDb(locations.getDbFileLoc());

const db = getDb();
db.handlers.createUpdate("deploy", envVariables.routerVersion);

ridiLogger.debug("Initialized with configuration", {
  routerVersion: envVariables.routerVersion,
});

const deployChecker = new DeployChecker(
  db,
  new CoolifyClient(envVariables),
  envVariables,
  ridiLogger,
);
deployChecker.start();
deployChecker.checkDeploy();

Deno.serve({ port: 2727, hostname: "0.0.0.0" }, (_req) => {
  const handlerRec = db.handlers.get("deploy");
  if (handlerRec) {
    return new Response("ok");
  } else {
    return new Response("nok", { status: 400 });
  }
});
