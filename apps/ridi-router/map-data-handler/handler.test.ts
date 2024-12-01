import { assertSpyCall, assertSpyCalls, spy } from "jsr:@std/testing/mock";
import { getDb, MapDataRecord, RidiLogger } from "@ridi-router/lib";
import { Handler } from "./handler.ts";
import { EnvVariables } from "./env-variables.ts";

const createMocks = () => {
  return {
    db: {
      mapData: {
        getRecordsAllNext: (..._args: unknown[]) => Promise.resolve([]),
      },
      handlers: {
        updateRecordDone: (..._args: unknown[]) => undefined,
        updateRecordUpdatedAt: (..._args: unknown[]) => undefined,
      },
    } as unknown as ReturnType<typeof getDb>,
    env: {
      regions: ["region1", "region2"],
    } as EnvVariables,
    logger: {
      debug: (..._args: unknown[]) => {},
    } as RidiLogger,
  };
};

Deno.test("should set handler to idle when all regions are processed", () => {
  const mocks = createMocks();
  const mockRecords: MapDataRecord[] = [
    { region: "region1", status: "ready" },
    { region: "region2", status: "ready" },
  ] as MapDataRecord[];

  // Override getRecordsAllNext to return our mock records
  mocks.db.mapData.getRecordsAllNext = () => mockRecords;

  const handler = new Handler(mocks.db, mocks.env, mocks.logger);

  // Create spies
  const updateDoneSpy = spy(mocks.db.handlers, "updateRecordDone");
  const updateUpdatedAtSpy = spy(mocks.db.handlers, "updateRecordUpdatedAt");
  const loggerSpy = spy(mocks.logger, "debug");

  handler.checkStatus();

  // Verify handler was set to idle
  assertSpyCalls(updateDoneSpy, 1);
  assertSpyCall(updateDoneSpy, 0, {
    args: ["map-data"],
  });

  // Verify updateUpdatedAt was not called
  assertSpyCalls(updateUpdatedAtSpy, 0);

  // Verify logs were written
  assertSpyCalls(loggerSpy, 2);

  // Restore spies
  updateDoneSpy.restore();
  updateUpdatedAtSpy.restore();
  loggerSpy.restore();
});

Deno.test("should update timestamp when not all regions are processed", () => {
  const mocks = createMocks();
  const mockRecords: MapDataRecord[] = [
    { region: "region1", status: "ready" },
    { region: "region2", status: "processing" },
  ] as MapDataRecord[];

  // Override getRecordsAllNext to return our mock records
  mocks.db.mapData.getRecordsAllNext = () => mockRecords;

  const handler = new Handler(mocks.db, mocks.env, mocks.logger);

  // Create spies
  const updateDoneSpy = spy(mocks.db.handlers, "updateRecordDone");
  const updateUpdatedAtSpy = spy(mocks.db.handlers, "updateRecordUpdatedAt");
  const loggerSpy = spy(mocks.logger, "debug");

  handler.checkStatus();

  // Verify handler was not set to idle
  assertSpyCalls(updateDoneSpy, 0);

  // Verify updateUpdatedAt was called
  assertSpyCalls(updateUpdatedAtSpy, 1);
  assertSpyCall(updateUpdatedAtSpy, 0, {
    args: ["map-data"],
  });

  // Verify logs were written
  assertSpyCalls(loggerSpy, 1);

  // Restore spies
  updateDoneSpy.restore();
  updateUpdatedAtSpy.restore();
  loggerSpy.restore();
});

Deno.test("should handle error status as processed", () => {
  const mocks = createMocks();
  const mockRecords: MapDataRecord[] = [
    { region: "region1", status: "error" },
    { region: "region2", status: "ready" },
  ] as MapDataRecord[];

  // Override getRecordsAllNext to return our mock records
  mocks.db.mapData.getRecordsAllNext = () => mockRecords;

  const handler = new Handler(mocks.db, mocks.env, mocks.logger);

  // Create spies
  const updateDoneSpy = spy(mocks.db.handlers, "updateRecordDone");
  const updateUpdatedAtSpy = spy(mocks.db.handlers, "updateRecordUpdatedAt");

  handler.checkStatus();

  // Verify handler was set to idle since both regions are processed (error counts as processed)
  assertSpyCalls(updateDoneSpy, 1);
  assertSpyCall(updateDoneSpy, 0, {
    args: ["map-data"],
  });

  // Verify updateUpdatedAt was not called
  assertSpyCalls(updateUpdatedAtSpy, 0);

  // Restore spies
  updateDoneSpy.restore();
  updateUpdatedAtSpy.restore();
});
