import { MapDataRecord, pg } from "@ridi-router/lib";
import { pgClient as pgCl } from "./pg.ts";
import { kml } from "to-geo-json";
import { DOMParser } from "xmldom";

export class KmlConverter {
  convert(contents: string) {
    const kmlDom = new DOMParser().parseFromString(contents);
    const converted = kml(kmlDom);
    return converted;
  }
}

export class DenoFileReader {
  async readTextFile(path: string): Promise<string> {
    return await Deno.readTextFile(path);
  }
}

export class KmlProcessor {
  constructor(
    private readonly pgQueries: typeof pg,
    private readonly pgClient: typeof pgCl,
    private readonly fileReader: DenoFileReader,
    private readonly kmlConverter: KmlConverter,
  ) {}

  async processKml(mapData: MapDataRecord): Promise<void> {
    const kmlFileContents = await this.fileReader.readTextFile(
      mapData.kml_location,
    );

    const converted = this.kmlConverter.convert(kmlFileContents);
    const polygon = converted.features[0]?.geometry;
    if (polygon?.type !== "Polygon") {
      throw new Error("unexpected geometry type");
    }
    const polygonCoordsList = polygon.coordinates[0]
      .map((c) => `${c[0]} ${c[1]}`).join(",");

    await this.pgQueries.regionInsert(this.pgClient, {
      region: mapData.region,
      pbfMd5: mapData.pbf_md5,
      geojson: converted,
      polygon: `POLYGON((${polygonCoordsList}))`,
    });
  }
}
