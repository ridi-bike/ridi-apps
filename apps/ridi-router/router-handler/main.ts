import { Runner } from "./runner.ts";
import { EnvVariables } from "./env-variables.ts";
import { DenoCommand, getDb, initDb, Locations, pg } from "@ridi-router/lib";
import { getPgClient } from "./pg-client.ts";
import { PlanProcessor } from "./plan-processor.ts";
import { RouterServerManager } from "./router-server-manager.ts";
import { Messaging } from "@ridi-router/messaging/main.ts";
import { RidiLogger } from "@ridi-router/logging/main.ts";

const env = new EnvVariables();
RidiLogger.init();
const ridiLogger = RidiLogger.get();
ridiLogger.debug("omg test");
const locations = new Locations(env);
initDb(locations.getDbFileLoc());
const db = getDb();
const runner = new Runner(
  env,
  ridiLogger,
  db,
  getPgClient(),
  pg,
  new Messaging(getPgClient(), ridiLogger),
  new PlanProcessor(
    db,
    ridiLogger,
    getPgClient(),
    pg,
    new RouterServerManager(env, db, ridiLogger),
    new DenoCommand(),
    env,
  ),
);
await runner.start();
