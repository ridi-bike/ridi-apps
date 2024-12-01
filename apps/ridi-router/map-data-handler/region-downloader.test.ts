import { assertSpyCall, assertSpyCalls, spy } from "jsr:@std/testing/mock";
import { getDb, Locations, RidiLogger } from "@ridi-router/lib";
import { FileDownloader, RegionDownloader } from "./region-downloader.ts";
import { EnvVariables } from "./env-variables.ts";

const createMocks = () => {
  return {
    locations: {
      getPbfFileLoc: (..._args: unknown[]) => Promise.resolve("/path/to/pbf"),
      getKmlLocation: (..._args: unknown[]) => Promise.resolve("/path/to/kml"),
      getCacheDirLoc: (..._args: unknown[]) =>
        Promise.resolve("/path/to/cache"),
    } as Locations,
    env: {
      routerVersion: "1.0.0",
    } as EnvVariables,
    db: {
      mapData: {
        createNextRecord: (..._args: unknown[]) => ({
          id: 1,
          region: "test-region",
          md5: "test-md5",
          error: null,
        }),
        updateRecordError: (..._args: unknown[]) => undefined,
      },
    } as unknown as ReturnType<typeof getDb>,
    logger: {
      debug: (..._args: unknown[]) => {},
      error: (..._args: unknown[]) => {},
    } as RidiLogger,
    fileDownloader: {
      downloadFile: (..._args: unknown[]) => Promise.resolve(),
    } as FileDownloader,
  };
};

Deno.test("RegionDownloader - should download files successfully", async () => {
  const mocks = createMocks();

  // Create spies
  const getPbfFileLocSpy = spy(mocks.locations, "getPbfFileLoc");
  const getKmlLocationSpy = spy(mocks.locations, "getKmlLocation");
  const downloadFileSpy = spy(mocks.fileDownloader, "downloadFile");
  const loggerDebugSpy = spy(mocks.logger, "debug");

  const downloader = new RegionDownloader(
    mocks.locations,
    mocks.env,
    mocks.db,
    mocks.logger,
    mocks.fileDownloader,
  );

  await downloader.downloadRegion("test-region", "test-md5", null);

  // Verify location calls
  assertSpyCalls(getPbfFileLocSpy, 1);
  assertSpyCall(getPbfFileLocSpy, 0, {
    args: ["test-region", "test-md5"],
  });

  assertSpyCalls(getKmlLocationSpy, 1);
  assertSpyCall(getKmlLocationSpy, 0, {
    args: ["test-region", "test-md5"],
  });

  // Verify download calls
  assertSpyCalls(downloadFileSpy, 2);
  assertSpyCall(downloadFileSpy, 0, {
    args: [
      "https://download.geofabrik.de/test-region.kml",
      "/path/to/kml",
    ],
  });
  assertSpyCall(downloadFileSpy, 1, {
    args: [
      "https://download.geofabrik.de/test-region-latest.osm.pbf",
      "/path/to/pbf",
    ],
  });

  // Verify logging
  assertSpyCalls(loggerDebugSpy, 2);

  // Restore spies
  getPbfFileLocSpy.restore();
  getKmlLocationSpy.restore();
  downloadFileSpy.restore();
  loggerDebugSpy.restore();
});

Deno.test("RegionDownloader - should handle download errors", async () => {
  const mocks = createMocks();

  // Mock download to throw error
  mocks.fileDownloader.downloadFile = () =>
    Promise.reject(new Error("Download failed"));

  // Create spies
  const downloadFileSpy = spy(mocks.fileDownloader, "downloadFile");
  const loggerErrorSpy = spy(mocks.logger, "error");
  const updateRecordErrorSpy = spy(mocks.db.mapData, "updateRecordError");

  const downloader = new RegionDownloader(
    mocks.locations,
    mocks.env,
    mocks.db,
    mocks.logger,
    mocks.fileDownloader,
  );

  await downloader.downloadRegion("test-region", "test-md5", null);

  // Verify error handling
  assertSpyCalls(loggerErrorSpy, 1);
  assertSpyCalls(updateRecordErrorSpy, 1);
  assertSpyCall(updateRecordErrorSpy, 0, {
    args: [1, JSON.stringify(new Error("Download failed"))],
  });

  // Restore spies
  downloadFileSpy.restore();
  loggerErrorSpy.restore();
  updateRecordErrorSpy.restore();
});
