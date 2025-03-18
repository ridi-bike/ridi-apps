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

import { type GeoMapRouteViewProps } from "~/components/geo-map/types";

import { getMapStyle } from "./style";
import { combineBBox } from "./util";

export function GeoMapRouteView({ route, interactive }: GeoMapRouteViewProps) {
  const mapRef = useRef<MapRef>(null);

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
        "line-color": "#FF5937",
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
      ref={mapRef}
      mapLib={maplibre}
      interactive={interactive}
      initialViewState={
        mapBounds
          ? {
              bounds: mapBounds,
            }
          : {
              longitude: 24.853,
              latitude: 57.153,
              zoom: 4,
            }
      }
      mapStyle={getMapStyle("light")}
    >
      {interactive && <NavigationControl position="bottom-right" />}
      {routeLayer}
    </MapLibre>
  );
}
