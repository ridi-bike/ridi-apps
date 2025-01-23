import { assertSpyCall, spy } from "jsr:@std/testing/mock";
import { getDb, type MapDataRecord, type RidiLogger } from "@ridi-router/lib";
import { CacheGenerator, DenoCommand } from "./cache-generator.ts";
import { EnvVariables } from "./env-variables.ts";
import { KmlProcessor } from "./kml-processor.ts";
import { Handler } from "./handler.ts";

const mockLogger = {
  debug: (..._args: unknown[]) => undefined,
  error: (..._args: unknown[]) => undefined,
} as RidiLogger;

const mockDb = {
  mapData: {
    updateRecordProcessing: (..._args: unknown[]) => undefined,
    updateRecordReady: (..._args: unknown[]) => undefined,
    updateRecordError: (..._args: unknown[]) => undefined,
  },
} as ReturnType<typeof getDb>;

const mockDenoCommand = {
  execute: (..._args: unknown[]) =>
    Promise.resolve({
      code: 0,
      stdout: "success output",
      stderr: "",
    }),
} as DenoCommand;

const mockEnv = {
  routerBin: "/rou/ter/b/in",
} as EnvVariables;

const mockKml = {
  processKml: (..._args: unknown[]) => Promise.resolve(),
} as KmlProcessor;

const mockHandler = { checkStatus: () => undefined } as Handler;

Deno.test("CacheGenerator - successful cache generation", async () => {
  const executeSpy = spy(mockDenoCommand, "execute");
  const updateProcessingSpy = spy(mockDb.mapData, "updateRecordProcessing");
  const updateReadySpy = spy(mockDb.mapData, "updateRecordReady");

  const generator = new CacheGenerator(
    mockDb,
    mockDenoCommand,
    mockLogger,
    mockEnv,
    mockKml,
    mockHandler,
  );

  const mockMapData = {
    id: 1,
    region: "test-region",
    pbf_location: "/test/path.pbf",
    cache_location: "/test/cache",
  } as MapDataRecord;

  await generator.generateCache(mockMapData);

  assertSpyCall(executeSpy, 0, {
    args: [
      "/rou/ter/b/in",
      ["cache", "-i", "/test/path.pbf", "-c", "/test/cache"],
    ],
  });

  assertSpyCall(updateProcessingSpy, 0, {
    args: [1],
  });

  assertSpyCall(updateReadySpy, 0, {
    args: [1],
  });

  executeSpy.restore();
  updateProcessingSpy.restore();
  updateReadySpy.restore();
});

Deno.test("CacheGenerator - failed cache generation", async () => {
  const updateErrorSpy = spy(mockDb.mapData, "updateRecordError");

  const generator = new CacheGenerator(
    mockDb,
    {
      execute: (..._args: unknown[]) =>
        Promise.resolve({
          code: 1,
          stderr: "omg error",
          stdout: "",
        }),
    },
    mockLogger,
    mockEnv,
    mockKml,
    mockHandler,
  );

  const mockMapData = {
    id: 123,
    region: "test-region",
    pbf_location: "/test/path.pbf",
    cache_location: "/test/cache",
  } as MapDataRecord;

  await generator.generateCache(mockMapData);

  assertSpyCall(updateErrorSpy, 0, {
    args: [123, "stdout: \n\nstderr: omg error"],
  });
});
