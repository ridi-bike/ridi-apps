import { Runner } from "./runner.ts";
import { EnvVariables } from "./env-variables.ts";
import { DenoCommand, getPgClient, pg } from "@ridi-router/lib";
import { PlanProcessor } from "./plan-processor.ts";
import { RouterServerManager } from "./router-server-manager.ts";
import { Messaging } from "@ridi-router/messaging/main.ts";
import { RidiLogger } from "@ridi-router/logging/main.ts";
import { Initializer } from "./init.ts";

const env = new EnvVariables();
const ridiLogger = RidiLogger.init(env.ridiEnvName);

const initializer = new Initializer(
  env,
  ridiLogger.withCOntext({
    module: "initializer",
    routerVersion: env.routerVersion,
  }),
  getPgClient(),
  pg,
);
await initializer.start();

const mapDataRecordsAllCurrent =
  await pg.mapDataGetRecordsAllCurrent(getPgClient());

const runner = new Runner(
  env,
  ridiLogger.withCOntext({
    module: "runner",
    routerVersion: env.routerVersion,
  }),
  getPgClient(),
  pg,
  new Messaging(
    getPgClient(),
    ridiLogger.withCOntext({
      module: "messaging",
      routerVersion: env.routerVersion,
    }),
  ),
  new PlanProcessor(
    ridiLogger.withCOntext({
      module: "plan-processor",
      routerVersion: env.routerVersion,
    }),
    getPgClient(),
    pg,
    new RouterServerManager(
      env,
      ridiLogger.withCOntext({
        module: "router-server-manager",
        routerVersion: env.routerVersion,
      }),
      mapDataRecordsAllCurrent,
    ),
    new DenoCommand(),
    env,
  ),
);
runner.listen();
