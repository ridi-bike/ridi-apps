import {
  BaseEnvVariables,
  getDb,
  initDb,
  Locations,
  pg,
  RidiLogger,
} from "@ridi-router/lib";

import { EnvVariables } from "./env-variables.ts";
import { Md5Downloader, RegionListProcessor } from "./region-list-processor.ts";
import { CacheGenerator, DenoCommand } from "./cache-generator.ts";
import { Handler } from "./handler.ts";
import { Cleaner, DenoRemove } from "./cleaner.ts";
import { getPgClient } from "./pg-client.ts";
import { DenoFileReader, KmlConverter, KmlProcessor } from "./kml-processor.ts";
import { FileDownloader, RegionDownloader } from "./region-downloader.ts";

Deno.env.set("RIDI_ROUTER_BIN", "../.ridi-data/ridi-router");
Deno.env.set("RIDI_ROUTER_VERSION", "v0.1.0");
Deno.env.set(
  "SUPABASE_DB_URL",
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
);
Deno.env.set("RIDI_ENV", "local");
Deno.env.set("RIDI_ENV_NAME", "map-data-handler");
Deno.env.set("REGION_LIST", "../region-list-local.json");
Deno.env.set("RIDI_DATA_DIR", "../.ridi-data");
Deno.env.set("OPEN_OBSERVE_TOKEN", "ssss");
Deno.env.set("OPEN_OBSERVE_ORG", "ooo");

const runProcessor = async () => {
  const ridiLogger = RidiLogger.get(BaseEnvVariables.get());
  const locations = new Locations(BaseEnvVariables.get());
  const envVariables = EnvVariables.get();

  initDb(locations.getDbFileLoc());
  const db = getDb();

  db.handlers.createUpdate("map-data", envVariables.routerVersion);

  ridiLogger.debug("Initialized with configuration", {
    regions: envVariables.regions,
    routerBin: envVariables.routerBin,
    routerVersion: envVariables.routerVersion,
  });

  const handler = new Handler(
    db,
    EnvVariables.get(),
    ridiLogger,
  );
  const cacheGenerator = new CacheGenerator(
    db,
    new DenoCommand(),
    ridiLogger,
    EnvVariables.get(),
    new KmlProcessor(
      pg,
      getPgClient(),
      new DenoFileReader(),
      new KmlConverter(),
    ),
    handler,
  );
  const regionProcessor = new RegionListProcessor(
    db,
    ridiLogger,
    EnvVariables.get(),
    cacheGenerator,
    handler,
    new Cleaner(
      db,
      pg,
      getPgClient(),
      ridiLogger,
      new DenoRemove(),
    ),
    new RegionDownloader(
      locations,
      EnvVariables.get(),
      db,
      ridiLogger,
      new FileDownloader(ridiLogger),
      cacheGenerator,
    ),
    pg,
    getPgClient(),
    new Md5Downloader(ridiLogger),
  );

  await regionProcessor.process();

  getPgClient().end();
};

function maybeRemove(path: string) {
  try {
    Deno.removeSync(path, { recursive: true });
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      throw err;
    }
  }
}
Deno.test("should download three regions and process them", async () => {
  maybeRemove("../.ridi-data/db");
  maybeRemove("../.ridi-data/cache");
  maybeRemove("../.ridi-data/pbf");

  try {
    runProcessor();
  } catch (err) {
    console.log(JSON.stringify(err));
    console.error(err);
    throw err;
  }
});
