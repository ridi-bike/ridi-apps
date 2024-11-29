import { assertSpyCall, spy } from "jsr:@std/testing/mock";
import { assertEquals } from "jsr:@std/assert";
import { getDb, type MapDataRecord, type RidiLogger } from "@ridi-router/lib";
import { CacheGenerator, DenoCommand } from "./generate-cache.ts";
import { EnvVariables } from "./env-variables.ts";

const mockLogger = {
  debug: () => {},
  error: () => {},
} as unknown as RidiLogger;

const mockDb = {
  mapData: {
    updateRecordProcessing: () => {},
    updateRecordReady: () => {},
    updateRecordError: () => {},
  },
} as unknown as ReturnType<typeof getDb>;

const mockDenoCommand = {
  execute: (..._args: unknown[]) =>
    Promise.resolve({
      code: 0,
      stdout: "success output",
      stderr: "",
    }),
} as DenoCommand;

const mockEnv = {
  routerBin: "123",
} as EnvVariables;

Deno.test("CacheGenerator - successful cache generation", async () => {
  const executeSpy = spy(mockDenoCommand, "execute");
  const updateProcessingSpy = spy(mockDb.mapData, "updateRecordProcessing");
  const updateReadySpy = spy(mockDb.mapData, "updateRecordReady");

  const generator = new CacheGenerator(
    mockDb,
    mockDenoCommand,
    mockLogger,
    mockEnv,
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
      "router",
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
    mockDenoCommand,
    mockLogger,
    mockEnv,
  );

  const mockMapData = {
    id: 123,
    region: "test-region",
    pbf_location: "/test/path.pbf",
    cache_location: "/test/cache",
  } as MapDataRecord;

  await generator.generateCache(mockMapData);

  assertSpyCall(updateErrorSpy, 0, {
    args: [123, "stdout: \n\nstderr: error output"],
  });
});

Deno.test("DenoCommand - execute command", async () => {
  const command = new DenoCommand();
  const result = await command.execute("echo", ["test"]);

  assertEquals(result.code, 0);
  assertEquals(result.stdout.trim(), "test");
  assertEquals(result.stderr, "");
});
