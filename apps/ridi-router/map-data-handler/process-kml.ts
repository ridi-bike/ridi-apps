import { MapDataRecord, pg } from "@ridi-router/lib";
import { pgClient } from "./pg.ts";
import { kml } from "to-geo-json";
import { DOMParser } from "xmldom";

export async function processKml(mapData: MapDataRecord) {
  const kmlFileContents = await Deno.readTextFile(mapData.kml_location);

  const kmlDom = new DOMParser().parseFromString(
    kmlFileContents,
  );

  const converted = kml(kmlDom);
  const polygon = converted.features[0]?.geometry;
  if (polygon?.type !== "Polygon") {
    throw new Error("unexpected geometry type");
  }
  const polygonCoordsList = polygon.coordinates[0]
    .map((c) => `${c[0]} ${c[1]}`).join(",");

  pg.regionInsert(pgClient, {
    region: mapData.region,
    pbfMd5: mapData.pbf_md5,
    geojson: converted,
    polygon: `POLYGON((${polygonCoordsList}))`,
  });
}
