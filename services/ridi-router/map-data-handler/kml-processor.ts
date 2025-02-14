import { pg, PgClient } from "@ridi-router/lib";
import { kml } from "to-geo-json";
import { DOMParser } from "xmldom";
import { MapDataRecord } from "./types.ts";

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
    private readonly pgClient: PgClient,
    private readonly fileReader: DenoFileReader,
    private readonly kmlConverter: KmlConverter,
  ) {}

  async processKml(mapData: MapDataRecord): Promise<void> {
    const allCurrRegions = await this.pgQueries.regionGetAllCurrent(
      this.pgClient,
    );
    if (
      allCurrRegions.find(
        (r) => r.region === mapData.region && r.pbfMd5 === mapData.pbfMd5,
      )
    ) {
      return;
    }
    const kmlFileContents = await this.fileReader.readTextFile(
      mapData.kmlLocation,
    );

    const converted = this.kmlConverter.convert(kmlFileContents);
    const polygon = converted.features[0]?.geometry;
    if (polygon?.type !== "Polygon") {
      throw new Error("unexpected geometry type");
    }
    const polygonCoordsList = polygon.coordinates[0]
      .map((c) => `${c[0]} ${c[1]}`)
      .join(",");

    await this.pgQueries.regionInsertOrUpdate(this.pgClient, {
      region: mapData.region,
      pbfMd5: mapData.pbfMd5,
      geojson: converted,
      polygon: `POLYGON((${polygonCoordsList}))`,
    });
  }
}
