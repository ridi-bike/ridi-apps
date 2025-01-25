import { getPgClient, pg } from "@ridi-router/lib";
import { RidiLogger } from "@ridi-router/logging/main.ts";
import { EnvVariables } from "./env.ts";
import { DeployChecker } from "./check-deploy.ts";
import { CoolifyClient } from "./coolify.ts";

const envVariables = EnvVariables.get();
RidiLogger.init();
const ridiLogger = RidiLogger.get();

const pgClient = getPgClient();
pg.servicesCreateUpdate(pgClient, {
  name: "deploy",
  routerVersion: envVariables.routerVersion,
});

ridiLogger.debug("Initialized with configuration", {
  routerVersion: envVariables.routerVersion,
});

const deployChecker = new DeployChecker(
  pg,
  pgClient,
  new CoolifyClient(envVariables),
  envVariables,
  ridiLogger,
);
deployChecker.start();
deployChecker.checkDeploy();

Deno.serve(
  { port: Number(envVariables.port), hostname: "0.0.0.0" },
  async (_req) => {
    const handlerRec = await pg.servicesGet(pgClient, { name: "deploy" });
    if (handlerRec) {
      return new Response("ok");
    } else {
      return new Response("nok", { status: 400 });
    }
  },
);
