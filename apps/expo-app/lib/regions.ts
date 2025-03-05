import * as turf from "@turf/turf";
import { type z } from "zod";
import { GeoJSONSchema } from "zod-geojson";

import { apiClient } from "./api";
import { getSuccessResponseOrThrow } from "./stores/util";

export type Region = {
  region: string;
  geojson: z.infer<typeof GeoJSONSchema>;
};

const regionsCache: Region[] = [];

export async function findRegions(coords: [number, number]) {
  const matchingRegions = regionsCache.filter(({ geojson }) => {
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
        if (geometry?.type === "Polygon" || geometry?.type === "MultiPolygon") {
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
  });
  if (matchingRegions.length) {
    return matchingRegions;
  }
  const serverRegionsResp = await apiClient.regionGet({
    params: {
      lat: coords[0].toString(),
      lon: coords[1].toString(),
    },
    query: {
      version: "v1",
    },
  });
  const serverRegions = getSuccessResponseOrThrow(200, serverRegionsResp).map(
    (r) => ({
      ...r,
      geojson: GeoJSONSchema.parse(r.geojson),
    }),
  );
  regionsCache.push(...serverRegions);
  return serverRegions;
}
