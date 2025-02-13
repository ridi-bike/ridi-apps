import { Runner } from "./runner.ts";
import { EnvVariables } from "./env-variables.ts";
import { DenoCommand, getPgClient, pg } from "@ridi-router/lib";
import { PlanProcessor } from "./plan-processor.ts";
import { RouterServerManager } from "./router-server-manager.ts";
import { Messaging } from "@ridi-router/messaging/main.ts";
import { RidiLogger } from "@ridi-router/logging/main.ts";

const env = new EnvVariables();
const ridiLogger = RidiLogger.init(env.ridiEnvName);
const runner = new Runner(
  env,
  ridiLogger.forModule("runner"),
  getPgClient(),
  pg,
  new Messaging(getPgClient(), ridiLogger.forModule("messaging")),
  new PlanProcessor(
    ridiLogger.forModule("plan-processor"),
    getPgClient(),
    pg,
    new RouterServerManager(
      env,
      pg,
      getPgClient(),
      ridiLogger.forModule("router-server-manager"),
    ),
    new DenoCommand(),
    env,
  ),
);
await runner.start();
