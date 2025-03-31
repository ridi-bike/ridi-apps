import * as turf from "@turf/turf";
import {
  type LineLayer,
  Layer,
  Map as MapLibre,
  Source,
  type MapRef,
  NavigationControl,
} from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { type FeatureCollection } from "geojson";
import maplibre from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";

import { type GeoMapRouteViewProps } from "./types";

import { getMapStyle } from "./style";
import { combineBBox, updateBBox } from "./util";

export function GeoMapRouteView({
  route,
  interactive,
  colorScheme,
  mapRef: mapRefExt,
}: GeoMapRouteViewProps) {
  const mapRef = useRef<MapRef | null>(null);

  const mapBounds = useMemo(() => {
    const allPoints = [...route.map((p) => [p.lon, p.lat])];
    if (!allPoints.length) {
      return null;
    }
    const features = turf.points(allPoints);
    const mapBounds = turf.bbox(features);
    return combineBBox(mapBounds, null);
  }, [route]);

  useEffect(() => {
    if (mapRef.current && mapBounds) {
      mapRef.current.fitBounds(mapBounds);
    }
  }, [mapBounds]);

  const routeLayer = useMemo(() => {
    if (!route) {
      return null;
    }
    const routeLayerId = "route-layer";
    const layerStyle: LineLayer = {
      id: "route-layer",
      type: "line",
      source: routeLayerId,
      paint: {
        "line-color": "#BD37FF",
        "line-width": 3,
      },
    };
    const geojson: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: route.map((routePoint) => [
              routePoint.lon,
              routePoint.lat,
            ]),
          },
        },
      ],
    };
    return (
      <Source id={routeLayerId} type="geojson" data={geojson}>
        <Layer {...layerStyle} />
      </Source>
    );
  }, [route]);

  return (
    <MapLibre
      ref={(map) => {
        mapRef.current = map;
        if (map) {
          mapRefExt(map);
        }
      }}
      mapLib={maplibre}
      interactive={interactive}
      initialViewState={
        mapBounds
          ? {
              bounds: updateBBox(mapBounds),
            }
          : {
              longitude: 24.853,
              latitude: 57.153,
              zoom: 4,
            }
      }
      mapStyle={getMapStyle(colorScheme)}
    >
      {interactive && <NavigationControl position="bottom-right" />}
      {routeLayer}
    </MapLibre>
  );
}
