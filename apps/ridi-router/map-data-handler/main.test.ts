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
import { closePgClient, getPgClient } from "./pg-client.ts";
import { DenoFileReader, KmlConverter, KmlProcessor } from "./kml-processor.ts";
import { FileDownloader, RegionDownloader } from "./region-downloader.ts";
import { OsmLocations } from "./osm-locations.ts";
import { expect } from "jsr:@std/expect";

const resetEnvValues = () => {
  Deno.env.set("RIDI_ROUTER_BIN", "../.ridi-data/ridi-router");
  Deno.env.set("RIDI_ROUTER_VERSION", "v0.1.0");
  Deno.env.set(
    "SUPABASE_DB_URL",
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  );
  Deno.env.set("RIDI_ENV", "test");
  Deno.env.set("RIDI_ENV_NAME", "map-data-handler");
  Deno.env.set("REGION_LIST", "./test-fixtures/region-list-test.json");
  Deno.env.set("RIDI_DATA_DIR", "../.ridi-data");
  Deno.env.set("OPEN_OBSERVE_TOKEN", "ssss");
  Deno.env.set("OPEN_OBSERVE_ORG", "ooo");
  Deno.env.set("OSM_DATA_BASE_URL", "http://localhost:2727");
};

const getSqlite = () => {
  initDb(new Locations(new BaseEnvVariables()).getDbFileLoc());
  return getDb();
};

const testValues = { md5: "md5", fileCalls: [] as string[] };

