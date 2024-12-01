import { assertSpyCall, assertSpyCalls, spy } from "jsr:@std/testing/mock";
import { assertRejects } from "jsr:@std/assert";
import { MapDataRecord, pg } from "@ridi-router/lib";
import { DenoFileReader, KmlConverter, KmlProcessor } from "./kml-processor.ts";
import { pgClient } from "./pg-client.ts";

const createMocks = () => {
  return {
    pgQueries: {
      regionInsert: (..._args: unknown[]) => Promise.resolve(null),
    } as typeof pg,
    pgClient: {} as typeof pgClient,
    fileReader: {
      readTextFile: (..._args: unknown[]) => Promise.resolve(""),
    } as DenoFileReader,
    kmlConverter: {
      convert: (..._args: unknown[]): unknown => ({
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [[[1, 1], [2, 2], [3, 3], [1, 1]]],
          },
          properties: {},
        }],
      }),
    } as KmlConverter,
  };
};

const sampleKml = `<?xml version="1.0" encoding="UTF-8"?>
<kml>
  <Placemark>
    <Polygon>
      <outerBoundaryIs>
        <LinearRing>
          <coordinates>
            1,1 2,2 3,3 1,1
          </coordinates>
        </LinearRing>
      </outerBoundaryIs>
    </Polygon>
  </Placemark>
</kml>`;

Deno.test("should process valid KML file successfully", async () => {
  const mocks = createMocks();
  const mockMapData: MapDataRecord = {
    region: "test-region",
    kml_location: "test.kml",
    pbf_md5: "test-md5",
  } as MapDataRecord;

  // Create spies
  mocks.fileReader.readTextFile = (..._args: unknown[]) =>
    Promise.resolve(sampleKml);
  const readFileSpy = spy(mocks.fileReader, "readTextFile");

  const convertSpy = spy(mocks.kmlConverter, "convert");
  const regionInsertSpy = spy(mocks.pgQueries, "regionInsert");

  const processor = new KmlProcessor(
    mocks.pgQueries,
    mocks.pgClient,
    mocks.fileReader,
    mocks.kmlConverter,
  );

  await processor.processKml(mockMapData);

  // Verify file was read
  assertSpyCalls(readFileSpy, 1);
  assertSpyCall(readFileSpy, 0, {
    args: ["test.kml"],
  });

  // Verify KML was converted
  assertSpyCalls(convertSpy, 1);
  assertSpyCall(convertSpy, 0, {
    args: [sampleKml],
  });

  // Verify data was inserted
  assertSpyCalls(regionInsertSpy, 1);

  // Restore spies
  readFileSpy.restore();
  convertSpy.restore();
  regionInsertSpy.restore();
});

Deno.test("should throw error for invalid geometry type", async () => {
  const mocks = createMocks();
  const mockMapData: MapDataRecord = {
    region: "test-region",
    kml_location: "test.kml",
    pbf_md5: "test-md5",
  } as MapDataRecord;

  // Mock invalid geometry type
  const invalidGeojson = {
    features: [{
      geometry: {
        type: "Point",
        coordinates: [1, 1],
      },
    }],
  };

  // Create spies
  mocks.fileReader.readTextFile = (..._args: unknown[]) =>
    Promise.resolve(sampleKml);
  const readFileSpy = spy(mocks.fileReader, "readTextFile");

  // @ts-expect-error invalid on purpose
  mocks.kmlConverter.convert = () => invalidGeojson;
  const convertSpy = spy(mocks.kmlConverter, "convert");

  const processor = new KmlProcessor(
    mocks.pgQueries,
    mocks.pgClient,
    mocks.fileReader,
    mocks.kmlConverter,
  );

  await assertRejects(
    async () => {
      await processor.processKml(mockMapData);
    },
    Error,
    "unexpected geometry type",
  );

  // Restore spies
  readFileSpy.restore();
  convertSpy.restore();
});

Deno.test("should handle file read errors", async () => {
  const mocks = createMocks();
  const mockMapData: MapDataRecord = {
    region: "test-region",
    kml_location: "nonexistent.kml",
    pbf_md5: "test-md5",
  } as MapDataRecord;

  // Create spy that throws error
  mocks.fileReader.readTextFile = (..._args: unknown[]) =>
    Promise.reject(new Error("File not found"));
  const readFileSpy = spy(mocks.fileReader, "readTextFile");

  const processor = new KmlProcessor(
    mocks.pgQueries,
    mocks.pgClient,
    mocks.fileReader,
    mocks.kmlConverter,
  );

  await assertRejects(
    async () => {
      await processor.processKml(mockMapData);
    },
    Error,
    "File not found",
  );

  // Restore spy
  readFileSpy.restore();
});
