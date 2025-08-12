import * as turf from "@turf/turf";
import { type GeoJSON } from "zod-geojson";

import { dataStore } from "./data-store";

export function findRegions(coordsIn: [number, number]) {
  const coords = [coordsIn[1], coordsIn[0]];
  const allRegions = dataStore.getTable("regions");
  const matchingRegions = Object.values(allRegions).filter(
    ({ geojsonString, region }) => {
      console.log("omgomg finding region", region, coords);
      const geojson = JSON.parse(geojsonString) as GeoJSON;
      let pointInPolygon = false;
      if (geojson.type === "Polygon") {
        console.log("1");
        pointInPolygon = turf.booleanPointInPolygon(
          coords,
          turf.polygon(geojson.coordinates),
        );
      } else if (geojson.type === "MultiPolygon") {
        console.log("2");
        pointInPolygon = turf.booleanPointInPolygon(
          coords,
          turf.multiPolygon(geojson.coordinates),
        );
      } else if (geojson.type === "FeatureCollection" && geojson.features) {
        console.log("3");
        pointInPolygon = geojson.features.some((feature) => {
          const geometry = feature.geometry;
          if (
            geometry?.type === "Polygon" ||
            geometry?.type === "MultiPolygon"
          ) {
            console.log("4");
            return turf.booleanPointInPolygon(coords, {
              ...feature,
              geometry,
            });
          } else if (geometry?.type === "GeometryCollection") {
            console.log("5");
            return geometry.geometries.some((innerGeom) => {
              if (
                innerGeom.type === "Polygon" ||
                innerGeom.type === "MultiPolygon"
              ) {
                return turf.booleanPointInPolygon(coords, innerGeom);
              }
              return false;
            });
          }
          return false;
        });
      }
      return pointInPolygon;
    },
  );

  console.log("matchingRegions", matchingRegions);
  return matchingRegions;
}
