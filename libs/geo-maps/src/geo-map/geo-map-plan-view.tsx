import "maplibre-gl/dist/maplibre-gl.css";
import * as turf from "@turf/turf";
import { type MapRef } from "@vis.gl/react-maplibre";
import { Map as MapLibre } from "@vis.gl/react-maplibre";
import maplibre from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";

import GeoMapMarker from "./geo-map-marker";
import { getMapStyle } from "./style";
import { type GeoMapPlanViewProps } from "./types";
import { combineBBox, updateBBox, useRoundTripPolygon } from "./util";

export function GeoMapPlanView(props: GeoMapPlanViewProps) {
  const { roundTripPolygon, rountdTripLayer } = useRoundTripPolygon(
    props.bearing !== null,
    props.start,
    props.bearing ?? undefined,
    props.distance / 1000,
  );

  const bbox = useMemo(() => {
    const points = (
      props.start
        ? [[props.start.lon, props.start.lat] as [number, number]]
        : []
    ).concat(
      props.finish
        ? [[props.finish.lon, props.finish.lat] as [number, number]]
        : [],
    );
    if (!points.length) {
      return null;
    }

    if (points.length === 1) {
      points.push([points[0]![0] - 0.1, points[0]![1] - 0.1]);
      points.push([points[0]![0] + 0.1, points[0]![1] + 0.1]);
    }
    const pointsFeatures = turf.points(points);
    const pointsBbox = turf.bbox(pointsFeatures);
    const coneBbox = roundTripPolygon ? turf.bbox(roundTripPolygon) : null;
    return combineBBox(pointsBbox, coneBbox);
  }, [props.finish, props.start, roundTripPolygon]);

  const mapRef = useRef<MapRef | null>(null);
  useEffect(() => {
    if (mapRef.current && bbox) {
      mapRef.current.fitBounds(updateBBox(bbox));
    }
  }, [bbox]);

  return (
    <MapLibre
      ref={(map) => {
        mapRef.current = map;
        if (map && props.mapRef) {
          props.mapRef(map);
        }
      }}
      mapLib={maplibre}
      initialViewState={
        bbox
          ? {
              bounds: updateBBox(bbox),
            }
          : {
              longitude: props.initialCoords[1],
              latitude: props.initialCoords[0],
              zoom: 4,
            }
      }
      mapStyle={getMapStyle(props.colorScheme)}
      interactive={false}
      attributionControl={false}
    >
      {props.start && (
        <GeoMapMarker lat={props.start.lat} lon={props.start.lon}>
          {props.start.icon}
        </GeoMapMarker>
      )}
      {props.finish && (
        <GeoMapMarker lat={props.finish.lat} lon={props.finish.lon}>
          {props.finish.icon}
        </GeoMapMarker>
      )}
      {rountdTripLayer}
    </MapLibre>
  );
}
