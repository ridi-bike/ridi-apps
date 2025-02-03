import * as turf from "@turf/turf";
import { type FillLayer } from "@vis.gl/react-maplibre";
import { Layer, Source } from "@vis.gl/react-maplibre";
import { useMemo } from "react";

import { type Coords } from "./types";

export const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export const getCardinalDirection = (degrees: number): string => {
  const index = Math.round(degrees / 45) % 8;
  return DIRECTIONS[index];
};

export function createRoundTripPolygon(
  startPoint: [number, number],
  bearing: number,
  distance: number,
) {
  const start = turf.point(startPoint);
  const leftBearing = (bearing - 40 + 360) % 360;
  const rightBearing = (bearing + 40 + 360) % 360;
  const points = [];
  points.push(start.geometry.coordinates);
  const rightPoint = turf.destination(start, distance / 5, rightBearing, {
    units: "kilometers",
  });
  points.push(rightPoint.geometry.coordinates);
  const apexPoint = turf.destination(start, distance / 5, bearing, {
    units: "kilometers",
  });
  points.push(apexPoint.geometry.coordinates);
  const leftPoint = turf.destination(start, distance / 5, leftBearing, {
    units: "kilometers",
  });
  points.push(leftPoint.geometry.coordinates);
  points.push(start.geometry.coordinates);
  const polygon = turf.polygon([points]);

  return polygon;
}

export function useRoundTripPolygon(
  isRoundTrip: boolean,
  start: Coords | null | undefined,
  bearing: number | undefined,
  distance: number | undefined,
) {
  const roundTripPolygon = useMemo(() => {
    if (isRoundTrip && start) {
      return createRoundTripPolygon(
        [start.lon, start.lat],
        bearing || 0,
        distance || 0,
      );
    }
    return null;
  }, [isRoundTrip, start, distance, bearing]);

  const rountdTripLayer = useMemo(() => {
    if (roundTripPolygon) {
      const routeLayerId = "round-trip-layer";
      const layerStyle: FillLayer = {
        id: routeLayerId,
        type: "fill",
        source: routeLayerId,
        paint: {
          "fill-color": "#FF5937",
          "fill-opacity": 0.3,
        },
      };
      return (
        <Source id={routeLayerId} type="geojson" data={roundTripPolygon}>
          <Layer {...layerStyle} />
        </Source>
      );
    }
    return null;
  }, [roundTripPolygon]);

  return { rountdTripLayer, roundTripPolygon };
}
