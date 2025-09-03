import * as turf from "@turf/turf";
import {
  Layer,
  Map as MapLibre,
  Source,
  type MapRef,
  NavigationControl,
} from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibre from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";

import { getMapStyle } from "./style";
import { type GeoMapRouteViewProps } from "./types";
import { combineBBox, updateBBox } from "./util";

export function GeoMapRouteView({
  routeGeojson,
  interactive,
  colorScheme,
  mapRef: mapRefExt,
}: GeoMapRouteViewProps) {
  const mapRef = useRef<MapRef | null>(null);

  const mapBounds = useMemo(() => {
    const mapBounds = turf.bbox(routeGeojson);
    return combineBBox(mapBounds, null);
  }, [routeGeojson]);

  useEffect(() => {
    if (mapRef.current && mapBounds) {
      mapRef.current.fitBounds(updateBBox(mapBounds));
    }
  }, [mapBounds]);

  const routeLayer = useMemo(() => {
    const routeLayerId = "route-layer";
    const layerStyle = {
      id: "route-layer",
      type: "line",
      source: routeLayerId,
      paint: {
        "line-color": "#BD37FF",
        "line-width": 3,
      },
    } as const;
    return (
      <Source id={routeLayerId} type="geojson" data={routeGeojson}>
        <Layer {...layerStyle} />
      </Source>
    );
  }, [routeGeojson]);

  return (
    <MapLibre
      ref={(map) => {
        mapRef.current = map;
        if (map && mapRefExt) {
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
