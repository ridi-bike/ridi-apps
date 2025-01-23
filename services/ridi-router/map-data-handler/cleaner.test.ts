import { assertSpyCall, assertSpyCalls, spy } from "jsr:@std/testing/mock";
import { Cleaner, DenoRemove } from "./cleaner.ts";
import { getDb, pg, RidiLogger } from "@ridi-router/lib";
import { PgClient } from "./pg-client.ts";

const mockRecord = {
  id: 1,
  region: "test-region",
  cache_location: "/test/cache",
  pbf_location: "/test/pbf",
  pbf_md5: "test-md5",
};

const createMocks = () => {
  return {
    db: {
      mapData: {
        getRecordsDiscardedAndPrevious: () => [mockRecord],
        isCacheDirInUse: () => false,
        isPbfInUse: () => false,
        isKmlInUse: () => false,
        deleteRecord: () => {},
      },
    } as unknown as ReturnType<typeof getDb>,
    pgQueries: {
      regionDeleteDiscardedAndPrevious: () => {},
    } as unknown as typeof pg,
    logger: {
      debug: () => {},
    } as unknown as RidiLogger,
    pgClient: {} as PgClient,
    denoRemove: {
      remove: (..._args: unknown[]) => undefined,
    } as unknown as DenoRemove,
  };
};

Deno.test("should clean up records that are not in use", async () => {
  const mocks = createMocks();
  const cleaner = new Cleaner(
    mocks.db,
    mocks.pgQueries,
    mocks.pgClient,
    mocks.logger,
    mocks.denoRemove,
  );

  // Create spies
  const deleteRecordSpy = spy(mocks.db.mapData, "deleteRecord");
  const regionDeleteSpy = spy(
    mocks.pgQueries,
    "regionDeleteDiscardedAndPrevious",
  );
  const loggerSpy = spy(mocks.logger, "debug");

  // Spy on DenoRemove.remove
  const removeSpy = spy(mocks.denoRemove, "remove");

  await cleaner.processCleanup();

  // Verify file removals were called
  assertSpyCalls(removeSpy, 3);

  // Verify record was deleted from DB
  assertSpyCalls(deleteRecordSpy, 1);
  assertSpyCall(deleteRecordSpy, 0, {
    args: [mockRecord.id],
  });

  // Verify PG query was called
  assertSpyCalls(regionDeleteSpy, 1);
  assertSpyCall(regionDeleteSpy, 0, {
    args: [mocks.pgClient, {
      region: mockRecord.region,
      pbfMd5: mockRecord.pbf_md5,
    }],
  });

  // Verify logs were written
  assertSpyCalls(loggerSpy, 5);

  // Restore all spies and mocks
  deleteRecordSpy.restore();
  regionDeleteSpy.restore();
  loggerSpy.restore();
  removeSpy.restore();
});

Deno.test("should handle NotFound errors when removing files", async () => {
  const mocks = createMocks();
  const cleaner = new Cleaner(
    mocks.db,
    mocks.pgQueries,
    mocks.pgClient,
    mocks.logger,
    mocks.denoRemove,
  );

  // Mock DenoRemove to simulate NotFound being handled
  const deleteRecordSpy = spy(mocks.db.mapData, "deleteRecord");
  const regionDeleteSpy = spy(
    mocks.pgQueries,
    "regionDeleteDiscardedAndPrevious",
  );

  await cleaner.processCleanup();

  // Verify record was still deleted from DB
  assertSpyCalls(deleteRecordSpy, 1);

  // Verify PG query was still called
  assertSpyCalls(regionDeleteSpy, 1);

  // Restore all spies and mocks
  deleteRecordSpy.restore();
  regionDeleteSpy.restore();
});

Deno.test("should not remove files that are still in use", async () => {
  const mocks = createMocks();
  // Override the in-use checks to return true
  mocks.db.mapData.isCacheDirInUse = () => true;
  mocks.db.mapData.isPbfInUse = () => true;
  mocks.db.mapData.isKmlInUse = () => true;

  const cleaner = new Cleaner(
    mocks.db,
    mocks.pgQueries,
    mocks.pgClient,
    mocks.logger,
    mocks.denoRemove,
  );

  const deleteRecordSpy = spy(mocks.db.mapData, "deleteRecord");
  const regionDeleteSpy = spy(
    mocks.pgQueries,
    "regionDeleteDiscardedAndPrevious",
  );

  // Spy on DenoRemove.remove
  const removeSpy = spy(mocks.denoRemove, "remove");

  await cleaner.processCleanup();

  // Verify no files were removed
  assertSpyCalls(removeSpy, 0);

  // Verify record was still deleted from DB
  assertSpyCalls(deleteRecordSpy, 1);

  // Verify PG query was still called
  assertSpyCalls(regionDeleteSpy, 1);

  // Restore all spies and mocks
  deleteRecordSpy.restore();
  regionDeleteSpy.restore();
  removeSpy.restore();
});
