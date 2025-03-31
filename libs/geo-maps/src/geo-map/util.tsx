import * as turf from "@turf/turf";
import { type FillLayer } from "@vis.gl/react-maplibre";
import { Layer, Source } from "@vis.gl/react-maplibre";
import { type BBox } from "geojson";
import { useMemo } from "react";

import { type Coords } from "./types";

export const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export const getCardinalDirection = (degrees: number): string => {
  const index = Math.round(degrees / 45) % 8;
  return DIRECTIONS[index]!;
};

export function createRoundTripPolygon(
  startPoint: [number, number],
  bearing: number,
  distance: number,
) {
  const originalStart = turf.point(startPoint);
  const arrowLength = distance / 10; // Arrow length is 1/10 of the provided distance

  // Calculate a new starting point 5km away from the original in the direction of bearing
  const arrowStartPoint = turf.destination(originalStart, 2, bearing, {
    units: "kilometers",
  });
  const start = arrowStartPoint;

  // Calculate bearings for the arrow shape
  const leftBearing = (bearing - 30 + 360) % 360; // Narrower angle for arrow head
  const rightBearing = (bearing + 30 + 360) % 360; // Narrower angle for arrow head
  const leftBaseBearing = (bearing - 15 + 360) % 360; // For the base of the arrow
  const rightBaseBearing = (bearing + 15 + 360) % 360; // For the base of the arrow

  // Create arrow points
  const points = [];

  // Start at the base center
  points.push(start.geometry.coordinates);

  // Right base corner
  const rightBasePoint = turf.destination(
    start,
    arrowLength * 0.4,
    rightBaseBearing,
    {
      units: "kilometers",
    },
  );
  points.push(rightBasePoint.geometry.coordinates);

  // Right wing point
  const rightWingPoint = turf.destination(
    start,
    arrowLength * 0.4,
    rightBearing,
    {
      units: "kilometers",
    },
  );
  points.push(rightWingPoint.geometry.coordinates);

  // Arrow tip
  const arrowTip = turf.destination(start, arrowLength, bearing, {
    units: "kilometers",
  });
  points.push(arrowTip.geometry.coordinates);

  // Left wing point
  const leftWingPoint = turf.destination(
    start,
    arrowLength * 0.4,
    leftBearing,
    {
      units: "kilometers",
    },
  );
  points.push(leftWingPoint.geometry.coordinates);

  // Left base corner
  const leftBasePoint = turf.destination(
    start,
    arrowLength * 0.4,
    leftBaseBearing,
    {
      units: "kilometers",
    },
  );
  points.push(leftBasePoint.geometry.coordinates);

  // Close the polygon
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
          "fill-opacity": 1,
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

export function combineBBox(
  bbox1: BBox,
  bbox2: BBox | null,
): [number, number, number, number] {
  const combinedBbox = bbox2
    ? [
        Math.min(bbox1[0], bbox2[0]), // minX
        Math.min(bbox1[1], bbox2[1]), // minY
        Math.max(bbox1[2], bbox2[2]), // maxX
        Math.max(bbox1[3], bbox2[3]), // maxY
      ]
    : bbox1;
  return [
    combinedBbox[0]! - Math.abs(combinedBbox[0]! - combinedBbox[2]!) / 10,
    combinedBbox[1]! - Math.abs(combinedBbox[1]! - combinedBbox[3]!) / 10,
    combinedBbox[2]! + Math.abs(combinedBbox[0]! - combinedBbox[2]!) / 10,
    combinedBbox[3]! + Math.abs(combinedBbox[1]! - combinedBbox[3]!) / 10,
  ] as [number, number, number, number];
}

export function updateBBox(
  bbox: [number, number, number, number],
): [number, number, number, number] {
  console.log(bbox);
  const updated = [
    bbox[0] - Math.abs(bbox[2] - bbox[0]),
    bbox[1] - Math.abs(bbox[3] - bbox[1]),
    bbox[2] + Math.abs(bbox[2] - bbox[0]),
    bbox[3] + Math.abs(bbox[3] - bbox[1]),
  ] as [number, number, number, number];
  console.log(updated);
  return updated;
}

export function metersToDisplay(value: number): string {
  return `${Math.round(value / 1000)}km`;
}
