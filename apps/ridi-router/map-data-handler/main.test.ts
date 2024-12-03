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
import { OsmLocations } from "./osm-locations.ts";

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
Deno.env.set("OSM_DATA_BASE_URL", "http://localhost:2727");
let TEST_MD5 = "1f370e6cd39db4300bd21e178d85e9f0";

const startOsmFileServer = () => {
  return Deno.serve({ port: 2727 }, async (req) => {
    if (req.url.search(".pbf.md5") !== -1) {
      return new Response(
        `${TEST_MD5}  monaco-latest.osm.pbf`,
      );
    }
    if (req.url.search(".pbf") !== -1) {
      const file = await Deno.open(
        "./test-fixtures/monaco-latest.osm.pbf",
        { read: true },
      );
      return new Response(file.readable);
    }
    if (req.url.search(".kml") !== -1) {
      const file = await Deno.open(
        "./test-fixtures/monaco.kml",
        { read: true },
      );
      return new Response(file.readable);
    }
    return new Response("nok", {
      status: 404,
    });
  });
};

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
      new OsmLocations(envVariables),
    ),
    pg,
    getPgClient(),
    new Md5Downloader(ridiLogger, new OsmLocations(envVariables)),
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

  const server = startOsmFileServer();
  server.ref;
  try {
    await runProcessor();
  } catch (err) {
    console.log(JSON.stringify(err));
    console.error(err);
    throw err;
  }
  server.shutdown();
});
