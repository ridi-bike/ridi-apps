import { Runner } from "./runner.ts";
import { EnvVariables } from "./env-variables.ts";
import { DenoCommand, Locations, pg } from "@ridi-router/lib";
import { getPgClient } from "./pg-client.ts";
import { PlanProcessor } from "./plan-processor.ts";
import { RouterServerManager } from "./router-server-manager.ts";
import { Messaging } from "@ridi-router/messaging/main.ts";
import { RidiLogger } from "@ridi-router/logging/main.ts";

const env = new EnvVariables();
RidiLogger.init();
const ridiLogger = RidiLogger.get();
ridiLogger.debug("omg test");
const runner = new Runner(
  env,
  ridiLogger,
  getPgClient(),
  pg,
  new Messaging(getPgClient(), ridiLogger),
  new PlanProcessor(
    ridiLogger,
    getPgClient(),
    pg,
    new RouterServerManager(env, pg, getPgClient(), ridiLogger),
    new DenoCommand(),
    env,
  ),
);
await runner.start();
