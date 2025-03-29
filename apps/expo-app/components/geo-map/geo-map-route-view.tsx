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
import { View } from "react-native";

import { type GeoMapRouteViewProps } from "~/components/geo-map/types";
import { useColorScheme } from "~/lib/useColorScheme";
import { cn } from "~/lib/utils";

import { getMapStyle } from "./style";
import { combineBBox } from "./util";

export function GeoMapRouteView({
  route,
  interactive,
  className,
}: GeoMapRouteViewProps) {
  const { colorScheme } = useColorScheme();
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
    <View className={cn("size-full", className)}>
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
        mapStyle={getMapStyle(colorScheme)}
      >
        {interactive && <NavigationControl position="bottom-right" />}
        {routeLayer}
      </MapLibre>
    </View>
  );
}
