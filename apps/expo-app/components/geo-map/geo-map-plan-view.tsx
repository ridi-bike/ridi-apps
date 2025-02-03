import * as turf from "@turf/turf";
import { Map as MapLibre } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { CirclePauseIcon, CirclePlayIcon } from "lucide-react-native";
import maplibre from "maplibre-gl";
import { useMemo } from "react";
import { View } from "react-native";

import { cn } from "~/lib/utils";

import GeoMapMarker from "./geo-map-marker";
import { type Coords } from "./types";
import { useRoundTripPolygon } from "./util";

type GeoMapPlanView = {
  start: Coords;
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
    props.distance,
  );
  const bbox = useMemo(() => {
    const pointsFeatures = turf.points(
      [[props.start.lon, props.start.lat]].concat(
        props.finish ? [[props.finish.lon, props.finish.lat]] : [],
      ),
    );
    const pointsBbox = turf.bbox(pointsFeatures);
    const coneBbox = roundTripPolygon ? turf.bbox(roundTripPolygon) : null;
    const combinedBbox = coneBbox
      ? [
          Math.min(pointsBbox[0], coneBbox[0]), // minX
          Math.min(pointsBbox[1], coneBbox[1]), // minY
          Math.max(pointsBbox[2], coneBbox[2]), // maxX
          Math.max(pointsBbox[3], coneBbox[3]), // maxY
        ]
      : pointsBbox;
    return [
      combinedBbox[0] - Math.abs(combinedBbox[0] - combinedBbox[2]) / 10,
      combinedBbox[1] - Math.abs(combinedBbox[1] - combinedBbox[3]) / 10,
      combinedBbox[2] + Math.abs(combinedBbox[0] - combinedBbox[2]) / 10,
      combinedBbox[3] + Math.abs(combinedBbox[1] - combinedBbox[3]) / 10,
    ] as [number, number, number, number];
  }, [props.finish, props.start.lat, props.start.lon, roundTripPolygon]);

  return (
    <View className={cn("size-full", props.className)}>
      <MapLibre
        mapLib={maplibre}
        initialViewState={{
          bounds: [
            bbox[0] - 0.03,
            bbox[1] - 0.03,
            bbox[2] + 0.03,
            bbox[3] + 0.03,
          ],
        }}
        mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
        interactive={false}
        attributionControl={false}
      >
        <GeoMapMarker lat={props.start.lat} lon={props.start.lon}>
          <CirclePlayIcon className="size-8 text-green-500" />
        </GeoMapMarker>
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
