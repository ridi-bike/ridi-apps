import { DenoCommand, getPgClient, Locations, pg } from "@ridi-router/lib";
import { RidiLogger } from "@ridi-router/logging/main.ts";
("@ridi-router/logging/main.ts");
import { BaseEnvVariables } from "@ridi-router/env/main.ts";

import { EnvVariables } from "./env-variables.ts";
import { Md5Downloader, RegionListProcessor } from "./region-list-processor.ts";
import { CacheGenerator, DenoDirStat } from "./cache-generator.ts";
import { Handler } from "./handler.ts";
import { Cleaner, DenoRemove } from "./cleaner.ts";
import { DenoFileReader, KmlConverter, KmlProcessor } from "./kml-processor.ts";
import { FileDownloader, RegionDownloader } from "./region-downloader.ts";
import { OsmLocations } from "./osm-locations.ts";

const baseEnv = new BaseEnvVariables();
const ridiLogger = RidiLogger.init(baseEnv.ridiEnvName);
const envVariables = EnvVariables.get();
const locations = new Locations(baseEnv);

await pg.servicesCreateUpdate(getPgClient(), {
  name: "map-data",
  routerVersion: envVariables.routerVersion,
});

ridiLogger.debug("Initialized with configuration", {
  regions: envVariables.regions,
  routerBin: envVariables.routerBin,
  routerVersion: envVariables.routerVersion,
});

const handler = new Handler(
  pg,
  getPgClient(),
  envVariables,
  ridiLogger.withCOntext({
    module: "handler",
    routerVersion: envVariables.routerVersion,
  }),
);
const cacheGenerator = new CacheGenerator(
  pg,
  getPgClient(),
  new DenoCommand(),
  ridiLogger.withCOntext({
    module: "cache-generator",
    routerVersion: envVariables.routerVersion,
  }),
  envVariables,
  new KmlProcessor(pg, getPgClient(), new DenoFileReader(), new KmlConverter()),
  handler,
  new DenoDirStat(),
);
const regionProcessor = new RegionListProcessor(
  ridiLogger.withCOntext({
    module: "region-list-processor",
    routerVersion: envVariables.routerVersion,
  }),
  envVariables,
  cacheGenerator,
  handler,
  new Cleaner(
    pg,
    getPgClient(),
    ridiLogger.withCOntext({
      module: "cleaner",
      routerVersion: envVariables.routerVersion,
    }),
    new DenoRemove(),
  ),
  new RegionDownloader(
    pg,
    getPgClient(),
    ridiLogger.withCOntext({
      module: "region-downloader",
      routerVersion: envVariables.routerVersion,
    }),
    new FileDownloader(
      ridiLogger.withCOntext({
        module: "file-downloader",
        routerVersion: envVariables.routerVersion,
      }),
    ),
    cacheGenerator,
    new OsmLocations(envVariables),
  ),
  pg,
  getPgClient(),
  new Md5Downloader(
    ridiLogger.withCOntext({
      module: "md5-downoader",
      routerVersion: envVariables.routerVersion,
    }),
    new OsmLocations(envVariables),
  ),
  locations,
);
regionProcessor.process();

setInterval(() => regionProcessor.process(), 24 * 60 * 60 * 1000); // every 24h

Deno.serve(
  { port: Number(envVariables.port), hostname: "0.0.0.0" },
  async (_req) => {
    const serviceRecord = await pg.servicesGet(getPgClient(), {
      name: "map-data",
    });
    if (serviceRecord) {
      return new Response("ok");
    } else {
      return new Response("nok", { status: 400 });
    }
  },
);
