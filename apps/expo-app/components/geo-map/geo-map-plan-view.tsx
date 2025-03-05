import * as turf from "@turf/turf";
import { type MapRef } from "@vis.gl/react-maplibre";
import { Map as MapLibre } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { CirclePauseIcon, CirclePlayIcon, RotateCw } from "lucide-react-native";
import maplibre from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";

import { cn } from "~/lib/utils";

import GeoMapMarker from "./geo-map-marker";
import { type Coords } from "./types";
import { combineBBox, useRoundTripPolygon } from "./util";

type GeoMapPlanView = {
  start: Coords | null;
  finish: Coords | null;
  bearing: number | null;
  distance: number;
  className?: string;
};

export function GeoMapPlanView(props: GeoMapPlanView) {
  const { roundTripPolygon, rountdTripLayer } = useRoundTripPolygon(
    props.bearing !== null,
    props.start,
    props.bearing ?? undefined,
    props.distance / 1000,
  );

  const bbox = useMemo(() => {
    const points = (
      props.start ? [[props.start.lon, props.start.lat]] : []
    ).concat(props.finish ? [[props.finish.lon, props.finish.lat]] : []);
    if (!points.length) {
      return null;
    }

    if (points.length === 1) {
      points.push([points[0][0] - 0.1, points[0][1] - 0.1]);
      points.push([points[0][0] + 0.1, points[0][1] + 0.1]);
    }
    const pointsFeatures = turf.points(points);
    const pointsBbox = turf.bbox(pointsFeatures);
    const coneBbox = roundTripPolygon ? turf.bbox(roundTripPolygon) : null;
    return combineBBox(pointsBbox, coneBbox);
  }, [props.finish, props.start, roundTripPolygon]);

  const mapRef = useRef<MapRef>(null);
  useEffect(() => {
    if (mapRef.current && bbox) {
      mapRef.current.fitBounds(bbox);
    }
  }, [bbox]);

  console.log({ rountdTripLayer, roundTripPolygon });

  return (
    <View className={cn("size-full", props.className)}>
      <MapLibre
        ref={mapRef}
        mapLib={maplibre}
        initialViewState={
          bbox
            ? {
                bounds: bbox,
              }
            : {
                longitude: 24.853,
                latitude: 57.153,
                zoom: 4,
              }
        }
        mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
        interactive={false}
        attributionControl={false}
      >
        {props.start && (
          <GeoMapMarker lat={props.start.lat} lon={props.start.lon}>
            <CirclePlayIcon className="size-8 text-green-500" />
          </GeoMapMarker>
        )}
        {props.finish && (
          <GeoMapMarker lat={props.finish.lat} lon={props.finish.lon}>
            <CirclePauseIcon className="size-8 text-red-500" />
          </GeoMapMarker>
        )}
        {rountdTripLayer}
      </MapLibre>
    </View>
  );
}
