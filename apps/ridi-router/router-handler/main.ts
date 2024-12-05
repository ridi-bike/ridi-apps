import { Runner } from "./runner.ts";
import { EnvVariables } from "./env-variables.ts";
import {
  DenoCommand,
  getDb,
  initDb,
  Locations,
  pg,
  RidiLogger,
} from "@ridi-router/lib";
import { getPgClient } from "./pg-client.ts";
import { Supabase } from "./supabase.ts";
import { PlanProcessor } from "./plan-processor.ts";
import { RouterStore } from "./router-store.ts";

const env = new EnvVariables();
const ridiLogger = RidiLogger.get(env);
const locations = new Locations(env);
initDb(locations.getDbFileLoc());
const db = getDb();
const runner = new Runner(
  env,
  ridiLogger,
  db,
  getPgClient(),
  pg,
  new Supabase(env, ridiLogger),
  new PlanProcessor(
    db,
    ridiLogger,
    getPgClient(),
    pg,
    new RouterStore(env, db, ridiLogger),
    new DenoCommand(),
    env,
  ),
);
await runner.start();
