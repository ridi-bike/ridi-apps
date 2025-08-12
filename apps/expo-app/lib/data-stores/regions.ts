import * as turf from "@turf/turf";
import { type GeoJSON } from "zod-geojson";

import { dataStore } from "./data-store";

export function findRegions(coords: [number, number]) {
  const allRegions = dataStore.getTable("regions");
  const matchingRegions = Object.values(allRegions).filter(
    ({ geojsonString }) => {
      const geojson = JSON.parse(geojsonString) as GeoJSON;
      let pointInPolygon = false;
      if (geojson.type === "Polygon") {
        pointInPolygon = turf.booleanPointInPolygon(
          coords,
          turf.polygon(geojson.coordinates),
        );
      } else if (geojson.type === "MultiPolygon") {
        pointInPolygon = turf.booleanPointInPolygon(
          coords,
          turf.multiPolygon(geojson.coordinates),
        );
      } else if (geojson.type === "FeatureCollection" && geojson.features) {
        pointInPolygon = geojson.features.some((feature) => {
          const geometry = feature.geometry;
          if (
            geometry?.type === "Polygon" ||
            geometry?.type === "MultiPolygon"
          ) {
            return turf.booleanPointInPolygon(coords, {
              ...feature,
              geometry,
            });
          } else if (geometry?.type === "GeometryCollection") {
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

  return matchingRegions;
}