const startOsmFileServer = (calls?: string[]) => {
  return Deno.serve({ port: 2727 }, async (req) => {
    calls?.push(req.url);
    if (req.url.search(".pbf.md5") !== -1) {
      return new Response(
        `${testValues.md5}  monaco-latest.osm.pbf`,
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
  const baseEnv = new BaseEnvVariables();
  const envVariables = new EnvVariables();
  const ridiLogger = RidiLogger.get(baseEnv);
  const locations = new Locations(baseEnv);

  initDb(locations.getDbFileLoc());
  const db = getDb();

  db.handlers.createUpdate("map-data", envVariables.routerVersion);

  const handler = new Handler(
    db,
    envVariables,
    ridiLogger,
  );
  const cacheGenerator = new CacheGenerator(
    db,
    new DenoCommand(),
    ridiLogger,
    envVariables,
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
    envVariables,
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
      envVariables,
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

  await closePgClient();
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

  resetEnvValues();

  testValues.md5 = "some-md5-value";

  const server = startOsmFileServer();

  try {
    await runProcessor();
  } catch (err) {
    console.log(JSON.stringify(err));
    console.error(err);
    throw err;
  }

  await server.shutdown();

  const db = getSqlite();

  const handlerRec = db.handlers.get("map-data");

  expect(handlerRec).toEqual(expect.objectContaining({
    status: "done",
    router_version: "v0.1.0",
  }));

  Deno.lstatSync(
    "../.ridi-data/cache/v0.1.0/europe/andorra/some-md5-value",
  );
  Deno.lstatSync(
    "../.ridi-data/pbf/europe/andorra/some-md5-value/osm.kml",
  );
  Deno.lstatSync(
    "../.ridi-data/pbf/europe/andorra/some-md5-value/osm.pbf",
  );
  let mapDataRecords = db.mapData.getRecordNext("europe/andorra");
  expect(mapDataRecords).toEqual(expect.objectContaining({
    region: "europe/andorra",
    version: "next",
    status: "ready",
    pbf_location: "../.ridi-data/pbf/europe/andorra/some-md5-value/osm.pbf",
    pbf_md5: "some-md5-value",
    cache_location: "../.ridi-data/cache/v0.1.0/europe/andorra/some-md5-value",
    router_version: "v0.1.0",
    kml_location: "../.ridi-data/pbf/europe/andorra/some-md5-value/osm.kml",
  }));

  Deno.lstatSync(
    "../.ridi-data/cache/v0.1.0/europe/isle-of-man/some-md5-value",
  );
  Deno.lstatSync(
    "../.ridi-data/pbf/europe/isle-of-man/some-md5-value/osm.kml",
  );
  Deno.lstatSync(
    "../.ridi-data/pbf/europe/isle-of-man/some-md5-value/osm.pbf",
  );
  mapDataRecords = db.mapData.getRecordNext("europe/isle-of-man");
  expect(mapDataRecords).toEqual(expect.objectContaining({
    region: "europe/isle-of-man",
    version: "next",
    status: "ready",
    pbf_location: "../.ridi-data/pbf/europe/isle-of-man/some-md5-value/osm.pbf",
    pbf_md5: "some-md5-value",
    cache_location:
      "../.ridi-data/cache/v0.1.0/europe/isle-of-man/some-md5-value",
    router_version: "v0.1.0",
    kml_location: "../.ridi-data/pbf/europe/isle-of-man/some-md5-value/osm.kml",
  }));

  Deno.lstatSync(
    "../.ridi-data/cache/v0.1.0/europe/malta/some-md5-value",
  );
  Deno.lstatSync(
    "../.ridi-data/pbf/europe/malta/some-md5-value/osm.kml",
  );
  Deno.lstatSync(
    "../.ridi-data/pbf/europe/malta/some-md5-value/osm.pbf",
  );
  mapDataRecords = db.mapData.getRecordNext("europe/malta");
  expect(mapDataRecords).toEqual(expect.objectContaining({
    region: "europe/malta",
    version: "next",
    status: "ready",
    pbf_location: "../.ridi-data/pbf/europe/malta/some-md5-value/osm.pbf",
    pbf_md5: "some-md5-value",
    cache_location: "../.ridi-data/cache/v0.1.0/europe/malta/some-md5-value",
    router_version: "v0.1.0",
    kml_location: "../.ridi-data/pbf/europe/malta/some-md5-value/osm.kml",
  }));
});

Deno.test(
  "should not download or process anything if md5 or router version the same for next",
  async () => {
    maybeRemove("../.ridi-data/db");
    maybeRemove("../.ridi-data/cache");
    maybeRemove("../.ridi-data/pbf");

    resetEnvValues();

    testValues.md5 = "some-md5-value";

    const fileServerCalls: string[] = [];
    const server = startOsmFileServer(fileServerCalls);
    const db = getSqlite();

    try {
      await runProcessor();
      Deno.env.set("RIDI_ROUTER_BIN", "wrong value");
      await runProcessor();
    } catch (err) {
      console.log(JSON.stringify(err));
      console.error(err);
      throw err;
    }

    await server.shutdown();

    expect(
      fileServerCalls.filter((url) => url.endsWith("malta-latest.osm.pbf"))
        .length,
    )
      .toEqual(1);

    expect(
      fileServerCalls.filter((url) => url.endsWith("andorra-latest.osm.pbf"))
        .length,
    )
      .toEqual(1);

    expect(
      fileServerCalls.filter((url) =>
        url.endsWith("isle-of-man-latest.osm.pbf")
      )
        .length,
    )
      .toEqual(1);

    const handlerRec = db.handlers.get("map-data");
    expect(handlerRec).toEqual(expect.objectContaining({
      status: "done",
      router_version: "v0.1.0",
    }));

    Deno.lstatSync(
      "../.ridi-data/cache/v0.1.0/europe/andorra/some-md5-value",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/andorra/some-md5-value/osm.kml",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/andorra/some-md5-value/osm.pbf",
    );
    let mapDataRecords = db.mapData.getRecordNext("europe/andorra");
    expect(mapDataRecords).toEqual(expect.objectContaining({
      region: "europe/andorra",
      version: "next",
      status: "ready",
      pbf_location: "../.ridi-data/pbf/europe/andorra/some-md5-value/osm.pbf",
      pbf_md5: "some-md5-value",
      cache_location:
        "../.ridi-data/cache/v0.1.0/europe/andorra/some-md5-value",
      router_version: "v0.1.0",
      kml_location: "../.ridi-data/pbf/europe/andorra/some-md5-value/osm.kml",
    }));

    Deno.lstatSync(
      "../.ridi-data/cache/v0.1.0/europe/isle-of-man/some-md5-value",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/isle-of-man/some-md5-value/osm.kml",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/isle-of-man/some-md5-value/osm.pbf",
    );
    mapDataRecords = db.mapData.getRecordNext("europe/isle-of-man");
    expect(mapDataRecords).toEqual(expect.objectContaining({
      region: "europe/isle-of-man",
      version: "next",
      status: "ready",
      pbf_location:
        "../.ridi-data/pbf/europe/isle-of-man/some-md5-value/osm.pbf",
      pbf_md5: "some-md5-value",
      cache_location:
        "../.ridi-data/cache/v0.1.0/europe/isle-of-man/some-md5-value",
      router_version: "v0.1.0",
      kml_location:
        "../.ridi-data/pbf/europe/isle-of-man/some-md5-value/osm.kml",
    }));

    Deno.lstatSync(
      "../.ridi-data/cache/v0.1.0/europe/malta/some-md5-value",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/malta/some-md5-value/osm.kml",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/malta/some-md5-value/osm.pbf",
    );
    mapDataRecords = db.mapData.getRecordNext("europe/malta");
    expect(mapDataRecords).toEqual(expect.objectContaining({
      region: "europe/malta",
      version: "next",
      status: "ready",
      pbf_location: "../.ridi-data/pbf/europe/malta/some-md5-value/osm.pbf",
      pbf_md5: "some-md5-value",
      cache_location: "../.ridi-data/cache/v0.1.0/europe/malta/some-md5-value",
      router_version: "v0.1.0",
      kml_location: "../.ridi-data/pbf/europe/malta/some-md5-value/osm.kml",
    }));
  },
);
Deno.test(
  "should not download or process anything if md5 or router version the same for current",
  async () => {
    maybeRemove("../.ridi-data/db");
    maybeRemove("../.ridi-data/cache");
    maybeRemove("../.ridi-data/pbf");

    resetEnvValues();

    testValues.md5 = "some-md5-value";

    const fileServerCalls: string[] = [];
    const server = startOsmFileServer(fileServerCalls);
    const db = getSqlite();

    try {
      await runProcessor();
      db.db.sql`update map_data set version = 'current'`;
      Deno.env.set("RIDI_ROUTER_BIN", "wrong value");
      await runProcessor();
    } catch (err) {
      console.log(JSON.stringify(err));
      console.error(err);
      throw err;
    }

    await server.shutdown();

    expect(
      fileServerCalls.filter((url) => url.endsWith("malta-latest.osm.pbf"))
        .length,
    )
      .toEqual(1);

    expect(
      fileServerCalls.filter((url) => url.endsWith("andorra-latest.osm.pbf"))
        .length,
    )
      .toEqual(1);

    expect(
      fileServerCalls.filter((url) =>
        url.endsWith("isle-of-man-latest.osm.pbf")
      )
        .length,
    )
      .toEqual(1);

    const handlerRec = db.handlers.get("map-data");
    expect(handlerRec).toEqual(expect.objectContaining({
      status: "done",
      router_version: "v0.1.0",
    }));

    Deno.lstatSync(
      "../.ridi-data/cache/v0.1.0/europe/andorra/some-md5-value",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/andorra/some-md5-value/osm.kml",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/andorra/some-md5-value/osm.pbf",
    );
    let mapDataRecords = db.mapData.getRecordCurrent("europe/andorra");
    expect(mapDataRecords).toEqual(expect.objectContaining({
      region: "europe/andorra",
      version: "current",
      status: "ready",
      pbf_location: "../.ridi-data/pbf/europe/andorra/some-md5-value/osm.pbf",
      pbf_md5: "some-md5-value",
      cache_location:
        "../.ridi-data/cache/v0.1.0/europe/andorra/some-md5-value",
      router_version: "v0.1.0",
      kml_location: "../.ridi-data/pbf/europe/andorra/some-md5-value/osm.kml",
    }));

    Deno.lstatSync(
      "../.ridi-data/cache/v0.1.0/europe/isle-of-man/some-md5-value",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/isle-of-man/some-md5-value/osm.kml",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/isle-of-man/some-md5-value/osm.pbf",
    );
    mapDataRecords = db.mapData.getRecordCurrent("europe/isle-of-man");
    expect(mapDataRecords).toEqual(expect.objectContaining({
      region: "europe/isle-of-man",
      version: "current",
      status: "ready",
      pbf_location:
        "../.ridi-data/pbf/europe/isle-of-man/some-md5-value/osm.pbf",
      pbf_md5: "some-md5-value",
      cache_location:
        "../.ridi-data/cache/v0.1.0/europe/isle-of-man/some-md5-value",
      router_version: "v0.1.0",
      kml_location:
        "../.ridi-data/pbf/europe/isle-of-man/some-md5-value/osm.kml",
    }));

    Deno.lstatSync(
      "../.ridi-data/cache/v0.1.0/europe/malta/some-md5-value",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/malta/some-md5-value/osm.kml",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/malta/some-md5-value/osm.pbf",
    );
    mapDataRecords = db.mapData.getRecordCurrent("europe/malta");
    expect(mapDataRecords).toEqual(expect.objectContaining({
      region: "europe/malta",
      version: "current",
      status: "ready",
      pbf_location: "../.ridi-data/pbf/europe/malta/some-md5-value/osm.pbf",
      pbf_md5: "some-md5-value",
      cache_location: "../.ridi-data/cache/v0.1.0/europe/malta/some-md5-value",
      router_version: "v0.1.0",
      kml_location: "../.ridi-data/pbf/europe/malta/some-md5-value/osm.kml",
    }));
  },
);

Deno.test(
  "should mark old md5 records as discarded and delete, check next",
  async () => {
    maybeRemove("../.ridi-data/db");
    maybeRemove("../.ridi-data/cache");
    maybeRemove("../.ridi-data/pbf");

    resetEnvValues();

    const server = startOsmFileServer();

    try {
      testValues.md5 = "some-md5-value";

      await runProcessor();

      const db = getSqlite();

      Deno.lstatSync(
        "../.ridi-data/cache/v0.1.0/europe/andorra/some-md5-value",
      );
      Deno.lstatSync(
        "../.ridi-data/pbf/europe/andorra/some-md5-value/osm.kml",
      );
      Deno.lstatSync(
        "../.ridi-data/pbf/europe/andorra/some-md5-value/osm.pbf",
      );
      let mapDataRecords = db.mapData.getRecordNext("europe/andorra");
      expect(mapDataRecords).toEqual(expect.objectContaining({
        region: "europe/andorra",
        version: "next",
        status: "ready",
        pbf_location: "../.ridi-data/pbf/europe/andorra/some-md5-value/osm.pbf",
        pbf_md5: "some-md5-value",
        cache_location:
          "../.ridi-data/cache/v0.1.0/europe/andorra/some-md5-value",
        router_version: "v0.1.0",
        kml_location: "../.ridi-data/pbf/europe/andorra/some-md5-value/osm.kml",
      }));

      Deno.lstatSync(
        "../.ridi-data/cache/v0.1.0/europe/isle-of-man/some-md5-value",
      );
      Deno.lstatSync(
        "../.ridi-data/pbf/europe/isle-of-man/some-md5-value/osm.kml",
      );
      Deno.lstatSync(
        "../.ridi-data/pbf/europe/isle-of-man/some-md5-value/osm.pbf",
      );
      mapDataRecords = db.mapData.getRecordNext("europe/isle-of-man");
      expect(mapDataRecords).toEqual(expect.objectContaining({
        region: "europe/isle-of-man",
        version: "next",
        status: "ready",
        pbf_location:
          "../.ridi-data/pbf/europe/isle-of-man/some-md5-value/osm.pbf",
        pbf_md5: "some-md5-value",
        cache_location:
          "../.ridi-data/cache/v0.1.0/europe/isle-of-man/some-md5-value",
        router_version: "v0.1.0",
        kml_location:
          "../.ridi-data/pbf/europe/isle-of-man/some-md5-value/osm.kml",
      }));

      Deno.lstatSync(
        "../.ridi-data/cache/v0.1.0/europe/malta/some-md5-value",
      );
      Deno.lstatSync(
        "../.ridi-data/pbf/europe/malta/some-md5-value/osm.kml",
      );
      Deno.lstatSync(
        "../.ridi-data/pbf/europe/malta/some-md5-value/osm.pbf",
      );
      mapDataRecords = db.mapData.getRecordNext("europe/malta");
      expect(mapDataRecords).toEqual(expect.objectContaining({
        region: "europe/malta",
        version: "next",
        status: "ready",
        pbf_location: "../.ridi-data/pbf/europe/malta/some-md5-value/osm.pbf",
        pbf_md5: "some-md5-value",
        cache_location:
          "../.ridi-data/cache/v0.1.0/europe/malta/some-md5-value",
        router_version: "v0.1.0",
        kml_location: "../.ridi-data/pbf/europe/malta/some-md5-value/osm.kml",
      }));

      testValues.md5 = "new-md5";

      await runProcessor();
    } catch (err) {
      console.log(JSON.stringify(err));
      console.error(err);
      throw err;
    }

    await server.shutdown();

    const db = getDb();

    expect(() =>
      Deno.lstatSync(
        "../.ridi-data/cache/v0.1.0/europe/andorra/some-md5-value",
      )
    ).toThrow();
    expect(() =>
      Deno.lstatSync(
        "../.ridi-data/pbf/europe/andorra/some-md5-value/osm.kml",
      )
    ).toThrow();
    expect(() =>
      Deno.lstatSync(
        "../.ridi-data/pbf/europe/andorra/some-md5-value/osm.pbf",
      )
    ).toThrow();

    expect(() =>
      Deno.lstatSync(
        "../.ridi-data/cache/v0.1.0/europe/isle-of-man/some-md5-value",
      )
    ).toThrow();
    expect(() =>
      Deno.lstatSync(
        "../.ridi-data/pbf/europe/isle-of-man/some-md5-value/osm.kml",
      )
    ).toThrow();
    expect(() =>
      Deno.lstatSync(
        "../.ridi-data/pbf/europe/isle-of-man/some-md5-value/osm.pbf",
      )
    ).toThrow();

    expect(() =>
      Deno.lstatSync(
        "../.ridi-data/cache/v0.1.0/europe/malta/some-md5-value",
      )
    ).toThrow();
    expect(() =>
      Deno.lstatSync(
        "../.ridi-data/pbf/europe/malta/some-md5-value/osm.kml",
      )
    ).toThrow();
    expect(() =>
      Deno.lstatSync(
        "../.ridi-data/pbf/europe/malta/some-md5-value/osm.pbf",
      )
    ).toThrow();

    Deno.lstatSync(
      "../.ridi-data/cache/v0.1.0/europe/andorra/new-md5",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/andorra/new-md5/osm.kml",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/andorra/new-md5/osm.pbf",
    );
    let mapDataRecords = db.mapData.getRecordNext("europe/andorra");
    expect(mapDataRecords).toEqual(expect.objectContaining({
      region: "europe/andorra",
      version: "next",
      status: "ready",
      pbf_location: "../.ridi-data/pbf/europe/andorra/new-md5/osm.pbf",
      pbf_md5: "new-md5",
      cache_location: "../.ridi-data/cache/v0.1.0/europe/andorra/new-md5",
      router_version: "v0.1.0",
      kml_location: "../.ridi-data/pbf/europe/andorra/new-md5/osm.kml",
    }));

    Deno.lstatSync(
      "../.ridi-data/cache/v0.1.0/europe/isle-of-man/new-md5",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/isle-of-man/new-md5/osm.kml",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/isle-of-man/new-md5/osm.pbf",
    );
    mapDataRecords = db.mapData.getRecordNext("europe/isle-of-man");
    expect(mapDataRecords).toEqual(expect.objectContaining({
      region: "europe/isle-of-man",
      version: "next",
      status: "ready",
      pbf_location: "../.ridi-data/pbf/europe/isle-of-man/new-md5/osm.pbf",
      pbf_md5: "new-md5",
      cache_location: "../.ridi-data/cache/v0.1.0/europe/isle-of-man/new-md5",
      router_version: "v0.1.0",
      kml_location: "../.ridi-data/pbf/europe/isle-of-man/new-md5/osm.kml",
    }));

    Deno.lstatSync(
      "../.ridi-data/cache/v0.1.0/europe/malta/new-md5",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/malta/new-md5/osm.kml",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/malta/new-md5/osm.pbf",
    );
    mapDataRecords = db.mapData.getRecordNext("europe/malta");
    expect(mapDataRecords).toEqual(expect.objectContaining({
      region: "europe/malta",
      version: "next",
      status: "ready",
      pbf_location: "../.ridi-data/pbf/europe/malta/new-md5/osm.pbf",
      pbf_md5: "new-md5",
      cache_location: "../.ridi-data/cache/v0.1.0/europe/malta/new-md5",
      router_version: "v0.1.0",
      kml_location: "../.ridi-data/pbf/europe/malta/new-md5/osm.kml",
    }));
  },
);
Deno.test(
  "should check current and prepare next on new md5",
  async () => {
    maybeRemove("../.ridi-data/db");
    maybeRemove("../.ridi-data/cache");
    maybeRemove("../.ridi-data/pbf");

    resetEnvValues();

    const server = startOsmFileServer();

    try {
      testValues.md5 = "some-md5-value";

      await runProcessor();

      const db = getSqlite();

      Deno.lstatSync(
        "../.ridi-data/cache/v0.1.0/europe/andorra/some-md5-value",
      );
      Deno.lstatSync(
        "../.ridi-data/pbf/europe/andorra/some-md5-value/osm.kml",
      );
      Deno.lstatSync(
        "../.ridi-data/pbf/europe/andorra/some-md5-value/osm.pbf",
      );
      let mapDataRecords = db.mapData.getRecordNext("europe/andorra");
      expect(mapDataRecords).toEqual(expect.objectContaining({
        region: "europe/andorra",
        version: "next",
        status: "ready",
        pbf_location: "../.ridi-data/pbf/europe/andorra/some-md5-value/osm.pbf",
        pbf_md5: "some-md5-value",
        cache_location:
          "../.ridi-data/cache/v0.1.0/europe/andorra/some-md5-value",
        router_version: "v0.1.0",
        kml_location: "../.ridi-data/pbf/europe/andorra/some-md5-value/osm.kml",
      }));

      Deno.lstatSync(
        "../.ridi-data/cache/v0.1.0/europe/isle-of-man/some-md5-value",
      );
      Deno.lstatSync(
        "../.ridi-data/pbf/europe/isle-of-man/some-md5-value/osm.kml",
      );
      Deno.lstatSync(
        "../.ridi-data/pbf/europe/isle-of-man/some-md5-value/osm.pbf",
      );
      mapDataRecords = db.mapData.getRecordNext("europe/isle-of-man");
      expect(mapDataRecords).toEqual(expect.objectContaining({
        region: "europe/isle-of-man",
        version: "next",
        status: "ready",
        pbf_location:
          "../.ridi-data/pbf/europe/isle-of-man/some-md5-value/osm.pbf",
        pbf_md5: "some-md5-value",
        cache_location:
          "../.ridi-data/cache/v0.1.0/europe/isle-of-man/some-md5-value",
        router_version: "v0.1.0",
        kml_location:
          "../.ridi-data/pbf/europe/isle-of-man/some-md5-value/osm.kml",
      }));

      Deno.lstatSync(
        "../.ridi-data/cache/v0.1.0/europe/malta/some-md5-value",
      );
      Deno.lstatSync(
        "../.ridi-data/pbf/europe/malta/some-md5-value/osm.kml",
      );
      Deno.lstatSync(
        "../.ridi-data/pbf/europe/malta/some-md5-value/osm.pbf",
      );
      mapDataRecords = db.mapData.getRecordNext("europe/malta");
      expect(mapDataRecords).toEqual(expect.objectContaining({
        region: "europe/malta",
        version: "next",
        status: "ready",
        pbf_location: "../.ridi-data/pbf/europe/malta/some-md5-value/osm.pbf",
        pbf_md5: "some-md5-value",
        cache_location:
          "../.ridi-data/cache/v0.1.0/europe/malta/some-md5-value",
        router_version: "v0.1.0",
        kml_location: "../.ridi-data/pbf/europe/malta/some-md5-value/osm.kml",
      }));

      testValues.md5 = "new-md5";

      db.db.sql`update map_data set version = 'current'`;

      await runProcessor();
    } catch (err) {
      console.log(JSON.stringify(err));
      console.error(err);
      throw err;
    }

    await server.shutdown();

    const db = getDb();

    Deno.lstatSync(
      "../.ridi-data/cache/v0.1.0/europe/andorra/new-md5",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/andorra/new-md5/osm.kml",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/andorra/new-md5/osm.pbf",
    );
    let mapDataRecords = db.mapData.getRecordNext("europe/andorra");
    expect(mapDataRecords).toEqual(expect.objectContaining({
      region: "europe/andorra",
      version: "next",
      status: "ready",
      pbf_location: "../.ridi-data/pbf/europe/andorra/new-md5/osm.pbf",
      pbf_md5: "new-md5",
      cache_location: "../.ridi-data/cache/v0.1.0/europe/andorra/new-md5",
      router_version: "v0.1.0",
      kml_location: "../.ridi-data/pbf/europe/andorra/new-md5/osm.kml",
    }));

    Deno.lstatSync(
      "../.ridi-data/cache/v0.1.0/europe/isle-of-man/new-md5",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/isle-of-man/new-md5/osm.kml",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/isle-of-man/new-md5/osm.pbf",
    );
    mapDataRecords = db.mapData.getRecordNext("europe/isle-of-man");
    expect(mapDataRecords).toEqual(expect.objectContaining({
      region: "europe/isle-of-man",
      version: "next",
      status: "ready",
      pbf_location: "../.ridi-data/pbf/europe/isle-of-man/new-md5/osm.pbf",
      pbf_md5: "new-md5",
      cache_location: "../.ridi-data/cache/v0.1.0/europe/isle-of-man/new-md5",
      router_version: "v0.1.0",
      kml_location: "../.ridi-data/pbf/europe/isle-of-man/new-md5/osm.kml",
    }));

    Deno.lstatSync(
      "../.ridi-data/cache/v0.1.0/europe/malta/new-md5",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/malta/new-md5/osm.kml",
    );
    Deno.lstatSync(
      "../.ridi-data/pbf/europe/malta/new-md5/osm.pbf",
    );
    mapDataRecords = db.mapData.getRecordNext("europe/malta");
    expect(mapDataRecords).toEqual(expect.objectContaining({
      region: "europe/malta",
      version: "next",
      status: "ready",
      pbf_location: "../.ridi-data/pbf/europe/malta/new-md5/osm.pbf",
      pbf_md5: "new-md5",
      cache_location: "../.ridi-data/cache/v0.1.0/europe/malta/new-md5",
      router_version: "v0.1.0",
      kml_location: "../.ridi-data/pbf/europe/malta/new-md5/osm.kml",
    }));
  },
);
