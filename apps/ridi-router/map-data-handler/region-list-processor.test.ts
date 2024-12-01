import { assertSpyCall, assertSpyCalls, spy } from "jsr:@std/testing/mock";
import { getDb, MapDataRecord, pg, RidiLogger } from "@ridi-router/lib";
import { RegionListProcessor } from "./region-list-processor.ts";
import { EnvVariables } from "./env-variables.ts";
import { CacheGenerator } from "./cache-generator.ts";
import { Handler } from "./handler.ts";
import { Cleaner } from "./cleaner.ts";
import { RegionDownloader } from "./region-downloader.ts";
import { pgClient } from "./pg-client.ts";

const createMocks = () => {
  return {
    db: {
      mapData: {
        getRecordNext: () => null,
        getRecordCurrent: () => null,
        updateRecordDiscarded: () => undefined,
      },
      handlers: {
        updateRecordProcessing: () => undefined,
      },
    } as unknown as ReturnType<typeof getDb>,
    env: {
      regions: ["region1"],
      routerVersion: "1.0.0",
    } as EnvVariables,
    logger: {
      debug: (..._args: unknown[]) => undefined,
    } as RidiLogger,
    cacheGenerator: {
      schedule: (..._args: unknown[]) => undefined,
    } as CacheGenerator,
    handler: {
      checkStatus: () => {},
    } as Handler,
    cleaner: {
      processCleanup: () => Promise.resolve(),
    } as Cleaner,
    downloader: {
      downloadRegion: (..._args: unknown[]) => Promise.resolve(),
    } as RegionDownloader,
    pgQueries: {
      regionSetDiscarded: (..._args: unknown[]) => Promise.resolve(null),
    } as typeof pg,
    pgClient: {} as typeof pgClient,
  };
};

Deno.test("should download region when no current record exists", async () => {
  const mocks = createMocks();

  // Create spies
  const downloadSpy = spy(mocks.downloader, "downloadRegion");
  const loggerSpy = spy(mocks.logger, "debug");

  const processor = new RegionListProcessor(
    mocks.db,
    mocks.logger,
    mocks.env,
    mocks.cacheGenerator,
    mocks.handler,
    mocks.cleaner,
    mocks.downloader,
    mocks.pgQueries,
    mocks.pgClient,
  );

  // Mock fetch response
  globalThis.fetch = async () => {
    return {
      text: async () => "abc123 filename",
    } as Response;
  };

  await processor.process();

  // Verify download was called
  assertSpyCalls(downloadSpy, 1);
  assertSpyCall(downloadSpy, 0, {
    args: ["region1", "abc123", null],
  });

  // Verify logs were written
  assertSpyCalls(loggerSpy, 8);

  // Restore spies
  downloadSpy.restore();
  loggerSpy.restore();
});

Deno.test("should handle next record with different MD5", async () => {
  const mocks = createMocks();

  // Mock next record
  mocks.db.mapData.getRecordNext = () => ({
    id: 1,
    region: "region1",
    pbf_md5: "def456",
    status: "new",
    router_version: "1.0.0",
  } as MapDataRecord);

  // Create spies
  const discardSpy = spy(mocks.db.mapData, "updateRecordDiscarded");
  const pgDiscardSpy = spy(mocks.pgQueries, "regionSetDiscarded");
  const downloadSpy = spy(mocks.downloader, "downloadRegion");

  const processor = new RegionListProcessor(
    mocks.db,
    mocks.logger,
    mocks.env,
    mocks.cacheGenerator,
    mocks.handler,
    mocks.cleaner,
    mocks.downloader,
    mocks.pgQueries,
    mocks.pgClient,
  );

  // Mock fetch response
  globalThis.fetch = async (..._args: unknown[]) => {
    return {
      text: () => Promise.resolve("abc123 filename"),
    } as Response;
  };

  await processor.process();

  // Verify record was discarded
  assertSpyCalls(discardSpy, 1);
  assertSpyCall(discardSpy, 0, {
    args: [1],
  });

  // Verify pg discard was called
  assertSpyCalls(pgDiscardSpy, 1);

  // Verify download was called
  assertSpyCalls(downloadSpy, 1);
  assertSpyCall(downloadSpy, 0, {
    args: ["region1", "abc123", null],
  });

  // Restore spies
  discardSpy.restore();
  pgDiscardSpy.restore();
  downloadSpy.restore();
});

Deno.test("should schedule cache generation for downloaded status", async () => {
  const mocks = createMocks();

  // Mock next record
  mocks.db.mapData.getRecordNext = () => ({
    id: 1,
    region: "region1",
    pbf_md5: "abc123",
    status: "downloaded",
    router_version: "1.0.0",
    error: null,
    version: "next",
    kml_location: "/11/1",
    pbf_location: "/22/2",
    cache_location: "/33/3",
  } as MapDataRecord);

  // Create spies
  const scheduleSpy = spy(mocks.cacheGenerator, "schedule");

  const processor = new RegionListProcessor(
    mocks.db,
    mocks.logger,
    mocks.env,
    mocks.cacheGenerator,
    mocks.handler,
    mocks.cleaner,
    mocks.downloader,
    mocks.pgQueries,
    mocks.pgClient,
  );

  // Mock fetch response
  globalThis.fetch = async () => {
    return {
      text: () => Promise.resolve("abc123 filename"),
    } as Response;
  };

  await processor.process();

  // Verify cache generation was scheduled
  assertSpyCalls(scheduleSpy, 1);
  assertSpyCall(scheduleSpy, 0, {
    args: [{
      id: 1,
      region: "region1",
      pbf_md5: "abc123",
      status: "downloaded",
      router_version: "1.0.0",
      error: null,
      version: "next",
      kml_location: "/11/1",
      pbf_location: "/22/2",
      cache_location: "/33/3",
    }],
  });

  // Restore spy
  scheduleSpy.restore();
});
